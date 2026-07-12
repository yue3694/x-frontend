---
description: Git 流程（commit / branch / PR / 提交信息）
globs: '**'
---

# Git Workflow

## 分支

- `main`：始终可发布；只接受 PR merge
- feature 分支：`feat/<scope>` 或 `<n>.<slug>`（与 specs/ 目录对齐）
- 例：`feat/auth-foundation` 或 `1.auth-foundation`

## Commit

- 提交信息：`type(scope): <subject>`，subject 50 字符内，body 72 字符换行
- type：`feat` / `fix` / `refactor` / `perf` / `docs` / `test` / `chore` / `style`
- 一个 commit 对应一个原子改动；不要混 feature + 重构
- **不加** `Co-Authored-By: Claude` trailer（除非 `.claude/settings.json` 显式启用 `attribution.commit`）

## 提交前自查

- `npm run typecheck && npm run lint && npm run build`
- `cd backend && go build ./...`
- 受影响 feature 的三件套（requirements / design / tasks）任务标记 `[x]`
- `git status` 确认无意外文件（`.env.local` / `node_modules` / `.next` / `*.log`）

## PR

- 一个 PR 对应一个 feature 目录（01.auth-foundation / 02.profile-page / 03.route-guard）
- 描述：动机 / 改动清单 / 验证步骤（curl 输出 / 截图）
- 关联 `specs/<n>.<slug>/` 中的任务 ID

## 不入库

- `.env.local` / `.env.*.local`
- `node_modules/` / `.next/` / `backend/exe/`
- `*.log` / `.DS_Store`
- 任何包含 secret / JWT secret / 数据库密码的文件