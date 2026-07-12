import type { Profile } from "@/lib/go-api";
import { RevealOnScroll } from "./RevealOnScroll";

type Entry = Profile["timeline"][number];

export function SystemLogs({ entries }: { entries: Entry[] }) {
  return (
    <RevealOnScroll delay={100}>
      <div className="glass-card rounded-xl overflow-hidden h-[60vh] flex flex-col">
        <div className="scan-line" />
        <div className="bg-surface-variant/50 px-6 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-error" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-success-green" />
          </div>
          <div className="font-mono text-xs text-on-surface-variant">
            tail -f /var/log/career.log
          </div>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto font-mono text-sm relative flex-grow">
          <div className="timeline-line" />
          <div className="space-y-10">
            {entries.map((e, idx) => (
              <RevealOnScroll key={`${e.dateRange}-${e.role}`} delay={100 * ((idx % 3) + 1)}>
                <TimelineRow entry={e} />
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </div>
    </RevealOnScroll>
  );
}

function TimelineRow({ entry }: { entry: Entry }) {
  const m = entry.marker;
  const isDiamond = m.endsWith("diamond");
  const color = m.split("-")[0];
  return (
    <div className="relative pl-10">
      <div
        className={`absolute z-10 ${markerStyle(m)}`}
        style={{
          left: isDiamond ? "9px" : color === "primary" ? "11px" : color === "tertiary" ? "12px" : "11px",
          top: "6px",
          width: isDiamond ? "12px" : "10px",
          height: isDiamond ? "12px" : "10px",
          borderRadius: isDiamond ? "2px" : "50%",
          background: markerBg(color),
          transform: isDiamond ? "rotate(45deg)" : undefined,
          boxShadow: color === "primary" ? "0 0 10px #adc6ff" : undefined,
        }}
      />
      <div className={`font-bold mb-1 ${markerTextColor(color)}`}>[RUNTIME] {entry.dateRange}</div>
      <div className="text-on-surface text-lg font-bold mb-1">{entry.role}</div>
      {entry.tags && entry.tags.length > 0 && (
        <div className="text-on-surface-variant mb-3 font-mono text-xs bg-surface-container inline-block px-2 py-1 rounded border border-white/5">
          {entry.tags.join(" / ")}
        </div>
      )}
      <p className="text-on-surface-variant leading-relaxed opacity-80">
        {entry.bullets.map((b, i) => (
          <span key={i}>
            {"> "}{b}
            {i < entry.bullets.length - 1 && <br />}
          </span>
        ))}
      </p>
    </div>
  );
}

function markerStyle(_m: string): string {
  return "";
}

function markerBg(color: string): string {
  switch (color) {
    case "primary": return "#adc6ff";
    case "secondary": return "#ddb7ff";
    case "tertiary": return "#4cd7f6";
    case "outline": return "#8c909f";
    default: return "#ffffff";
  }
}

function markerTextColor(color: string): string {
  switch (color) {
    case "primary": return "text-primary";
    case "secondary": return "text-secondary";
    case "tertiary": return "text-tertiary";
    case "outline": return "text-outline";
    default: return "text-on-surface";
  }
}