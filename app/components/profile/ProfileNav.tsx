"use client";

import { useRouter } from "next/navigation";
import { orpcClient } from "@/lib/orpc/client";
import type { SessionUser } from "@/lib/go-api";

export function ProfileNav({ user }: { user: SessionUser }) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await orpcClient.auth.logout({});
    } catch {
      // ignore
    }
    window.location.href = "/auth";
  }

  return (
    <nav className="fixed top-0 w-full z-50 bg-surface/60 backdrop-blur-xl border-b border-white/10 shadow-[0_0_15px_rgba(173,198,255,0.15)]">
      <div className="flex justify-between items-center px-4 md:px-10 py-4 max-w-[1200px] mx-auto">
        <div className="font-mono text-2xl font-bold tracking-tighter text-primary">
          X-FRONTEND
        </div>
        <div className="hidden md:flex gap-8">
          <a className="font-mono text-xs text-primary border-b-2 border-primary pb-1" href="#section1">
            核心模块
          </a>
          <a className="font-mono text-xs text-on-surface-variant hover:text-primary transition-colors" href="#section2">
            技能矩阵
          </a>
          <a className="font-mono text-xs text-on-surface-variant hover:text-primary transition-colors" href="#section3">
            精选项目
          </a>
          <a className="font-mono text-xs text-on-surface-variant hover:text-primary transition-colors" href="#section4">
            系统日志
          </a>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden sm:inline-flex items-center gap-2 px-3 py-1 bg-surface-variant/30 rounded-full border border-white/5">
            <span className="w-2 h-2 bg-success-green rounded-full pulse-dot" />
            <span className="font-mono text-xs text-on-surface-variant truncate max-w-[160px]">
              {user.Email}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-xs font-mono text-on-surface-variant border border-white/10 rounded hover:border-error hover:text-error transition-colors"
          >
            LOGOUT
          </button>
        </div>
      </div>
    </nav>
  );
}