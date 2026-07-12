# 01.auth-foundation — 任务列表

> 6 个任务，按「层 × 功能」切片；单 task ≤ 30min；总任务数严格落在 [4,8]。

## 任务编号约定
- T-NNN：feature 内连续
- 预估列：`5min` / `15min` / `30min`

---

### T-000 — PostgreSQL 连接 + schema migration（5min）

**层**：backend
**预估**：15min
**关联需求**：F-001（依赖 DB 持久化）
**AC**：AC-001（前置）

实现：
- 新增 `backend/internal/db/db.go`：用 `pgx/v5` + `pgxpool` 创建连接池；从环境变量 `DATABASE_URL` 读，默认 `postgres://postgres:postgres@localhost:5432/neural_synthesis?sslmode=disable`
- `backend/internal/auth/schema.sql`：建表 SQL（见 design.md）
- 启动时调用 `pool.Exec(ctx, schemaSQL)` 自动执行 migration

新增依赖：`go get github.com/jackc/pgx/v5`

**验收**：
- `go build ./...` 通过
- 启动时日志显示 `connected to postgres` + `users table ready`
- 重复启动不会因已存在的表报错（IF NOT EXISTS）

---

### T-001 — Go 端 UserStore + bcrypt 工具（15min）

**层**：backend
**预估**：15min
**关联需求**：F-001, F-009
**AC**：AC-001, AC-003

实现 `backend/internal/auth/store.go`：
- `User` 结构体
- `UserStore` 接口
- `PostgresUserStore` 实现（依赖 `*pgxpool.Pool`）
- `HashPassword(plain) ([]byte, error)` / `VerifyPassword(hash, plain) error`（使用 `golang.org/x/crypto/bcrypt` cost=10）

新建 `backend/internal/auth/password.go` 与 `backend/internal/auth/store.go`。
更新 `backend/go.mod`（`go get golang.org/x/crypto/bcrypt github.com/jackc/pgx/v5`）。

**验收**：
- `go build ./...` 通过
- 在 PG 里手动 insert 一行后，`FindByEmail` 能取回；重复 email `Create` 返回 `email_taken` 错误

---

### T-002 — JWT 签发与校验（15min）

**层**：backend
**预估**：30min
**关联需求**：F-007, F-008
**AC**：AC-006

实现 `backend/internal/auth/jwt.go`：
- `Claims` 结构：`sub, email, name, iat, exp`
- `IssueToken(user User) (string, error)` — HS256，从 `AUTH_JWT_SECRET` 读密钥（dev 默认 `dev-secret-change-me`，warn 日志）
- `ParseToken(tokenString) (Claims, error)` — 验证签名 + 过期
- `MaxAge = 24 * time.Hour`

更新 `backend/cmd/api/main.go` 读 `AUTH_JWT_SECRET` 环境变量。

**验收**：
- `go build ./...` 通过
- 手动：token 能 parse 回正确 claims；过期 token 返回 error

---

### T-003 — Go 端四个 auth handler + 路由挂载（30min）

**层**：backend
**预估**：30min
**关联需求**：F-001, F-002, F-003, F-004, NFR-001, NFR-002
**AC**：AC-001, AC-002, AC-003, AC-004, AC-005

实现 `backend/internal/auth/handler.go`：
- `Register` — 校验 Zod-style（Go 端手写校验或用 `go-playground/validator`）；email 小写；冲突 → 409 `email_taken`；成功 → 201 + Set-Cookie
- `Login` — 查 user + 校验密码；失败统一 401 `invalid_credentials`
- `Logout` — 返回 `{ok: true}` + 清 cookie
- `Me` — 读 cookie → parse → 查 user → 返回；失败 401 `unauthenticated`

更新 `backend/cmd/api/main.go`：
```go
mux.HandleFunc("POST /auth/register", auth.Register(store, jwtIssuer))
mux.HandleFunc("POST /auth/login",    auth.Login(store, jwtIssuer))
mux.HandleFunc("POST /auth/logout",   auth.Logout())
mux.HandleFunc("GET  /auth/me",       auth.Me(store))
```

**验收**：
- `curl` 全流程：注册 → 拿 cookie → me 拿回 user → logout → me 401
- 错误邮箱 / 错误密码均返回 401 + `invalid_credentials`

---

### T-004 — Next.js BFF：lib/go-api.ts 扩展 + lib/orpc/router.ts 扩展（15min）

**层**：next.js bff
**预估**：30min
**关联需求**：F-005
**AC**：AC-008

`lib/go-api.ts` 新增：
- `postRegister(input)` / `postLogin(input)` / `getMe(cookieHeader?)`
- `forwardCookies` 工具：把 BFF 收到的 `Cookie` 头转给 Go API

`lib/orpc/router.ts` 新增 `auth: { register, login, logout, me }`，所有 input 用 Zod 校验，output 用 Zod schema 描述。

**验收**：
- `npm run typecheck` 通过
- 浏览器 DevTools Network：`/api/rpc/auth_login` 输入不合法返回 400

---

### T-005 — 前端 `/auth` 页面：双面板 + 表单（30min）

**层**：next.js 前端
**预估**：30min
**关联需求**：F-006, F-007
**AC**：AC-002, AC-007

新建 `app/auth/page.tsx`（客户端组件）：
- 状态机：`mode: 'login' | 'signup'`
- 复用 Stitch 设计稿的玻璃面板布局（直接读 `docs/login and register/code.html` 移植 HTML 结构 + 移植 `app/styles.css` 之外的额外 CSS 到 `app/styles.css`）
- 登录表单：`email + password + 忘记密码链接（占位 href="#")` + 提交按钮
- 注册表单：`name + email + password + confirm password + 提交按钮`
- toggle 函数保留原本 300ms 过渡动画
- 提交时调 `orpcClient.auth.login / auth.register`
- 成功 → `router.push('/profile')`
- 失败 → 顶部错误条

**验收**：
- 浏览器能看到登录 ↔ 注册切换动画
- 注册流程：填合法输入 → 跳 /profile
- 登录流程：错误密码看到「认证失败」（不区分用户/密码）

---

### T-006 — 注册 / 登录成功后 cookie 注入 + 端到端跑通（15min）

**层**：next.js bff + 前端
**预估**：15min
**关联需求**：F-007
**AC**：AC-001, AC-006

需求 03.route-guard 之前的过渡验证：
- BFF 层在调用 Go `postRegister/postLogin` 后，把 Go 返回的 `Set-Cookie` 透传给浏览器响应（用 `Response` headers）
- 前端不需要手动存 token，全靠 cookie

实现要点：当前 `app/api/rpc/[...rest]/route.ts` 用 `RPCHandler` —— 自定义中间件或在 procedure 内显式返回带 headers 的响应；本 feature 阶段先用 procedure 内手动 `set.headers` 注入 cookie（orpc 支持），后续若要统一拦截可在 03 中做。

**验收**：
- DevTools → Application → Cookies 看到 `ns_session` cookie（HttpOnly）
- 关闭浏览器再开 → 仍在登录态（cookie 仍在有效期）

---

## 依赖关系（feature 内）

T-001 → T-002 → T-003 → T-004 → T-005 → T-006

## 跨 feature 引用

- 本 feature 为 02.profile-page 与 03.route-guard 提供前置：
  - `2.F-001 / 2.F-002` 引用 1.F-001 / 1.F-002（auth API）
  - `3.F-001` 引用 1.F-007（cookie 机制）