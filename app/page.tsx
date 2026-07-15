import { redirect } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import { getHealth, getMe } from "@/lib/go-api";
import { LandingNav } from "@/app/components/landing/LandingNav";
import { FeatureCard } from "@/app/components/landing/FeatureCard";
import { StatusPill } from "@/app/components/landing/StatusPill";

export const dynamic = "force-dynamic";

const features: Array<{
  badge: string;
  title: string;
  summary: string;
  points: string[];
  accent: "primary" | "secondary" | "tertiary";
  icon: string;
}> = [
  {
    badge: "01 / ACCESS",
    title: "Initialize Session",
    summary:
      "邮箱 + 密码登录或注册。后端用 bcrypt 哈希密码，session 走 HTTP-only cookie + JWT (HS256)。",
    points: ["PostgreSQL 持久化", "HttpOnly + SameSite=Lax cookie", "Zod 端到端校验"],
    accent: "primary",
    icon: "lock",
  },
  {
    badge: "02 / IDENTITY",
    title: "Neural Profile Core",
    summary:
      "登录后查看 4 个 snap-section：身份核心 / 技能矩阵 / 精选项目 / 系统日志。",
    points: ["SSR 首屏直出", "Three.js 神经核动效", "WebGL shader 背景"],
    accent: "secondary",
    icon: "psychology",
  },
  {
    badge: "03 / GUARD",
    title: "Route Shield",
    summary:
      "proxy.ts 在 Edge 校验 JWT cookie；未登录访问 /profile 自动 307 到 /auth?next=...。",
    points: ["HS256 严格白名单", "静态资源 / RPC 放行", "jose Edge 兼容"],
    accent: "tertiary",
    icon: "security",
  },
];

export default async function Home() {
  const cookieHeader = (await headers()).get("cookie") ?? "";
  const [health, user] = await Promise.all([
    getHealth(),
    Promise.resolve(getMe(cookieHeader)),
  ]);

  return (
    <main className="landing-shell">
      <div className="landing-grid" />
      <LandingNav user={user} />

      <section className="hero">
        <div className="flex items-center gap-3 flex-wrap">
          <StatusPill service={health.service} version={health.version} />
          <span className="font-mono text-xs text-on-surface-variant uppercase tracking-widest">
            v1.0.4 · Build {new Date().getFullYear()}
          </span>
        </div>
        <h1>
          Go 的稳定内核，
          <br />
          SSR 的即时界面。
        </h1>
        <p className="lede">
          Next.js 16 负责服务端渲染与 BFF；oRPC 提供类型安全的前端访问面；Go 提供独立、可扩展的业务
          API；PostgreSQL 提供持久化。整套栈在本地一条命令拉起，端到端跑通登录 / 注册 / 受保护路由。
        </p>
        <div className="actions">
          {user ? (
            <>
              <Link className="endpoint" href="/profile">
                打开个人档案 →
              </Link>
              <span className="font-mono text-on-surface">
                已登录 · <span className="text-primary">{user.Email}</span>
              </span>
            </>
          ) : (
            <>
              <Link className="endpoint" href="/auth">
                进入系统 → INITIALIZE_SESSION
              </Link>
              <Link className="ghost-link" href="/auth?mode=signup">
                没有账号？注册
              </Link>
              <span className="text-on-surface-variant">
                Go {health.service} · {health.version}
              </span>
            </>
          )}
        </div>
      </section>

      <section className="cta-row">
        {user ? (
          <div className="cta-banner tone-primary">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-primary/80 mb-2">
                已建立连接 / CONNECTION ESTABLISHED
              </p>
              <p className="text-on-surface text-lg">
                <span className="text-primary font-mono">{user.Name}</span>，欢迎回到神经核。
              </p>
            </div>
            <Link href="/profile" className="endpoint">
              查看档案 →
            </Link>
          </div>
        ) : (
          <div className="cta-banner tone-cyan">
            <div>
              <p className="font-mono text-xs uppercase tracking-widest text-tertiary/80 mb-2">
                需要授权 / AUTHORIZATION REQUIRED
              </p>
              <p className="text-on-surface text-lg">
                登录后即可访问
                <span className="text-tertiary font-mono mx-1">/profile</span>
                — 身份核心 / 技能矩阵 / 精选项目 / 系统日志
              </p>
            </div>
            <Link href="/auth?next=/profile" className="endpoint">
              登录或注册 →
            </Link>
          </div>
        )}
      </section>

      <section className="features">
        {features.map((f) => (
          <FeatureCard key={f.badge} {...f} />
        ))}
      </section>

      <section className="stack">
        <p className="font-mono text-xs uppercase tracking-widest text-on-surface-variant">
          Stack
        </p>
        <ul>
          <li><b>Next.js 16</b> · App Router + RSC + middleware（proxy.ts）</li>
          <li><b>oRPC 1.14</b> · 类型安全 procedures + Zod 校验</li>
          <li><b>Go 1.25</b> · net/http + pgx/v5 + golang-jwt + bcrypt</li>
          <li><b>PostgreSQL 18</b> · pgxpool + 启动时自动 migration</li>
          <li><b>Three.js / WebGL</b> · next/dynamic 懒加载 + 原生 shader</li>
        </ul>
      </section>
    </main>
  );
}
