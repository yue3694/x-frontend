# 02.profile-page — 设计规格

## 设计版本表

| 版本 | 日期 | 状态 |
| --- | --- | --- |
| v1 | 2026-07-12 | 初始版本 |

## 项目架构（feature 视角）

```
[Browser /profile] ──HTTP──▶ [Next.js RSC app/profile/page.tsx]
                                    │
                                    ├─▶ lib/go-api.ts getMe(cookie) ──▶ Go /auth/me
                                    │
                                    └─▶ lib/go-api.ts getProfile(cookie) ──▶ Go /profile
                                                              │
                                                              └─▶ ProfileFixtures
```

## 功能模块设计

### Go 端

#### `backend/internal/profile/fixtures.go`
- 硬编码 `AlexChen` 的 profile 数据（来自 stitch 设计稿）：
  - `Headline`, `Subheadline`, `Quote`
  - `Email`, `Location`, `Availability`
  - `Metrics`: 4 个 `{Label, Value, Color}`
  - `Skills`: 3 大类（AI Core / Full-Stack / Product），每类 2 项技能 + tags + `MasteryNote`
  - `Projects`: 3 个 `{Title, Version, Icon, Summary, Logic, TechStack, Achievement}`
  - `Timeline`: 6 项 `{DateRange, Role, Tags, Bullets, MarkerStyle}`
  - `AvatarURL`

#### `backend/internal/profile/handler.go`
```go
func Get(store UserStore, fixtures ProfileFixtures) http.HandlerFunc {
  return func(w http.ResponseWriter, r *http.Request) {
    user := auth.UserFromContext(r.Context())
    if user == nil { writeError(w, 401, "unauthenticated", "..."); return }
    profile := fixtures.ForUser(user) // 当前 fixtures 只为 demo user 提供完整数据
    writeJSON(w, 200, map[string]any{"user": user, "profile": profile})
  }
}
```
挂载：`mux.HandleFunc("GET /profile", profile.Get(...))`，要求 `auth.Me` 中间件已注入 user 到 context。

### Next.js

#### `lib/go-api.ts` 扩展
```ts
export type ProfileData = {
  headline: string
  subheadline: string
  quote: string
  email: string
  location: string
  availability: string
  avatarUrl: string
  metrics: { label: string; value: string; color: 'primary' | 'secondary' | 'tertiary' | 'success' }[]
  skills: { category: string; icon: string; color: string; items: { name: string; syncRate: number; tags: string[] }[]; masteryNote: string }[]
  projects: { title: string; version: string; icon: string; summary: string; logic: string; techStack: string[]; achievement: string }[]
  timeline: { dateRange: string; role: string; tags: string[]; bullets: string[]; markerStyle: 'dot' | 'diamond' }[]
}

export async function getProfile(cookieHeader: string): Promise<ProfileData>
```

#### `app/profile/page.tsx`（服务端组件）
```tsx
export const dynamic = 'force-dynamic'
export default async function ProfilePage() {
  const cookieHeader = (await headers()).get('cookie') ?? ''
  const user = await getMe(cookieHeader)
  if (!user) redirect('/auth?next=/profile')
  const profile = await getProfile(cookieHeader)
  return <ProfileShell user={user} profile={profile} />
}
```

#### `components/profile/ProfileShell.tsx`（客户端）
- 持有固定布局：背景 WebGL canvas + cursor-glow + nav + scroll-container + 4 个 section + scroll-progress

#### `components/profile/WebGLBackground.tsx`（客户端 + 懒加载）
- 直接移植 Stitch 的 fragment shader（grid + digital rain + mouse glow）
- 监听 `mousemove` 设 uniform `u_mouse`

#### `components/profile/NeuralHub.tsx`（客户端 + 懒加载）
- 使用 `three` 包：
  - `Scene + PerspectiveCamera + WebGLRenderer(alpha: true)`
  - `IcosahedronGeometry` 核心 + `Points` 漂浮粒子
  - 鼠标跟随旋转 + pulse 缩放
- 容器 resize observer 同步 renderer

#### `components/profile/{IdentityCore,SkillMatrix,FeaturedProjects,SystemLogs}.tsx`
- 服务端可渲染（除 `animate-on-scroll` 的 IntersectionObserver 触发用客户端子组件 `RevealOnScroll` 包装）
- 严格按 Stitch 设计稿的 HTML 结构移植
- CSS：把设计稿 `<style>` 块中的关键类（`.glass-card`, `.scan-line`, `.pulse-dot`, `.timeline-line`, `.animate-on-scroll`, `.progress-dot`）合并到 `app/styles.css`

#### `components/profile/ScrollProgress.tsx`（客户端）
- IntersectionObserver 监听 `.snap-section`，toggle `.active`

#### `components/profile/ProfileNav.tsx`（客户端）
- 锚点 `href="#sectionN"` + smooth scroll；登出按钮（本 feature 占位，03 实现实际行为）

### 字体加载

`app/layout.tsx`：
- 已用 Arial（现有）；新增通过 `next/font/google` 加载 Inter + JetBrains Mono + Material Symbols
- 设计稿 CSS 中的 `font-headline-xl / font-headline-lg / ...` 映射为 CSS variables，与现有 `--text` 共存

## 接口契约

### GET /profile
请求：cookie `ns_session=<jwt>`
成功 200：
```json
{
  "user": {"id":"u_abc","name":"Alex Chen","email":"alex@neural_log.ai"},
  "profile": {
    "headline": "陈傲 (Alex Chen)",
    "subheadline": "首席 AI 工程师 // 全栈系统架构师",
    "quote": "将生物学意图与合成智能相融合",
    "email": "alex@neural_log.ai",
    "location": "硅谷，加利福尼亚",
    "availability": "接受新项目",
    "avatarUrl": "https://lh3.googleusercontent.com/aida-public/AB6AXuCy745EVMp5XoyoOkKwJTNSvKHLWV9l3X59lAwOdlMcGY6dqPAoMLq6OWnthefp2SVr9aq7UovtqFWemskBonMG79b8pxRPSj__l8HzA2DaG94FOjnFzGCubuQ9ISmcYqwbtMOHPSTZEM1KhgPfkRCJiFR4OPwcXU-og7I1LHLzr9tQ18KdKZy1dbNxkr29757yZeEd3ItWvPQgTPCiAFG3ATnLeZqCL_F4o-kxuQ2ACCtJ4TpGJSIE",
    "metrics": [
      {"label":"代码行数","value":"1.2M+","color":"primary"},
      {"label":"训练 Epochs","value":"50k+","color":"secondary"},
      {"label":"部署 Agent","value":"120+","color":"tertiary"},
      {"label":"推理成本优化","value":"-45%","color":"success"}
    ],
    "skills": [...3 个...],
    "projects": [...3 个...],
    "timeline": [...6 个...]
  }
}
```
失败：
- 401 `{"error":"unauthenticated","message":"..."}`

## 数据模型（Go 端）

```go
type ProfileFixtures struct {
  Default ProfileData // demo user 使用
}

type ProfileData struct {
  Headline     string
  Subheadline  string
  Quote        string
  Email        string
  Location     string
  Availability string
  AvatarURL    string
  Metrics      []Metric
  Skills       []SkillCategory
  Projects     []Project
  Timeline     []TimelineEntry
}
```

## 安全考虑

1. `GET /profile` 必须从 cookie 拿 user，不接受 query 参数指定 user
2. 响应中绝不包含 `passwordHash` / `token` / `AUTH_JWT_SECRET`
3. Avatar URL 是受信任的（来自 Google 公共 CDN），不重定向到用户输入的 URL
4. SSR 阶段如 Go API 不可达，**不**渲染 profile（fail loud）—— 避免登录态泄露空数据

## 技术决策

- **TD-1**：Three.js 版本 —— 选 `three@0.160+`（稳定）；不引入 `@react-three/fiber`（feature 内只用一个 mesh，直接用原生 three 简单）
- **TD-2**：WebGL shader 移植 —— 直接用 design稿的 GLSL（pixel-level 复刻）
- **TD-3**：IntersectionObserver —— 用原生，不引入 `framer-motion` / `react-intersection-observer`
- **TD-4**：scroll-snap 用 CSS（`scroll-snap-type: y mandatory`），不引入额外库