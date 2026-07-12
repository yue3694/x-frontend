"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { orpcClient } from "@/lib/orpc/client";

type Mode = "login" | "signup";

export default function AuthPage() {
  return (
    <>
      <div className="grid-overlay" aria-hidden />
      <header className="w-full py-4 px-4 md:px-10 flex items-center justify-between z-50 relative">
        <div className="font-mono text-xl font-bold tracking-tighter text-primary">
          NEURAL_LOG
        </div>
        <div className="flex items-center gap-2 text-on-surface-variant font-mono text-xs tracking-widest">
          <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse" />
          SYSTEMS_STABLE_V1.0.4
        </div>
      </header>
      <Suspense fallback={<main className="flex-grow flex items-center justify-center" />}>
        <AuthPanel />
      </Suspense>
      <footer className="w-full py-4 px-4 md:px-10 text-center border-t border-white/5 relative z-50">
        <p className="text-on-surface-variant font-mono text-[10px] tracking-widest">
          © 2024 NEURAL_LOG. ALL SYSTEMS OPERATIONAL. SECURE_PROTOCOL_TLS_1.3_ENABLED
        </p>
      </footer>
    </>
  );
}

function AuthPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const nextPath = params.get("next") || "/profile";
  const [mode, setMode] = useState<Mode>("login");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const fd = new FormData(e.currentTarget);
      if (mode === "login") {
        await orpcClient.auth.login({
          email: String(fd.get("email") ?? ""),
          password: String(fd.get("password") ?? ""),
        });
      } else {
        const password = String(fd.get("password") ?? "");
        const confirm = String(fd.get("confirm") ?? "");
        if (password !== confirm) {
          setError("两次输入的密码不一致");
          setBusy(false);
          return;
        }
        console.log("Registering new user:", fd.get("name"), fd.get("email"));
        await orpcClient.auth.register({
          name: String(fd.get("name") ?? ""),
          email: String(fd.get("email") ?? ""),
          password,
        });
      }
      // Hard reload so server components re-fetch with the new cookie.
      window.location.href = nextPath;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      setError(msg);
      setBusy(false);
    }
  }

  return (
    <main className="flex-grow flex items-center justify-center p-4 md:p-8 relative">
      <div className="w-full max-w-[440px] z-10">
        {error && (
          <div className="mb-4 p-3 rounded border border-error/40 bg-error/10 text-error text-sm font-mono">
            {error}
          </div>
        )}

        {mode === "login" ? (
          <div className="glass-panel p-8 md:p-10 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
            <div className="mb-8 text-center">
              <h1 className="font-mono text-3xl font-semibold text-primary mb-2 tracking-tight">
                INITIALIZE_SESSION
              </h1>
              <p className="font-sans text-on-surface-variant text-sm">
                Enter cryptographic credentials to access the neural core.
              </p>
            </div>
            <form className="space-y-6" onSubmit={onSubmit}>
              <Field
                label="IDENTIFIER_EMAIL"
                name="email"
                type="email"
                icon="account_circle"
                placeholder="USER@NEURAL_LOG.AI"
              />
              <Field
                label="ACCESS_KEY"
                name="password"
                type="password"
                icon="lock"
                placeholder="••••••••"
                rightSlot={
                  <button type="button" className="text-on-surface-variant hover:text-primary" aria-label="toggle password visibility">
                    <span className="material-symbols-outlined text-base">visibility</span>
                  </button>
                }
                footer={<a className="text-[10px] font-mono text-on-surface-variant hover:text-primary" href="#">FORGOT_KEY?</a>}
              />
              <button
                disabled={busy}
                className="w-full bg-primary text-on-primary py-4 rounded-lg font-mono text-xs font-semibold tracking-[0.2em] glow-button flex items-center justify-center gap-3 uppercase disabled:opacity-60"
              >
                {busy ? "Authenticating..." : "Authenticate"}
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </button>
            </form>
            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-on-surface-variant text-sm">
                NO_ID_DETECTED?{" "}
                <button
                  type="button"
                  className="text-primary font-bold ml-1 hover:underline underline-offset-4 decoration-primary/30"
                  onClick={() => setMode("signup")}
                >
                  CREATE_ACCOUNT
                </button>
              </p>
            </div>
          </div>
        ) : (
          <div className="glass-panel p-8 md:p-10 rounded-xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-tertiary/50 to-transparent" />
            <div className="mb-8 text-center">
              <h1 className="font-mono text-3xl font-semibold text-tertiary mb-2 tracking-tight">
                PROVISION_NEW_NODE
              </h1>
              <p className="font-sans text-on-surface-variant text-sm">
                Register as a developer on the global neural network.
              </p>
            </div>
            <form className="space-y-5" onSubmit={onSubmit}>
              <Field label="DESIGNATION_NAME" name="name" icon="badge" placeholder="ALEX_RIVERA" />
              <Field label="UPLINK_EMAIL" name="email" type="email" icon="alternate_email" placeholder="ALEX@PROTOCOL.X" />
              <Field label="ENCRYPTION_KEY" name="password" type="password" icon="password" placeholder="MINIMUM_12_CHARS" />
              <Field label="VERIFY_KEY" name="confirm" type="password" icon="check_circle" placeholder="RE-ENTER_KEY" />
              <button
                disabled={busy}
                className="w-full bg-tertiary-container text-on-tertiary-container py-4 rounded-lg font-mono text-xs font-semibold tracking-[0.2em] glow-button flex items-center justify-center gap-3 uppercase disabled:opacity-60"
              >
                {busy ? "Provisioning..." : "Create Node"}
                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              </button>
            </form>
            <div className="mt-8 pt-6 border-t border-white/5 text-center">
              <p className="text-on-surface-variant text-sm">
                NODE_EXISTS?{" "}
                <button
                  type="button"
                  className="text-tertiary font-bold ml-1 hover:underline underline-offset-4 decoration-tertiary/30"
                  onClick={() => setMode("login")}
                >
                  RETURN_TO_LOGIN
                </button>
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  icon,
  placeholder,
  rightSlot,
  footer,
}: {
  label: string;
  name: string;
  type?: string;
  icon: string;
  placeholder?: string;
  rightSlot?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="group input-focus">
      <label className="font-mono text-[11px] text-on-surface-variant block mb-2 uppercase tracking-[0.18em] group-focus-within:text-primary transition-colors">
        {label}
      </label>
      <div className="relative flex items-center">
        <span className="material-symbols-outlined absolute left-0 text-on-surface-variant group-focus-within:text-primary transition-colors">
          {icon}
        </span>
        <input
          required
          name={name}
          type={type}
          placeholder={placeholder}
          className="w-full bg-transparent border-none focus:ring-0 text-on-surface placeholder:text-surface-variant font-mono text-sm pl-8 py-3 outline-none"
        />
        {rightSlot && <div className="absolute right-0">{rightSlot}</div>}
      </div>
      <div className="h-px w-full bg-white/10 input-underline" />
      {footer && <div className="mt-2 text-right">{footer}</div>}
    </div>
  );
}