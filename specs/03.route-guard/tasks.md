# 03.route-guard — 任务列表

> 4 个任务；单 task ≤ 30min；总任务数严格落在 [4,8]。

---

### T-001 — middleware.ts：JWT 校验 + 路径重定向（15min）

**层**：next.js middleware
**预估**：15min
**关联需求**：F-001, F-002, NFR-002, NFR-003
**AC**：AC-001, AC-002, AC-003, AC-004, AC-008

实现根目录 `middleware.ts`（设计稿见 design.md）：
- `PROTECTED = ['/profile']`、`AUTH_ONLY = ['/auth']`
- 用 `jose` 库做 HS256 校验
- matcher 排除 `_next/static`、`_next/image`、`favicon.ico`、`/api/rpc`

新增依赖：`npm i jose`

**验收**：
- 未登录访问 `/profile` → 307 → `/auth?next=%2Fprofile`
- 已登录访问 `/auth` → 307 → `/profile`
- 访问 `/` → 200 直出
- 伪造 JWT → 307 → `/auth?next=/profile`

---

### T-002 — auth.logout procedure 注入清 cookie Set-Cookie 头（5min）

**层**：next.js bff
**预估**：5min
**关联需求**：F-003, F-004
**AC**：AC-007

更新 `lib/orpc/router.ts` 中 `auth.logout` handler：调用 `setHeaders` 注入
```
Set-Cookie: ns_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0
```

**验收**：
- 调用 `orpcClient.auth.logout({})` 后浏览器 cookie 被清
- `npm run typecheck` 通过

---

### T-003 — ProfileNav 登出按钮接线 + /auth 读 next 参数（15min）

**层**：next.js 前端
**预估**：15min
**关联需求**：F-003
**AC**：AC-007

- `components/profile/ProfileNav.tsx`：登出按钮 onClick 改为 `await orpcClient.auth.logout({}); router.push('/auth')`
- `app/auth/page.tsx`：登录/注册成功后跳转逻辑读 `searchParams.get('next')`，默认 `/profile`；客户端组件用 `useSearchParams`

**验收**：
- 浏览器手测：登出 → 跳 /auth → cookie 被清 → 访问 /profile 自动跳回 /auth

---

### T-004 — 端到端验证 + 静态资源 / RPC 不被拦截（5min）

**层**：next.js 全局
**预估**：5min
**关联需求**：F-005, NFR-001
**AC**：AC-005, AC-006

手测 / Network 面板观察：
- 加载 `/profile` 时 `_next/static/chunks/*.js` 等静态资源直接 200（无 307）
- 加载 `/` 时 `/api/rpc/system_health` 直接 200（无 307）
- 加载 `/profile` 时首次 SSR 包含 cookie 校验后通过（200），不存在「先 307 再 200」的多余跳转

**验收**：
- 浏览器 Network 看到静态资源与 RPC 直出
- 4 个核心 AC 全过（重定向方向正确）

---

## 依赖关系（feature 内）

T-001 → T-002 → T-003 → T-004

## 跨 feature 引用

- 依赖：`1.F-007`（cookie + JWT secret）、`1.F-003`（Go logout endpoint）、`1.F-005`（oRPC `auth.logout` procedure）
- 与 `02.profile-page` 关系：02 的 `app/profile/page.tsx` 仍保留 `redirect('/auth?next=/profile')` 作为兜底；middleware 是前置拦截，二者并存不冲突