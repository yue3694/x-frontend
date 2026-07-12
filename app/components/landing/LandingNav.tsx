"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { orpcClient } from "@/lib/orpc/client";
import type { SessionUser } from "@/lib/go-api";

export function LandingNav({ user }: { user: SessionUser | null }) {
  const router = useRouter();

  async function handleLogout() {
    try {
      await orpcClient.auth.logout({});
    } catch {
      // ignore
    }
    router.refresh();
    window.location.href = "/";
  }

  return (
    <nav className="app-nav">
      <Link href="/" className="brand">
        NEURAL SYNTHESIS
      </Link>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <span className="hidden sm:inline-flex items-center gap-2 font-mono text-xs text-on-surface-variant">
              <span className="w-1.5 h-1.5 rounded-full bg-success-green pulse-dot" />
              {user.Email}
            </span>
            <Link
              href="/profile"
              className="font-mono text-xs text-primary border border-primary/40 rounded px-3 py-1 hover:bg-primary/10 transition-colors"
            >
              个人档案
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="font-mono text-xs text-on-surface-variant border border-white/10 rounded px-3 py-1 hover:border-error hover:text-error transition-colors"
            >
              LOGOUT
            </button>
          </>
        ) : (
          <>
            <span className="status">
              <i /> {user ? "AUTHENTICATED" : "OPEN"}
            </span>
            <Link
              href="/auth"
              className="font-mono text-xs text-primary border border-primary/40 rounded px-3 py-1 hover:bg-primary/10 transition-colors"
            >
              进入系统
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}