# Neural Synthesis — Specs 规划索引

> 生成日期：2026-07-12
> 项目：neural-synthesis（Next.js 16 + React 19 + oRPC BFF + Go HTTP API）
> 来源：`docs/login and register/`（登录 + 注册单页）+ `docs/intro/`（个人简介页）

## 切分表

| 序号 | Feature 名 | 一句话说明 | 依赖 | 任务数 | 状态 |
| --- | --- | --- | --- | --- | --- |
| 1 | `auth-foundation` | 后端 auth API + oRPC procedures + 登录/注册前端页面（含 Zod 校验） | — | 6 | 待开发 |
| 2 | `profile-page` | 受保护的 `/profile` 路由 + 服务端首屏读 Go profile API + 4-section 简介页 UI（Three.js / WebGL lazy-load） | 01 | 7 | 待开发 |
| 3 | `route-guard` | Next.js middleware 校验 session、未登录重定向 `/auth?next=`、登出流程 | 01 | 4 | 待开发 |

## 推荐执行顺序

1. `01.auth-foundation`（无前置）
2. `02.profile-page`（依赖 01）
3. `03.route-guard`（依赖 01；与 02 可并行开发，最后合并时统一接 middleware）

## ID 编号约定

- 任务：`T-NNN`（feature 内连续）
- 功能需求：`F-NNN`
- 验收标准：`AC-NNN`
- 跨 feature 引用：`` `{N}.T-NNN` `` / `` `{N}.F-NNN` `` / `` `{N}.AC-NNN` ``

## Feature 目录

- `specs/01.auth-foundation/` — 后端 + 前端登录/注册
- `specs/02.profile-page/` — 个人简介页（受保护）
- `specs/03.route-guard/` — 路由保护 + 登出

## 状态

- [ ] 01 — 待开发
- [ ] 02 — 待开发
- [ ] 03 — 待开发

## 全局技术决策（影响所有 feature）

1. **session 存储**：HTTP-only cookie + JWT（HS256，密钥来自 `.env.local` 中的 `AUTH_JWT_SECRET`），Go 端无状态校验。
2. **数据存储**：当前阶段用 Go 进程内 `sync.Map`（demo 性质），预留 `UserStore` 接口以便后续替换 SQLite/PostgreSQL。
3. **样式方案**：Next.js 项目内启用 Tailwind（与现有 `app/styles.css` 的 CSS 变量共存），使用 DESIGN.md 中的 token 配色（`bg-primary` `#adc6ff` 等）。
4. **Three.js / WebGL**：客户端组件 + `next/dynamic` 懒加载 + `ssr: false`，避免影响首屏 LCP；服务端不渲染这层视觉。
5. **个人数据源**：硬编码在 Go 端 `internal/profile/fixtures.go`（来自 stitch 设计稿），后续可拆 JSON 配置文件或数据库。
6. **路由**：`/auth`（登录+注册同 URL，双面板 toggle）+ `/profile`（受保护）+ `/`（现有落地页，不变）。

## 开放问题

- **无阻塞性歧义**（已在全局技术决策中给出 LLM 自行决断的默认值；后续若用户反对可走 `/work-prd-change`）