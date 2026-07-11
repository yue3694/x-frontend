# 02.profile-page — 需求规格

## 概述

实现 Neural Synthesis 项目的个人简介页（受保护）。该页面在用户登录后展示「陈傲 (Alex Chen)」的个人档案：身份核心 / 技能矩阵 / 精选项目 / 系统日志四个 snap-section；背景含 WebGL shader canvas，头像旁含 Three.js 神经核动效。数据来源：当前用户从 `auth.me` 取，附加 profile 数据从 Go `GET /profile` 取（基于 user.id）。

## 项目信息

- 项目：neural-synthesis
- 架构：separated（Next.js 前端 + Go 后端）
- 设计稿来源：`docs/intro/code.html`

## 需求版本表

| 版本 | 日期 | 状态 |
| --- | --- | --- |
| v1 | 2026-07-12 | 初始版本 |

## 用户故事

- **US-01**：作为登录用户，我希望访问 `/profile` 时直接看到自己的档案首屏（SSR），不用等 JS hydrate。
- **US-02**：作为访客，我希望访问 `/profile` 时被重定向到 `/auth?next=/profile`，登录后自动跳回。
- **US-03**：作为用户，我希望看到 4 个 section：身份核心（头像 + 基础信息 + 系统指标 + 联系按钮）、技能矩阵（3 张卡：AI Core / Full-Stack / Product）、精选项目（3 张卡）、系统日志（终端风格 timeline）。
- **US-04**：作为用户，我希望导航栏能点击锚点跳到对应 section。
- **US-05**：作为用户，我希望右侧的进度指示器高亮当前 section。

## 功能需求

- **F-001**：Go 端 `GET /profile` — 读 cookie 中的 session token，返 `{user, profile}`（`profile` 含 skills / projects / timeline / metrics / headline 等）；未登录 401。
- **F-002**：Next.js `/profile` 路由（`app/profile/page.tsx`）— 服务端组件；先通过 `lib/go-api.ts` 的 `getMe(cookieHeader)` 拿 user，未登录 → `redirect('/auth?next=/profile')`；登录则通过 `getProfile(cookieHeader)` 拿 profile；首屏直出。
- **F-003**：前端 4 个 section 组件（`components/profile/{IdentityCore,SkillMatrix,FeaturedProjects,SystemLogs}.tsx`），严格按 Stitch 设计稿移植 HTML + CSS（玻璃面板、scan-line 动画、彩色渐变进度条）。
- **F-004**：固定导航栏 `components/profile/ProfileNav.tsx` — 锚点链接 + 当前登录用户邮箱；登录状态由后端注入的 user 决定。
- **F-005**：右侧 scroll-progress 指示器 `components/profile/ScrollProgress.tsx` — IntersectionObserver 同步高亮。
- **F-006**：背景 WebGL shader canvas（`components/profile/WebGLBackground.tsx`）— 客户端组件 + `next/dynamic` 懒加载；移植 Stitch 的 fragment shader（grid lines + digital rain + mouse glow）。
- **F-007**：头像旁 Three.js 神经核（`components/profile/NeuralHub.tsx`）— 客户端组件 + 懒加载；用 `three`（新增依赖）做 icosahedron + 漂浮粒子 + 鼠标跟随；`ssr: false`。
- **F-008**：scroll-snap 容器 + smooth scroll 行为。

## 非功能需求

- **NFR-001 性能**：首屏（不含 Three.js / WebGL）LCP < 2s on 3G；Three.js / WebGL 不阻塞首屏（懒加载 + 占位）。
- **NFR-002 兼容性**：Three.js 在浏览器不支持 WebGL 时降级为静态图标（占位元素，不崩溃）。
- **NFR-003 可维护**：设计稿中的字体（JetBrains Mono / Inter / Material Symbols）通过 `next/font` 加载（已有 Inter / JetBrains Mono；新增 Material Symbols）。
- **NFR-004 安全**：`GET /profile` 鉴权后才返回数据；返回字段不包含密码哈希 / JWT 等敏感字段。
- **NFR-005 SSR**：整页 SSR 直出，只有交互组件（WebGL / Three.js / scroll observer）标 `'use client'`。

## 验收标准

- **AC-001**：`/profile` 在已登录状态下首屏直出（curl 返回 HTML 含用户名/标题）。
- **AC-002**：`/profile` 在未登录状态下返回 307 重定向到 `/auth?next=/profile`。
- **AC-003**：4 个 section 的内容、布局、颜色、玻璃效果与设计稿视觉一致（手测）。
- **AC-004**：Three.js 神经核动效运行（旋转 + 鼠标跟随 + 脉冲），不影响首屏渲染。
- **AC-005**：WebGL 背景运行（grid + 数字雨 + 鼠标光晕），不影响首屏渲染。
- **AC-006**：导航点击锚点平滑滚动到对应 section。
- **AC-007**：滚动到 section 时右侧 progress 指示器对应点亮。
- **AC-008**：刷新页面仍在登录态（cookie 有效期内），无需重新登录。
- **AC-009**：`GET /profile` 未带 cookie 返回 401。
- **AC-010**：`GET /profile` 带有效 cookie 返回完整 profile payload。

## 依赖

- 外部库：`three`（新增）
- 项目内：1.F-001（auth API）、`docs/intro/code.html`（设计稿来源）、DESIGN.md（配色/字体 token）

## 开放问题

- 无（已在 PLAN.md 全局决策中给出默认值：客户端组件 + 懒加载 + 硬编码 Go fixtures）