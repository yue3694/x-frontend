# Neural Synthesis

A runnable full-stack foundation: Next.js 16 SSR frontend + oRPC BFF + Go HTTP API + PostgreSQL. Email/password auth, protected profile page, middleware route guard.

## 架构

```
[Browser] ──proxy.ts──▶ [Next.js App Router]
                              │
                              ├─▶ lib/go-api.ts (lib proxy)
                              │
                              └─▶ Go API :8080  (auth + profile)
                                        │
                                        └─▶ PostgreSQL :5432
```

## 启动

### 1. 后端 (Go + PostgreSQL)

```bash
cd backend

# 一次性安装 air（热重载）
go install github.com/air-verse/air@latest

# Dev 模式（前台 + 自动重载）
make dev

# 或后台运行
make dev-bg
make logs       # tail -f /tmp/go-api.log
make status
make stop

# 或一次性 build + run
make run-bg
make logs
```

可用 `make` / `make help` 看所有命令。  
环境变量 `DATABASE_URL` / `AUTH_JWT_SECRET` 在 `Makefile` 顶部默认设了本地值；生产请覆盖。

### 2. 前端 (Next.js)

```bash
npm install
cp .env.example .env.local

# 开发模式
npm run dev                    # :3000

# 或生产构建 + 启动
npm run build && PORT=3001 npm start
```

访问 `http://localhost:3000`（dev）或 `http://localhost:3001`（prod）。

### 3. 一键起两服务

```bash
docker compose up --build
```

## 验证

```bash
make health                   # Go /healthz
npm run typecheck
npm run lint
npm run build
```

## 端到端流程

```
/             ──▶ [未登录] 进入系统 ─▶ /auth?next=/profile
              ──▶ [已登录] 个人档案 ─▶ /profile
/auth         ──▶ 登录 / 注册 ─▶ /profile（cookie 自动 set）
/profile      ──▶ SSR 首屏直出 + 4 snap-section + Three.js + WebGL
```

## 端到端冒烟 (curl)

```bash
# 注册
curl -i -X POST http://localhost:8080/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"name":"Alex","email":"alex@test.com","password":"secret123"}'

# 登录 → 拿 cookie
curl -i -X POST http://localhost:8080/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"alex@test.com","password":"secret123"}'
# 复制 Set-Cookie: ns_session=<jwt>; 给下面命令 -b 用

# /auth/me
curl http://localhost:8080/auth/me -b 'ns_session=<jwt>'

# /profile
curl http://localhost:8080/profile -b 'ns_session=<jwt>'
```

## 目录结构

```
x-frontend/
├── app/                       # Next.js App Router
│   ├── page.tsx                # 落地页（auth-aware CTA + features）
│   ├── auth/page.tsx           # 登录/注册（双面板）
│   ├── profile/page.tsx        # 受保护简介页（SSR）
│   ├── api/rpc/[...rest]/route.ts
│   └── components/             # 客户端组件（landing / profile）
├── lib/                       # BFF (oRPC + go-api + auth-cookies)
├── proxy.ts                    # Edge JWT 路由保护
├── backend/
│   ├── cmd/api/main.go
│   ├── internal/{db,auth,profile}/
│   ├── .air.toml               # 热重载配置
│   └── Makefile                # dev / logs / stop / restart
├── docs/                       # 设计稿（Stitch 导出）
└── specs/                      # 开发规格
```

## 环境变量 (.env.local + backend env)

| 变量 | 默认 | 说明 |
| --- | --- | --- |
| `GO_API_URL` | `http://localhost:8080` | Next.js 调 Go 的地址 |
| `AUTH_JWT_SECRET` | `dev-secret-change-me` | HS256 密钥；生产用 32+ 字节随机串 |
| `DATABASE_URL` | `postgres://postgres:postgres@localhost:5432/postgres?sslmode=disable` | PostgreSQL 连接串 |