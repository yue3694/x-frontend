---
description: 后端规范（Go HTTP / pgx / 中间件 / 错误码 / 用户数据脱敏）
globs: 'backend/**/*.go'
---

# Backend API (Go)

## 项目结构

```
backend/
├── cmd/api/main.go            # 启动入口 + 装配
└── internal/
    ├── db/                    # pgxpool 封装
    ├── auth/                  # 认证域（store / password / jwt / handler）
    └── profile/               # 业务域（fixtures / handler）
```

新域：新建 `internal/<domain>/` 子包；handler / store / types 分文件。

## HTTP 路由

- 用 `mux.HandleFunc("POST /path", ...)` 形式（Go 1.22+ method-prefix routing）
- 需要 cookie 的 endpoint 用 `auth.AuthMiddleware(store, innerMux)` 包装
- handler 依赖（store / fixtures / jwtIssuer）通过闭包注入，便于测试替换

## 数据库

- 用 `pgx/v5` + `pgxpool`；**不要**用 `database/sql`
- 表 schema 用 `//go:embed schema.sql` + 启动时 `pool.Exec(ctx, schemaSQL)`（`CREATE TABLE IF NOT EXISTS`）
- 唯一约束冲突 `pgconn.PgError.Code == "23505"` → 转 `ErrEmailTaken` 等业务错误
- context 一律带 `r.Context()`；`signal: AbortSignal.timeout()` 配合 BFF 调用

## 错误响应

统一 JSON：
```json
{"error": "<machine_code>", "message": "<human readable>"}
```

错误码集中在 handler 顶部；不暴露 SQL / 堆栈。

## 用户数据脱敏

- `User` 结构体的 `PasswordHash []byte` 加 `json:"-"`（全包级生效）
- 响应路径必须经 `publicUser()` 包装，避免直接 `writeJSON(w, 200, u)`
- log 中禁止打印 cookie / Authorization 头 / 密码字段

## JWT

- HS256；payload：`{sub, email, name, iat, exp}`
- `AUTH_JWT_SECRET` 环境变量；缺失时打 WARN 并用 dev 默认值
- 校验：`jwt.WithValidMethods([]string{"HS256"})` 白名单，拒绝 `alg: none`

## 启动

启动时：
1. `db.New(ctx)` 连接 PG
2. `pool.Exec(ctx, auth.Schema())` 跑 migration
3. `slog.Info(...)` 报告状态
4. `server.ListenAndServe()` + signal.NotifyContext 优雅关闭

## 依赖

- `golang-jwt/jwt/v5`
- `golang.org/x/crypto/bcrypt`
- `github.com/jackc/pgx/v5` + `pgxpool`

新增依赖前先看是否已有等价物，避免重复造轮子。