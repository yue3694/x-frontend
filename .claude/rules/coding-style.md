---
description: 代码风格规范（TypeScript strict + ESLint next + Go 标准库 + 项目实际惯例）
globs: '**/*.{ts,tsx,go}'
---

# Coding Style

## TypeScript / Next.js

- `strict: true` 已开；不允许 `any` 隐式逃逸（显式标注的 `any` 仅在 oRPC `z.any()` 边界使用）
- 命名：组件 PascalCase，函数 camelCase，常量 UPPER_SNAKE_CASE，文件名 kebab-case（路由）或 PascalCase（组件）
- 客户端边界：标 `"use client"` 的文件才能用 hooks / `window` / DOM API；服务端组件内禁止 `next/dynamic({ ssr: false })`，必须包一层 `"use client"` 组件
- 路径别名：用 `@/...`（tsconfig `paths`），不要写 `../../..`
- 错误处理：try/catch + 抛 `Error` 子类（API 调用统一用 `lib/go-api.ts` 的 `toApiError`）

## React / Hooks

- 服务端数据走 `async` server component + `lib/go-api.ts`；客户端交互状态用 `useState`，跨页面用 `useRouter`
- 列表/表单/Effect 写依赖数组要完整（lint `react-hooks/exhaustive-deps` 启用）
- 不要在 render 里做副作用（fetch / setState / 改全局）；放 `useEffect`

## Tailwind

- 优先 token 类（`bg-primary` / `text-on-surface` / `border-white/10`）；自定义颜色先在 `tailwind.config.js` extend
- 复杂样式分层：通用布局 / 玻璃 / 动画在 `app/styles.css`；组件特定微调用 Tailwind
- 避免 `style={{...}}` 内联长串，能提到 CSS class

## Go

- 用标准库优先（`net/http` + `log/slog`）；新依赖必须经评审
- 包结构：`internal/<domain>/<file>.go`，主入口只做装配
- 错误处理：errors.Is/As + wrap（`fmt.Errorf("...: %w", err)`）；slog 记录上下文（endpoint / status / duration_ms）
- context 第一参数贯穿整个调用链
- JSON tag 与 TypeScript 字段对齐（用大写 `ID` / `Name` 而非 `id` / `name`，对齐 orpc 自动生成的 schema）

## 全局

- 单文件 ≤ 500 行（CLAUDE.md 根规则）
- 公开 API 必须有 Zod schema 校验；后端 Go 端做二次校验
- 不要把 secrets / `.env*` 提交到 git
- 不要在 commit message 加 `Co-Authored-By: Claude`（除非项目 settings 显式启用）