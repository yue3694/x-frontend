# 02.profile-page — 任务列表

> 7 个任务，按「层 × 功能」切片；单 task ≤ 30min；总任务数严格落在 [4,8]。

---

### T-001 — Go 端 ProfileFixtures + GET /profile handler（15min）

**层**：backend
**预估**：30min
**关联需求**：F-001, NFR-004
**AC**：AC-009, AC-010

实现：
- `backend/internal/profile/fixtures.go` — 硬编码 demo profile（数据来自 `docs/intro/code.html` 的文字与图片 URL）
- `backend/internal/profile/handler.go` — `Get(store, fixtures)` 读 cookie 拿 user，未登录 401，返回 `{user, profile}`
- `backend/cmd/api/main.go` 挂载 `mux.HandleFunc("GET /profile", profile.Get(...))`

需求 `auth.UserFromContext` 在 1.T-003 已实现；本任务仅消费。

**验收**：
- `curl -b "ns_session=<jwt>" localhost:8080/profile` → 200 + 完整 payload
- 不带 cookie → 401

---

### T-002 — lib/go-api.ts 扩展 + Zod 校验 profile 类型（15min）

**层**：next.js bff
**预估**：15min
**关联需求**：F-001
**AC**：AC-010

新增：
- `lib/go-api.ts` 中 `ProfileData` 类型与 `getProfile(cookieHeader: string)`
- 响应解析时用 Zod schema 校验（防御 Go 端 schema drift）

**验收**：
- `npm run typecheck` 通过
- Go 返回缺字段时前端拿到解析错误（不崩）

---

### T-003 — 字体加载 + 全局 CSS 合并（glass-card / scan-line 等）（15min）

**层**：next.js 全局
**预估**：15min
**关联需求**：F-003, NFR-003
**AC**：AC-003（基础视觉）

实现：
- `app/layout.tsx` 用 `next/font/google` 加载 Inter + JetBrains Mono + Material Symbols
- `app/styles.css` 追加设计稿中的关键类（`.glass-card`, `.scan-line`, `.pulse-dot`, `.timeline-line`, `.animate-on-scroll`, `.progress-dot`, `.cursor-glow` 等）

**验收**：
- 浏览器 Console 无 CORS / font 加载错误
- 简单 `<div class="glass-card">` 有玻璃效果

---

### T-004 — 4 个 section 组件（IdentityCore / SkillMatrix / FeaturedProjects / SystemLogs）（30min）

**层**：next.js 前端
**预估**：30min
**关联需求**：F-003, F-008
**AC**：AC-003

直接移植 `docs/intro/code.html` 中 4 个 `<section>` 的 HTML 结构到对应组件。
- 数据从 props 取（profile + user）
- IntersectionObserver 触发动画用 `RevealOnScroll` 客户端子组件包装

`components/profile/RevealOnScroll.tsx`：
- 客户端组件，`useEffect` 注册 IntersectionObserver，进入视口加 `.is-visible`

**验收**：
- `/profile` 显示 4 个 section 的文本/布局/颜色
- 滚动时元素入场动画生效

---

### T-005 — ProfileNav + ScrollProgress + ProfileShell（15min）

**层**：next.js 前端
**预估**：15min
**关联需求**：F-004, F-005, F-008
**AC**：AC-006, AC-007

- `ProfileNav`：固定顶部，锚点 + 邮箱显示（来自 user prop）；登出按钮占位（onClick 暂 alert，03 替换）
- `ScrollProgress`：IntersectionObserver 监听 `.snap-section`，toggle `.active` + 点击平滑滚动
- `ProfileShell`：组合 nav + scroll-container + 4 sections + progress 指示器；`scroll-snap-type: y mandatory`

**验收**：
- 点击导航锚点跳转到对应 section
- 滚动到 section 时右侧 progress 指示器对应点高亮

---

### T-006 — WebGLBackground + NeuralHub（Three.js）懒加载（30min）

**层**：next.js 前端
**预估**：30min
**关联需求**：F-006, F-007, NFR-001, NFR-002
**AC**：AC-004, AC-005

- `WebGLBackground.tsx`（客户端）：移植 stitch 的 fragment shader（grid + digital rain + mouse glow）
- `NeuralHub.tsx`（客户端）：用 `three` 实现 icosahedron + 漂浮粒子 + 鼠标跟随 + pulse
- `app/profile/page.tsx` 用 `next/dynamic`：
  ```tsx
  const WebGLBackground = dynamic(() => import('@/components/profile/WebGLBackground'), { ssr: false })
  const NeuralHub = dynamic(() => import('@/components/profile/NeuralHub'), { ssr: false })
  ```
- 新增依赖：`npm i three @types/three`

WebGL 不可用时 NeuralHub 显示灰色占位 div（捕获 `WebGLRenderer` 构造异常）。

**验收**：
- 首屏 LCP 不被 Three.js / WebGL 阻塞（Network 看到 JS chunk 延迟加载）
- 浏览器看到背景 shader 网格 + 鼠标光晕
- 头像旁看到神经核 icosahedron 旋转

---

### T-007 — app/profile/page.tsx 服务端组件 + 端到端跑通（15min）

**层**：next.js 前端
**预估**：15min
**关联需求**：F-002, F-008
**AC**：AC-001, AC-002, AC-008

实现 `app/profile/page.tsx`：
- 服务端组件，`export const dynamic = 'force-dynamic'`
- 从 `next/headers` 读 cookie 头
- `getMe` 失败 → `redirect('/auth?next=/profile')`
- 成功后渲染 `<ProfileShell user={user} profile={profile} />`

**验收**：
- `curl -b "ns_session=<jwt>" localhost:3000/profile` → 200 + HTML 含用户名
- `curl localhost:3000/profile`（无 cookie）→ 307 → `/auth?next=/profile`
- 浏览器手测：登录态下访问 `/profile` 直接看到 4 sections

---

## 依赖关系（feature 内）

T-001 → T-002 → T-007（数据通路）
T-003 → T-004 → T-005 → T-007（UI 通路）
T-006 独立（可与 T-004/T-005 并行）

## 跨 feature 引用

- 依赖：`1.F-001`（auth register/login/me API）、`1.F-007`（cookie 机制）
- 后续引用：`3.F-002`（middleware 也会查 cookie，重用 1.F-007 同一 cookie）