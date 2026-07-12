---
description: 前端规范（Next.js App Router / RSC 边界 / Tailwind / 懒加载）
globs: 'app/**/*.{ts,tsx},components/**/*.tsx,lib/**/*.ts'
---

# Frontend

## RSC 边界

- 默认 server component；只有需要 hooks / DOM / `window` 时才 `"use client"`
- 服务端 fetch 数据：`async function Page()` + `await getMe()` + 直接渲染
- 服务端读 cookie：`const cookieHeader = (await headers()).get('cookie') ?? ''`

## 客户端组件

- 标记 `"use client"` 在文件首行
- 路由保护：`proxy.ts`（Next.js 16）+ 服务端 `redirect()` 双保险
- 表单：受控 state + `useState`；不引 react-hook-form（小表单不划算）
- 客户端导航：`useRouter` from `next/navigation`（不是 `next/router`，那是 pages router）
- `useSearchParams()` 必须包 `<Suspense>`（否则 build 报 "missing suspense boundary"）

## 懒加载

- 任何依赖 `window` / WebGL / Three.js / `<canvas>` 的组件用 `next/dynamic({ ssr: false })`
- 但**只有** client component 才能用 `ssr: false`；server component 里包一层 `"use client"` 组件再 `dynamic`

## Tailwind

- 颜色 / 间距 / 圆角用 DESIGN.md / DESIGN tokens 对应的类（`bg-primary` `#adc6ff` 等）
- 复杂样式：`app/styles.css` 提供类（`.glass-card` / `.scan-line` / `.scroll-container`），组件用 className 引用
- 字体：`next/font/google` 加载 Inter + JetBrains Mono（已在 layout.tsx），避免在 CSS 里再 link

## oRPC 调用

```ts
// 服务端（不经过浏览器）
import { router } from '@/lib/orpc/router';
// 直接调 router.auth.me() — 跳过 HTTP 层

// 客户端
import { orpcClient } from '@/lib/orpc/client';
await orpcClient.auth.login({ email, password });
```

错误：`err.code === 'INPUT_VALIDATION'` → 表单错误；其他 → 顶部错误条。

## Set-Cookie 透传

`lib/go-api.ts` 通过 `lib/auth-cookies.ts` 的 leaky channel 把 Go 返回的 Set-Cookie 暂存，`app/api/rpc/[...rest]/route.ts` 在响应里 `headers.append('set-cookie', ...)`。生产环境应换 `AsyncLocalStorage`。