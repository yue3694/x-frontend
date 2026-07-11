# Neural Synthesis

一个可运行的全栈起点：Next.js SSR 前端 + oRPC BFF + Go HTTP API。

## 架构

浏览器调用 `/api/rpc/*`；Next.js 的 oRPC handler 校验并聚合请求；procedures 调用 Go 服务（默认 `http://localhost:8080`）。服务端首屏同样直接访问 Go API，因此无需等待浏览器 hydration 才能展示数据。

oRPC 是 TypeScript 运行时，无法直接托管在 Go 内。因此项目刻意将它置于 SSR/BFF 边界，Go 保持语言无关的领域 API；这是两者共存且避免把业务逻辑复制到 Node 的分层。

## 本地启动

```bash
cp .env.example .env.local
# 终端 1（需 Go 1.24+）
cd backend && go run ./cmd/api
# 终端 2
npm install
npm run dev
```

访问 `http://localhost:3000`。浏览器端通过 `lib/orpc/client.ts` 调用 `system.health` procedure；oRPC endpoint 是供客户端协议使用的 `/api/rpc/*`，而非裸链接页面。

## 验证

```bash
npm run typecheck
npm run lint
npm run build
docker compose up --build
```
