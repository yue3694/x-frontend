# Neural Synthesis

A runnable full-stack foundation: Next.js 16 SSR frontend + oRPC BFF + Go HTTP API + PostgreSQL. The project was bootstrapped with one landing page and a `/healthz` Go endpoint; this repo extends it with **email/password auth**, a **protected profile page**, and a **middleware route guard**.

## 架构

```
[Browser] ──HTTP──▶ [Next.js App Router (RSC + oRPC handler)]
                              │
                              ├─▶ lib/go-api.ts (lib proxy)
                              │
                              └─▶ Go API :8080
                                        │
                                        ├─▶ /healthz
                                        ├─▶ /auth/{register,login,logout,me}
                                        └─▶ /profile  (auth-required)

[Browser] ──proxy.ts──▶ 校验 ns_session JWT (jose / HS256)
                       │ 已登录访问 /auth → 307 /profile
                       └─ 未登录访问 /profile → 307 /auth?next=<path>
```

## 技术栈

- **前端**：Next.js 16.2 (App Router) · React 19 · TypeScript 6 · Tailwind 3 · `next/font` (Inter + JetBrains Mono) · Material Symbols (CDN)
- **BFF**：oRPC 1.14 (server + client) · Zod 4 · `jose` 6 (Edge JWT)
- **后端**：Go 1.25 · 标准库 `net/http` · `pgx/v5` + `pgxpool` · `golang-jwt/jwt/v5` · `golang.org/x/crypto/bcrypt`
- **数据库**：PostgreSQL 18（本地 `/tmp/.s.PGSQL.5432` socket + `localhost:5432` TCP，db=`postgres`）
- **可视**：Three.js 0.185 + 原生 WebGL fragment shader（`next/dynamic({ ssr: false })` 懒加载）
- **样式**：`app/styles.css`（CSS 变量）+ Tailwind（`bg-primary` 等 token 对齐 DESIGN.md）

## 常用命令

```bash
# 后端
cd backend && go run ./cmd/api              # 启动 :8080，连接 PG，自动执行 migration

# 前端
npm install
npm run dev                                  # 开发
npm run build && PORT=3001 npm start         # 生产

# 验证
npm run typecheck                            # tsc --noEmit
npm run lint
npm run build
docker compose up --build                    # 一键起两服务
```

环境变量见 `.env.example`：`GO_API_URL`、`AUTH_JWT_SECRET`、`DATABASE_URL`。

## 目录结构

```
x-frontend/
├── app/                       # Next.js App Router
│   ├── layout.tsx              # 全局字体 + Material Symbols
│   ├── page.tsx                # 落地页（SSR 直读 /healthz）
│   ├── styles.css              # Tailwind + Neural Synthesis CSS 变量
│   ├── auth/page.tsx           # 登录/注册（双面板 toggle）
│   ├── profile/page.tsx        # 受保护的简介页（SSR 首屏）
│   └── api/rpc/[...rest]/route.ts  # oRPC handler
├── components/profile/         # 简介页子组件（IdentityCore 等）
├── lib/
│   ├── go-api.ts               # BFF → Go 的 fetch 封装
│   ├── orpc/router.ts          # oRPC procedures（auth + profile + system）
│   ├── orpc/client.ts          # 浏览器 RPCLink
│   └── auth-cookies.ts         # Set-Cookie leaky channel
├── proxy.ts                    # Next.js 16 路由保护（jose 校验 JWT）
├── backend/
│   ├── cmd/api/main.go         # 启动入口
│   └── internal/
│       ├── db/                 # pgxpool 封装
│       ├── auth/               # store / password / jwt / handler / schema
│       └── profile/            # fixtures + handler
├── docs/                       # 设计稿（Stitch 导出：login & register / intro）
└── specs/                      # 开发规格（work-prd 生成）
    ├── PLAN.md
    ├── 01.auth-foundation/
    ├── 02.profile-page/
    └── 03.route-guard/
```

## 规则

- `@rules/coding-style.md` — 代码风格（项目实际：TypeScript strict + ESLint next + Go 标准库）
- `@rules/testing.md` — 测试规范（当前无测试，后续补充）
- `@rules/security.md` — 安全（JWT / bcrypt / cookie / 输入校验 / PG 错误屏蔽）
- `@rules/git-workflow.md` — Git 流程
- `@rules/frontend.md` — Next.js / RSC / Tailwind / 客户端边界
- `@rules/backend-api.md` — Go HTTP / pgx / 中间件
- `@rules/database.md` — PostgreSQL schema / 迁移 / 查询

## 已知设计决策

1. session = HTTP-only cookie + JWT (HS256)；Go 端无状态校验
2. 数据 = PostgreSQL（`sync.Map` 决策已升级为持久化）
3. Tailwind 与 DESIGN.md 的 CSS 变量共存（`bg-primary` 等）
4. Three.js / WebGL = `next/dynamic({ ssr: false })`，不影响 LCP
5. 简介页 demo profile = Go 端硬编码 fixtures（`backend/internal/profile/fixtures.go`）
6. oRPC body 格式：`{"json": <input>, "meta": [...]}`（StandardRPC 协议）；路由前缀 `/api/rpc`，procedure 路径用 `/` 分隔（`auth.login` → `/api/rpc/auth/login`）