# 01.auth-foundation — 设计规格

## 设计版本表

| 版本 | 日期 | 状态 |
| --- | --- | --- |
| v1 | 2026-07-12 | 初始版本 |

## 项目架构（feature 视角）

```
[Browser /auth] ──ORPC──▶ [Next.js BFF /api/rpc/*] ──HTTP──▶ [Go API /auth/*]
                                                       │
                                                       └─▶ UserStore (sync.Map)
```

## 功能模块设计

### Go 端

#### `backend/internal/auth/handler.go`
- 四个 handler：`Register`、`Login`、`Logout`、`Me`
- 依赖 `UserStore` 接口 + `JWTIssuer` 接口（便于后续替换实现）
- 统一 JSON 错误响应 `{error: <code>, message: <human>}`

#### `backend/internal/auth/jwt.go`
- `IssueToken(user) (tokenString string, err error)` — HS256 签名
- `ParseToken(tokenString) (claims, error)` — 验证签名 + exp
- payload: `{sub: user.id, email, name, exp, iat}`

#### `backend/internal/auth/store.go`
```go
type User struct {
  ID           string
  Name         string
  Email        string
  PasswordHash []byte
  CreatedAt    time.Time
}

type UserStore interface {
  Create(ctx context.Context, u User) error
  FindByEmail(ctx context.Context, email string) (User, error)
  FindByID(ctx context.Context, id string) (User, error)
}

type PostgresUserStore struct {
  pool *pgxpool.Pool
}
```
- 通过 `pgx/v5` + `pgxpool` 连接 PostgreSQL
- 启动时自动执行 migration（创建 `users` 表）
- 邮箱唯一索引在 DB 层约束
- ID 使用 `crypto/rand` 生成 16 字节 hex

#### `backend/internal/auth/schema.sql`（启动时自动执行）
```sql
CREATE TABLE IF NOT EXISTS users (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash BYTEA NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));
```

#### `backend/cmd/api/main.go` 改造
- 从 `DATABASE_URL` 读连接串，默认 `postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable`
- 用 `pgxpool.New` 初始化连接池，启动时执行 `schema.sql`
- 初始化 `PostgresUserStore`
- 挂载路由：
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/logout`
  - `GET  /auth/me`
  - `GET  /profile`（feature 02 使用）
- 中间件：读 cookie `ns_session` → 注入 context；非必要 endpoint 容忍无 cookie（`/auth/me` 自行 401）

### Next.js BFF

#### `lib/go-api.ts` 扩展
```ts
export type SessionUser = { id: string; name: string; email: string }
export type AuthResponse = { token: string; user: SessionUser }

export async function postRegister(input: { name: string; email: string; password: string }): Promise<AuthResponse>
export async function postLogin(input: { email: string; password: string }): Promise<AuthResponse>
export async function getMe(cookieHeader?: string): Promise<SessionUser | null>
```
- 全部走 `process.env.GO_API_URL`；`getMe` 接受 cookieHeader 让 RSC 可在服务端读取 session

#### `lib/orpc/router.ts` 扩展
```ts
auth: {
  register: os
    .input(z.object({
      name: z.string().min(1).max(80),
      email: z.string().email().max(120).transform(s => s.toLowerCase()),
      password: z.string().min(8).max(120),
    }))
    .output(z.object({ token: z.string(), user: z.object({ id: z.string(), name: z.string(), email: z.string() }) }))
    .handler(async ({ input }) => postRegister(input)),
  login: os
    .input(z.object({
      email: z.string().email().transform(s => s.toLowerCase()),
      password: z.string().min(1),
    }))
    .output(z.object({ token: z.string(), user: z.object({ id: z.string(), name: z.string(), email: z.string() }) }))
    .handler(async ({ input }) => postLogin(input)),
  logout: os
    .input(z.object({}).optional())
    .output(z.object({ ok: z.literal(true) }))
    .handler(async () => postLogout()),
  me: os
    .input(z.object({}).optional())
    .output(z.object({ id: z.string(), name: z.string(), email: z.string() }).nullable())
    .handler(async () => getMeFromContext()),
}
```

### 前端

#### `app/auth/page.tsx`
- 客户端组件（`'use client'`）；状态机：`mode: 'login' | 'signup'`
- 表单：
  - login: email + password
  - signup: name + email + password + confirm password
- 提交时调 `orpcClient.auth.login / auth.register`
- 成功后 `router.push('/profile')`
- 错误条统一展示 `e.message`（来自 oRPC error）

#### `app/auth/auth.module.css`（或共用于 `app/styles.css`）
- 玻璃面板 `.glass-panel`、`.input-underline`、`.glow-button` —— 直接移植 Stitch 设计稿 CSS

## 接口契约

### POST /auth/register
请求：
```json
{"name": "Alex Chen", "email": "alex@X-FRONTEND.ai", "password": "SuperSecret123"}
```
成功 201：
```json
{"token": "<jwt>", "user": {"id": "u_abc", "name": "Alex Chen", "email": "alex@X-FRONTEND.ai"}}
```
- Set-Cookie：`ns_session=<jwt>; HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`
失败：
- 409 `{"error": "email_taken", "message": "..."}`
- 400 `{"error": "invalid_input", "message": "..."}`

### POST /auth/login
请求：`{"email", "password"}` — 成功 200 + Set-Cookie，失败 401 `{"error": "invalid_credentials", "message": "..."}`

### POST /auth/logout
- 总是返回 `{"ok": true}`；Set-Cookie 清空 `ns_session=; Max-Age=0`

### GET /auth/me
- 成功 200：`{"id", "name", "email"}`
- 失败 401：`{"error": "unauthenticated", "message": "..."}`

## 数据模型

### User
| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | string | 16-byte hex |
| name | string | 1-80 chars |
| email | string | 唯一，小写存储 |
| passwordHash | []byte | bcrypt cost=10 |
| createdAt | time.Time | UTC |

### JWT Claims
```json
{"sub": "u_abc", "email": "...", "name": "...", "iat": 1700000000, "exp": 1700086400}
```

## 安全考虑

1. 密码 bcrypt（cost=10），不存明文
2. JWT 密钥从环境变量读，dev 环境用默认值 + warning
3. cookie HttpOnly + SameSite=Lax 防 CSRF（demo 阶段不引入完整 CSRF token）
4. 错误信息不区分「用户不存在」与「密码错误」
5. email 转小写 + 唯一索引防大小写绕过
6. 限流不在本 feature 范围（demo），但 Go 端 handler 留出可注入点

## 技术决策

- **TD-1**：JWT vs 服务器 session —— 选 JWT（无状态；Go 进程水平扩展友好）
- **TD-2**：PostgreSQL vs SQLite vs 进程内 —— 选 PostgreSQL（用户指定，本地已安装 `/tmp/.s.PGSQL.5432`；数据持久化）
- **TD-3**：前端 form library —— 不引入 react-hook-form，直接受控 state（feature 规模小）
- **TD-4**：样式方案 —— 共用现有 `app/styles.css` 的 CSS 变量；新增的 glass-panel 类直接追加到该文件
- **TD-5**：DB driver —— 选 `pgx/v5` + `pgxpool`（Go 生态首选；性能优于 lib/pq）

## 错误码表

| HTTP | code | 触发 |
| --- | --- | --- |
| 200 | — | 登录/me 成功 |
| 201 | — | 注册成功 |
| 400 | invalid_input | Zod 校验失败 |
| 401 | invalid_credentials | 登录错误 |
| 401 | unauthenticated | me 缺/坏 cookie |
| 409 | email_taken | 注册邮箱已存在 |
| 500 | internal_error | 其他异常 |