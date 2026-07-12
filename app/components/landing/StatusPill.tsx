type Tone = "primary" | "secondary" | "tertiary" | "success" | "muted";

const tones: Record<Tone, { dot: string; text: string; border: string }> = {
  primary: { dot: "bg-primary", text: "text-primary", border: "border-primary/40" },
  secondary: { dot: "bg-secondary", text: "text-secondary", border: "border-secondary/40" },
  tertiary: { dot: "bg-tertiary", text: "text-tertiary", border: "border-tertiary/40" },
  success: { dot: "bg-success-green", text: "text-success-green", border: "border-success-green/40" },
  muted: { dot: "bg-on-surface-variant", text: "text-on-surface-variant", border: "border-white/10" },
};

export function StatusPill({
  service,
  version,
  tone = "success",
  label,
}: {
  service: string;
  version: string;
  tone?: Tone;
  label?: string;
}) {
  const t = tones[tone];
  return (
    <span
      className={`inline-flex items-center gap-2 font-mono text-xs uppercase tracking-widest px-3 py-1 rounded-full border ${t.border} ${t.text}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${t.dot} pulse-dot`} />
      {label ?? `${service} · ${version}`}
    </span>
  );
}