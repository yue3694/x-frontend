import { getHealth } from "@/lib/go-api";

export const dynamic = "force-dynamic";

export default async function Home() {
  const health = await getHealth();

  return (
    <main>
      <div className="grid" />
      <nav><span className="brand">NEURAL SYNTHESIS</span><span className="status"><i /> {health.status}</span></nav>
      <section className="hero">
        <p className="eyebrow">FULL-STACK FOUNDATION / 01</p>
        <h1>Go 的稳定内核，<br />SSR 的即时界面。</h1>
        <p className="lede">Next.js 负责服务端渲染与 BFF；oRPC 提供类型安全的前端访问面；Go 提供独立、可扩展的业务 API。</p>
        <div className="actions"><span className="endpoint">oRPC /api/rpc/*</span><span>API: {health.service} · {health.version}</span></div>
      </section>
      <section className="architecture">
        <article><b>01 / SSR</b><h2>Next.js App Router</h2><p>默认服务端渲染，首屏直接读取 Go 服务。</p></article>
        <article><b>02 / BFF</b><h2>oRPC Gateway</h2><p>将浏览器端的 procedures 映射为经过校验的 Go API 调用。</p></article>
        <article><b>03 / CORE</b><h2>Go HTTP API</h2><p>使用标准库、显式超时与优雅关闭，保持部署简单。</p></article>
      </section>
    </main>
  );
}
