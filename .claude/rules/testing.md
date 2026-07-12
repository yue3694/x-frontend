---
description: 测试规范（当前未集成测试框架；规范未来 Vitest / Go testing 的写法）
globs: '**/*.{test.ts,test.tsx,_test.go}'
---

# Testing

## 现状

- TypeScript：未配置 Vitest / Jest；新代码若引入测试，需先 `npm i -D vitest @vitest/ui`
- Go：标准库 `testing` + 表驱动；`go test ./...` 应通过

## 未来规范（落地时按此约定）

### TypeScript（Vitest）

- 测试文件与源文件同目录：`foo.ts` → `foo.test.ts`
- 一个 `describe` 对应一个被测函数/组件；多个 case 用 `it.each`
- 组件测试用 `@testing-library/react` + `jsdom`
- 异步断言用 `await expect(...).resolves.toBe(...)`；mock 用 `vi.fn()` / `vi.mock()`

### Go

- 文件 `foo_test.go` + 包 `foo` 或 `foo_test`
- 表驱动：`tests := []struct{...}{...}; for _, tt := range tests { t.Run(tt.name, ...) }`
- 集成测试用 `//go:build integration` tag，本地开发可跳过
- HTTP handler 测试：`httptest.NewRecorder` + `http.NewServeMux`

## 端到端冒烟（手工 / curl）

- `curl /healthz` → 200
- `curl -X POST /auth/register` → 201 + Set-Cookie
- `curl /auth/me -b <cookie>` → 200（无 PasswordHash）
- `curl /profile -b <cookie>` → 200 + 包含 fixture 字段
- `curl /profile`（无 cookie）→ 307 → `/auth?next=/profile`