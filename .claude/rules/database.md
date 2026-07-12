---
description: 数据库规范（PostgreSQL schema / migration / 查询 / 索引）
globs: 'backend/internal/**/*.sql,backend/migrations/**'
---

# Database (PostgreSQL)

## 当前 schema

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

存储位置：Go embed（`backend/internal/auth/schema.sql`），启动时自动执行。

## 命名约定

- 表名：小写 snake_case 复数（`users` / `posts`）
- 主键：`id` TEXT（hex / uuid / cuid）；不用自增 INT
- 时间字段：`created_at` / `updated_at` 类型 `TIMESTAMPTZ`，默认 `NOW()`
- 索引：`<table>_<column>_<modifier>`（`idx_users_email_lower`）

## 新增表流程

1. 在 `backend/internal/<domain>/schema.sql` 写 DDL（`CREATE TABLE IF NOT EXISTS`）
2. 在 Go 端 `//go:embed schema.sql` + 启动时 `pool.Exec`
3. 不要写 down-migration（demo 项目）；生产化时改用 golang-migrate / atlas

## 查询规范

- 用 `pgx/v5` 参数化查询（`$1, $2`）；**不要**字符串拼接
- `pool.QueryRow(ctx, sql, args...)` 单行；`pool.Query(ctx, ...)` 多行
- 错误处理：`errors.Is(err, pgx.ErrNoRows)` 判未找到；`errors.As(err, &pgErr)` + `pgErr.Code` 判约束冲突

## 邮箱比较

- 存小写（`strings.ToLower` 在写入前）；查询也用小写
- 不依赖 MySQL 风格的 `=` 大小写不敏感；PostgreSQL 默认大小写敏感
- 索引 `idx_users_email_lower` 加速 LOWER(email) 查询

## 时区

- DB 存 `TIMESTAMPTZ`（带时区戳）
- Go 端 `time.Now().UTC()` 写入；返回给前端前 `.UTC()`
- 不要用 `timestamp`（不带时区，会被 session timezone 干扰）

## 备份 / 迁移

- 本地 dev 不需要备份（重启即丢）
- 生产化前接入 `pg_dump` 定时备份 + WAL archiving