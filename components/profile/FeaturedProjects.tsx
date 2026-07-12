import type { Profile } from "@/lib/go-api";
import { RevealOnScroll } from "./RevealOnScroll";

type Project = Profile["projects"][number];

export function FeaturedProjects({ projects }: { projects: Project[] }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {projects.map((p, i) => (
        <RevealOnScroll key={p.title} delay={100 * (i + 1)}>
          <div className="glass-card p-6 rounded-xl space-y-4 hover:border-tertiary/50 group flex flex-col h-full">
            <div className="scan-line" />
            <div className="flex justify-between items-start">
              <div className={`flex items-center gap-2 ${accentColor(p.highlight)}`}>
                <span className="material-symbols-outlined">{p.icon}</span>
                <h3 className="font-mono text-lg font-bold">{p.title}</h3>
              </div>
              <span className="px-2 py-1 bg-surface-container rounded text-[10px] font-mono text-on-surface-variant border border-white/5">
                {p.version}
              </span>
            </div>
            <div className="space-y-4 flex-grow">
              <p className="font-sans text-sm text-on-surface-variant">{p.summary}</p>
              <div className="space-y-2">
                <div className={`text-[10px] font-mono uppercase ${accentColor(p.highlight)}`}>
                  Implementation Logic
                </div>
                <p className="text-xs text-on-surface/70 leading-relaxed">{p.logic}</p>
              </div>
              <div className="space-y-2">
                <div className={`text-[10px] font-mono uppercase ${accentColor(p.highlight)}`}>
                  Tech Stack
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {p.tech.map((t) => (
                    <span
                      key={t}
                      className={`px-1.5 py-0.5 text-[10px] rounded ${tagStyle(p.highlight)}`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10">
              <div className="font-mono text-xs text-success-green bg-success-green/10 p-2 rounded flex items-center gap-2">
                <span className="material-symbols-outlined text-[14px]">trending_up</span>
                <span>Core Achievement: {p.achievement}</span>
              </div>
            </div>
          </div>
        </RevealOnScroll>
      ))}
    </div>
  );
}

function accentColor(c: string): string {
  switch (c) {
    case "primary": return "text-primary";
    case "secondary": return "text-secondary";
    case "tertiary": return "text-tertiary";
    default: return "text-on-surface";
  }
}

function tagStyle(c: string): string {
  switch (c) {
    case "primary": return "bg-primary/10 text-primary";
    case "secondary": return "bg-secondary/10 text-secondary";
    case "tertiary": return "bg-tertiary/10 text-tertiary";
    default: return "bg-white/5 text-on-surface-variant";
  }
}