import type { ReactNode } from "react";

type Accent = "primary" | "secondary" | "tertiary";

const accentMap: Record<Accent, { text: string; border: string; chip: string; ring: string }> = {
  primary: {
    text: "text-primary",
    border: "border-primary/30 hover:border-primary/70",
    chip: "bg-primary/10 text-primary border-primary/30",
    ring: "from-primary/10 to-transparent",
  },
  secondary: {
    text: "text-secondary",
    border: "border-secondary/30 hover:border-secondary/70",
    chip: "bg-secondary/10 text-secondary border-secondary/30",
    ring: "from-secondary/10 to-transparent",
  },
  tertiary: {
    text: "text-tertiary",
    border: "border-tertiary/30 hover:border-tertiary/70",
    chip: "bg-tertiary/10 text-tertiary border-tertiary/30",
    ring: "from-tertiary/10 to-transparent",
  },
};

export function FeatureCard({
  badge,
  title,
  summary,
  points,
  accent,
  icon,
  cta,
}: {
  badge: string;
  title: string;
  summary: string;
  points: string[];
  accent: Accent;
  icon: string;
  cta?: ReactNode;
}) {
  const a = accentMap[accent];
  return (
    <article
      className={`relative overflow-hidden p-6 md:p-7 rounded-2xl backdrop-blur-xl bg-surface/60 border ${a.border} transition-all duration-300 group`}
    >
      <div
        className={`absolute -top-16 -right-16 w-40 h-40 rounded-full bg-gradient-radial ${a.ring} blur-2xl pointer-events-none opacity-60 group-hover:opacity-100 transition-opacity`}
      />
      <div className="flex items-center justify-between mb-5">
        <span className={`font-mono text-[11px] uppercase tracking-widest px-2.5 py-1 rounded border ${a.chip}`}>
          {badge}
        </span>
        <span className={`material-symbols-outlined ${a.text} text-2xl`}>{icon}</span>
      </div>
      <h3 className={`font-mono text-xl font-semibold text-on-surface mb-3`}>{title}</h3>
      <p className="text-on-surface-variant text-sm leading-relaxed mb-5">{summary}</p>
      <ul className="space-y-1.5 text-xs font-mono text-on-surface-variant">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2">
            <span className={`material-symbols-outlined ${a.text} text-[14px] mt-0.5`}>
              arrow_right
            </span>
            <span>{p}</span>
          </li>
        ))}
      </ul>
      {cta && <div className="mt-5 pt-4 border-t border-white/5">{cta}</div>}
    </article>
  );
}