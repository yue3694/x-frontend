---
description: 安全规范（JWT / bcrypt / cookie / 输入校验 / 错误码屏蔽 / PII）
globs: '**/*.{ts,tsx,go}'
---

# Security

## 认证 / session

- 密码：bcrypt cost ≥ 10；明文密码绝不入日志
- JWT：HS256（已用 `jose` 校验白名单 `algorithms: ['HS256']`，拒绝 `alg: none`）；payload 含 `sub / email / name / exp / iat`
- `AUTH_JWT_SECRET` ≥ 32 字节随机串；dev 默认 `dev-secret-change-me` 并打 WARN
- Cookie：`HttpOnly; SameSite=Lax; Path=/; Max-Age=86400`；登出清空 `Max-Age=0`

## 输入校验

- 边界处必须校验：oRPC 用 Zod，Go handler 用 `zod-equivalent` 手写校验（name 1-80 / email 校验 / password ≥ 8）
- Zod schema 失败抛 `ORPCError("INPUT_VALIDATION")`；前端 `orpcClient.auth.*` 捕获后展示用户可读 message

## 错误码

- 登录错误统一 `401 invalid_credentials`（不区分「用户不存在」与「密码错误」）
- 邮箱冲突 `409 email_taken`
- 未授权访问 `401 unauthenticated`
- 错误 message 不暴露内部细节（堆栈 / SQL 错误 / 行号）

## 数据脱敏

- `auth.User.PasswordHash` 加 `json:"-"`，**所有**响应路径必须经过 `publicUser()` 包装
- 日志中禁止打印 JWT / cookie / Authorization 头
- 提交前自查：API key / 私钥 / 邮箱 / 手机号 / 身份证（PII）

## 路由保护

- 服务端：`proxy.ts`（Next.js 16）用 `jose` 校验 cookie，未登录 307 到 `/auth?next=<path>`
- 应用层：`app/profile/page.tsx` 也做 `redirect()` 兜底（middleware 失败时不绕过）
- 排除列表：`/api/rpc/*`（oRPC 自有错误机制）、`/_next/*`、`/favicon.ico`

## CORS / CSRF

- 同源 Next.js + BFF，无 CORS 配置；cookie `SameSite=Lax` 防基础 CSRF（demo 阶段）
- 后续接第三方域时再引入完整 CSRF token 方案

## Secret 管理

- `AUTH_JWT_SECRET` / `DATABASE_URL` 走 `.env.local`，**不**入 git
- `.env.example` 仅放占位值