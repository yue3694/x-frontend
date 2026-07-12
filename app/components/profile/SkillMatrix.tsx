import type { Profile } from "@/lib/go-api";
import { RevealOnScroll } from "./RevealOnScroll";

type Category = Profile["skills"][number];

export function SkillMatrix({ categories }: { categories: Category[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {categories.map((c, i) => (
        <RevealOnScroll key={c.category} delay={100 * (i + 1)}>
          <div className="glass-card p-6 rounded-xl space-y-6 h-full">
            <div className="scan-line" />
            <div className="flex items-center gap-3 mb-4 border-b border-white/10 pb-4">
              <span className={`material-symbols-outlined text-2xl ${catColor(c.color)}`}>
                {c.icon}
              </span>
              <h3 className={`font-headline-md text-lg ${catColor(c.color)}`}>{c.category}</h3>
            </div>
            <div className="space-y-6">
              {c.items.map((it, idx) => (
                <div key={it.name}>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-label-caps text-sm text-on-surface">{it.name}</span>
                    <span className="font-code-sm text-xs text-on-surface-variant">
                      Sync Rate: {it.syncRate}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-surface-container rounded-full overflow-hidden mb-2 relative">
                    <div className="scan-line" />
                    <div
                      className={`h-full rounded-full ${progressColor(c.color)} ${idx === 0 ? progressShadow(c.color) : ""}`}
                      style={{ width: `${it.syncRate}%` }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {it.tags.map((t) => (
                      <span
                        key={t}
                        className={`text-[10px] px-1.5 py-0.5 rounded border ${tagStyle(c.color)}`}
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-white/5">
                <div className="text-[10px] font-label-caps text-on-surface-variant uppercase mb-1">
                  Core Mastery
                </div>
                <div className="font-body-md text-xs text-on-surface opacity-80">{c.masteryNote}</div>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      ))}
    </div>
  );
}

function catColor(c: string): string {
  switch (c) {
    case "primary": return "text-primary";
    case "secondary": return "text-secondary";
    case "tertiary": return "text-tertiary";
    default: return "text-on-surface";
  }
}

function progressColor(c: string): string {
  switch (c) {
    case "primary": return "bg-gradient-to-r from-primary to-secondary";
    case "secondary": return "bg-gradient-to-r from-secondary to-primary";
    case "tertiary": return "bg-gradient-to-r from-tertiary to-primary";
    default: return "bg-primary";
  }
}

function progressShadow(c: string): string {
  // Design only applies glow to the first skill of each category.
  switch (c) {
    case "secondary": return "shadow-glow-secondary";
    case "tertiary": return "shadow-glow-tertiary";
    case "primary": return "shadow-glow-primary";
    default: return "";
  }
}

function tagStyle(c: string): string {
  switch (c) {
    case "primary": return "bg-primary/10 text-primary border-primary/20";
    case "secondary": return "bg-secondary/10 text-secondary border-secondary/20";
    case "tertiary": return "bg-tertiary/10 text-tertiary border-tertiary/20";
    default: return "bg-white/5 text-on-surface-variant border-white/10";
  }
}