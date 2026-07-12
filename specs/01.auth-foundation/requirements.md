# 01.auth-foundation — 需求规格

## 概述

实现 X-FRONTEND 项目的认证基座：Go HTTP API 提供注册/登录/登出/me 四个 endpoint；Next.js BFF 用 oRPC 包装这些 endpoint；前端提供 `/auth` 单页（登录 + 注册双面板 toggle，沿用 Stitch 设计稿）。

## 项目信息

- 项目：neural-synthesis
- 架构：separated（Next.js 前端 + Go 后端）
- 框架版本：Next.js 16 / React 19 / oRPC 1.14 / Go 1.24
- 设计稿来源：`docs/login and register/code.html`

## 需求版本表

| 版本 | 日期 | 状态 |
| --- | --- | --- |
| v1 | 2026-07-12 | 初始版本 |

## 用户故事

- **US-01**：作为新访客，我希望能在 `/auth` 注册账号，输入姓名 / 邮箱 / 密码，注册成功后自动登录并跳转 `/profile`。
- **US-02**：作为已注册用户，我希望能在 `/auth` 输入邮箱 + 密码登录，成功后跳转 `/profile`。
- **US-03**：作为已登录用户，我希望刷新页面后无需重新登录（session 保持）。
- **US-04**：作为访客，我希望注册/登录时输入校验错误能在不离开页面的情况下看到反馈。
- **US-05**：作为开发者，我希望认证 API 的请求/响应有 Zod schema 保证类型安全。

## 功能需求

- **F-001**：Go 端 `POST /auth/register` — 输入 `{name, email, password}`，创建用户，返回 `{token, user}`。
- **F-002**：Go 端 `POST /auth/login` — 输入 `{email, password}`，校验后返回 `{token, user}`。
- **F-003**：Go 端 `POST /auth/logout` — 输入 cookie 中的 session token，撤销（demo 阶段可只返回成功）。
- **F-004**：Go 端 `GET /auth/me` — 读 cookie 中的 session token，返回当前用户 `{id, name, email}` 或 401。
- **F-005**：oRPC router 暴露 `auth.register / auth.login / auth.logout / auth.me` procedures，Zod 校验输入；`auth.me` 用于客户端探活。
- **F-006**：前端 `/auth` 页面 — 单 URL 双面板（登录 ↔ 注册 toggle），沿用 Stitch 设计稿的玻璃面板 + WebGL shader 背景；提交时调用 oRPC procedure，成功后 router.push('/profile')。
- **F-007**：session 通过 HTTP-only cookie 传递（`Set-Cookie: ns_session=<jwt>; HttpOnly; Secure; SameSite=Lax; Path=/`）。
- **F-008**：JWT 使用 HS256，payload `{sub, email, exp}`，密钥来自 `process.env.AUTH_JWT_SECRET`（Go 端）和 `AUTH_JWT_SECRET`（Next.js BFF）。
- **F-009**：密码使用 bcrypt（cost=10）哈希存储。

## 非功能需求

- **NFR-001 安全**：密码不在日志中明文输出；错误响应统一为 `{error: "invalid_credentials"}` 之类不泄露用户存在性。
- **NFR-002 安全**：注册时邮箱小写化 + 唯一索引校验；密码长度 ≥ 8。
- **NFR-003 性能**：登录 / 注册 p95 < 200ms（不含 Go 冷启动）。
- **NFR-004 兼容性**：未配置 `AUTH_JWT_SECRET` 时 Go 进程以 `dev-secret-change-me` 默认值启动并打 warning（仅 dev）。
- **NFR-005 可观测**：Go 端结构化日志（`log/slog` JSON 输出）记录 `endpoint, status, duration_ms`。

## 验收标准

- **AC-001**：注册 → 自动 set-cookie + 返回 token + 前端跳转 `/profile` 全链路跑通。
- **AC-002**：登录错误密码返回 401 + 前端展示「认证失败」错误条（不区分用户不存在 / 密码错误）。
- **AC-003**：注册时邮箱已存在返回 409 + 错误码 `email_taken`。
- **AC-004**：访问 `/auth/me` 在未带 cookie 时返回 401。
- **AC-005**：访问 `/auth/me` 带有效 cookie 时返回 `{id, name, email}`。
- **AC-006**：登录成功后 cookie 标志位正确（`HttpOnly`, `SameSite=Lax`, `Path=/`，dev 环境 `Secure` 可关）。
- **AC-007**：前端 `/auth` 页面正确实现 toggle（登录 ↔ 注册）状态、过渡动画、表单校验。
- **AC-008**：oRPC 客户端调用 `auth.register` 时输入不合法会被 Zod 拦截并抛 `ORPCError("INPUT_VALIDATION")`。

## 依赖

- 外部库：`golang-jwt/jwt/v5`、`golang.org/x/crypto/bcrypt`、`github.com/jackc/pgx/v5` + `pgxpool`、`zod`
- 项目内：现有 `lib/go-api.ts`（添加 `postAuth` / `getMe` 等函数）、现有 `lib/orpc/router.ts`（扩展 procedures）

## 开放问题

- 无（已在 PLAN.md 全局决策中给出默认值：HTTP-only cookie + JWT + bcrypt + PostgreSQL via pgx/v5）