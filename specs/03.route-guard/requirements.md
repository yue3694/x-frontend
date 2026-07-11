# 03.route-guard — 需求规格

## 概述

为 Neural Synthesis 项目添加路由保护层：Next.js middleware 拦截受保护路由，未登录重定向到 `/auth?next=<原 URL>`；已登录访问 `/auth` 重定向到 `/profile`；简介页 nav 登出按钮调 oRPC `auth.logout` 后清 cookie 并跳 `/auth`。这是 02.profile-page 的前置安全屏障（即便 page.tsx 已 redirect，middleware 提供更早的拦截与更好的 URL 干净度）。

## 项目信息

- 项目：neural-synthesis
- 架构：separated（Next.js 前端 + Go 后端）
- 设计稿来源：无（行为需求，不涉及视觉）

## 需求版本表

| 版本 | 日期 | 状态 |
| --- | --- | --- |
| v1 | 2026-07-12 | 初始版本 |

## 用户故事

- **US-01**：作为未登录访客，我希望直接访问 `/profile` 时被自动重定向到 `/auth?next=/profile`，登录后自动回到 `/profile`。
- **US-02**：作为已登录用户，我希望访问 `/auth` 时被重定向到 `/profile`（避免看到登录页）。
- **US-03**：作为登录用户，我希望点登出按钮能清 cookie 并回到 `/auth`，下次访问 `/profile` 需重新登录。
- **US-04**：作为开发者，我希望 middleware 拦截逻辑在所有静态资源（JS/CSS/字体）请求时不触发（性能）。

## 功能需求

- **F-001**：Next.js `middleware.ts`（根目录）— 拦截 `matcher` 配置的路径，读 cookie `ns_session`，JWT 校验；未通过则 307 到 `/auth?next=<encoded original>`；若已登录访问 `/auth` 则 307 到 `/profile`。
- **F-002**：JWT 校验在 Edge Runtime 中可用（用 `jose` 库，Web Crypto API 兼容），不引入 Node-only 依赖。
- **F-003**：简介页 nav 的登出按钮 onClick 调 oRPC `auth.logout` + 调 `/api/logout` 路由清 cookie + `router.push('/auth')`。
- **F-004**：oRPC `auth.logout` procedure 已在 1.T-003 / 1.T-004 实现，本 feature 仅消费 + 触发清 cookie。
- **F-005**：matcher 排除：`_next/static/*`、`_next/image/*`、`favicon.ico`、`/api/rpc/*`（RPC 自己有 oRPC 错误机制，不应被 middleware 重定向）。

## 非功能需求

- **NFR-001 性能**：middleware 单次执行 < 5ms（在 Edge Runtime）
- **NFR-002 兼容性**：JWT 校验密钥与 Go 端 `AUTH_JWT_SECRET` / BFF 端 `AUTH_JWT_SECRET` 一致；密钥缺失时 middleware fail-open（视为未登录，重定向到 `/auth`）
- **NFR-003 安全**：JWT 仅 HS256 校验，不接受其他算法；过期 / 签名错误一律视为未登录

## 验收标准

- **AC-001**：未登录访问 `/profile` → 307 到 `/auth?next=%2Fprofile`
- **AC-002**：未登录访问 `/profile/anything` → 307 到 `/auth?next=%2Fprofile%2Fanything`
- **AC-003**：登录后访问 `/auth` → 307 到 `/profile`
- **AC-004**：登录态访问 `/profile` → 200 直出
- **AC-005**：登录态访问 `/`（现有 landing）→ 200 直出（不在 matcher 内）
- **AC-006**：访问 `_next/static/*`、`/favicon.ico`、`/api/rpc/*` 等不被 middleware 拦截（网络面板看到请求没经过 redirect）
- **AC-007**：登出按钮点击后 cookie 被清，再次访问 `/profile` 自动重定向到 `/auth?next=/profile`
- **AC-008**：伪造 cookie / 过期 cookie / 错误签名 cookie 均视为未登录，触发重定向

## 依赖

- 外部库：`jose`（新增，Edge-compatible JWT）
- 项目内：1.F-007（cookie 机制 + JWT secret）、2.F-002（page.tsx 已 redirect，middleware 提供前置拦截）

## 开放问题

- 无