# 03.route-guard — 设计规格

## 设计版本表

| 版本 | 日期 | 状态 |
| --- | --- | --- |
| v1 | 2026-07-12 | 初始版本 |

## 项目架构（feature 视角）

```
[Browser /profile]
     │
     ▼
[Next.js middleware.ts (Edge Runtime)]
     │
     ├─ has valid JWT cookie? ──yes──▶ continue
     │
     └─ no ──▶ 307 /auth?next=<encoded>
     
[Browser /auth (logged in)]
     │
     ▼
[middleware] ──has cookie?──yes──▶ 307 /profile

[Browser click logout button on /profile]
     │
     ▼
[POST /api/rpc/auth_logout via oRPC]
     │
     ├─▶ BFF → Go /auth/logout (clears server-side state if any)
     │
     └─▶ BFF clears Set-Cookie ns_session=; Max-Age=0 in response
     
     ▼
[router.push('/auth')]
```

## 功能模块设计

### `middleware.ts`（根目录）

```ts
import { NextResponse, type NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const PROTECTED = ['/profile']
const AUTH_ONLY = ['/auth']
const COOKIE_NAME = 'ns_session'

async function verify(token: string, secret: Uint8Array): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] })
    return !!payload.sub
  } catch {
    return false
  }
}

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname
  const cookie = req.cookies.get(COOKIE_NAME)?.value
  const secret = process.env.AUTH_JWT_SECRET || 'dev-secret-change-me'
  const isAuthed = cookie ? await verify(cookie, new TextEncoder().encode(secret)) : false

  if (PROTECTED.some((p) => path === p || path.startsWith(p + '/'))) {
    if (!isAuthed) {
      const url = req.nextUrl.clone()
      url.pathname = '/auth'
      url.searchParams.set('next', path + req.nextUrl.search)
      return NextResponse.redirect(url)
    }
  }
  if (AUTH_ONLY.includes(path) && isAuthed) {
    const url = req.nextUrl.clone()
    url.pathname = '/profile'
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = {
  matcher: [
    // 排除 _next 静态资源、favicon、/api/rpc
    '/((?!_next/static|_next/image|favicon.ico|api/rpc).*)',
  ],
}
```

关键点：
- 用 `jose` 而非 `jsonwebtoken`（后者依赖 Node crypto，在 Edge Runtime 不可用）
- HS256 严格白名单
- secret 缺失时降级为默认 dev secret + warning（与 Go 端行为一致）

### `lib/orpc/router.ts` 调整

`auth.logout` handler 需要在响应里清 cookie。当前 oRPC 的 procedure handler 可以返回 headers：
```ts
logout: os
  .input(z.object({}).optional())
  .output(z.object({ ok: z.literal(true) }))
  .handler(async ({ input }, { setHeaders }) => {
    setHeaders({
      'Set-Cookie': `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
    })
    return { ok: true }
  }),
```

注意：本 feature 主要是确认 `auth.logout` 在 1.T-003 已经支持 setHeaders；如果 1.T-003 实现时未考虑，需在本 feature 加 1 个 5min 任务做这层 patch。

### `components/profile/ProfileNav.tsx` 调整

替换占位 onClick：
```tsx
'use client'
import { orpcClient } from '@/lib/orpc/client'
import { useRouter } from 'next/navigation'

async function handleLogout() {
  await orpcClient.auth.logout({})
  router.push('/auth')
}
```

### `/auth` 页读 `next` 参数

`app/auth/page.tsx`：登录/注册成功后跳转逻辑改为：
```tsx
const next = searchParams.get('next') || '/profile'
router.push(next)
```

`searchParams` 在 Next.js 16 中可由 page 组件 props 读取（已是 server component），客户端用 `useSearchParams` 读。

## 接口契约

无新增 endpoint。复用：
- 1.F-007 cookie 机制
- 1.F-003 `POST /auth/logout`（Go 端清服务端状态）

新增的 Set-Cookie 头（middleware 与 oRPC procedure 共同使用）：
```
ns_session=<jwt>; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400  (登录/注册)
ns_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0             (登出)
```

## 数据模型

无新增。

## 安全考虑

1. JWT 算法白名单（`algorithms: ['HS256']`），防 `alg: none` 攻击
2. middleware 不抛错（任何异常视为未登录）
3. `next` 参数只接受同源相对路径（开头 `/` 且不含 `//`），防止 open redirect
4. matcher 排除 `/api/rpc/*`，避免 RPC 调用被 307 重定向（RPC 应返回 JSON 错误）

## 技术决策

- **TD-1**：JWT 库 —— 选 `jose`（Edge Runtime 友好，TypeScript 一流）
- **TD-2**：清 cookie 位置 —— 选 BFF `auth.logout` procedure（让前端无需直接操作 cookie，统一走 oRPC）；middleware 本身只读 cookie 不写
- **TD-3**：matcher 配置 —— 选 negative-lookahead 排除静态资源（覆盖未来新增的受保护路由，无需每次手动加白名单）
- **TD-4**：fail-open vs fail-closed —— 选 fail-open（secret 缺失时视为未登录），与 Go 端行为一致；安全等级要求更高时再改为 fail-closed（无 secret 直接 500）