import type { Profile } from "@/lib/go-api";
import { RevealOnScroll } from "./RevealOnScroll";

type Entry = Profile["timeline"][number];

interface MarkerMeta {
  label: string;
  color: "primary" | "secondary" | "tertiary" | "outline";
  shape: "dot" | "diamond";
  size: number;       // px
  left: number;       // px from container edge
  top: number;        // px from container top
  shadow?: string;    // box-shadow
}

/**
 * Marker presets — extracted from docs/intro/code.html so visual fidelity
 * is verifiable against the design.
 */
const MARKERS: Record<string, MarkerMeta> = {
  "primary-dot":        { label: "RUNTIME",        color: "primary",   shape: "dot",      size: 10, left: 11, top: 6, shadow: "0 0 10px #adc6ff" },
  "primary-dot-strong": { label: "RUNTIME",        color: "primary",   shape: "dot",      size: 10, left: 11, top: 6 },
  "secondary-diamond":  { label: "CORE_SYS_FLASH", color: "secondary", shape: "diamond",  size: 12, left:  9, top: 6 },
  "tertiary-dot":       { label: "LEGACY_SYS",     color: "tertiary",  shape: "dot",      size:  8, left: 12, top: 6 },
  "outline-diamond":    { label: "CORE_SYS_INIT",  color: "outline",   shape: "diamond",  size: 12, left:  9, top: 6 },
};

const MARKER_COLOR_HEX: Record<MarkerMeta["color"], string> = {
  primary: "#adc6ff",
  secondary: "#ddb7ff",
  tertiary: "#4cd7f6",
  outline: "#8c909f",
};

const MARKER_TEXT_CLASS: Record<MarkerMeta["color"], string> = {
  primary: "text-primary",
  secondary: "text-secondary",
  tertiary: "text-tertiary",
  outline: "text-outline",
};

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
          <div className="font-code-sm text-xs text-on-surface-variant">
            tail -f /var/log/career.log
          </div>
        </div>
        <div className="p-6 md:p-8 overflow-y-auto font-code-sm text-sm relative flex-grow">
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
  const meta = MARKERS[entry.marker] ?? MARKERS["primary-dot"];

  return (
    <div className="relative pl-10">
      <div
        className="absolute z-10"
        style={{
          left: `${meta.left}px`,
          top: `${meta.top}px`,
          width: `${meta.size}px`,
          height: `${meta.size}px`,
          borderRadius: meta.shape === "diamond" ? "2px" : "50%",
          background: MARKER_COLOR_HEX[meta.color],
          transform: meta.shape === "diamond" ? "rotate(45deg)" : undefined,
          boxShadow: meta.shadow,
        }}
      />
      <div className={`font-bold mb-1 ${MARKER_TEXT_CLASS[meta.color]}`}>
        [{meta.label}] {entry.dateRange}
      </div>
      <div className="text-on-surface text-lg font-bold mb-1">{entry.role}</div>
      {entry.tags && entry.tags.length > 0 && (
        <div className="text-on-surface-variant mb-3 font-body-md text-xs bg-surface-container inline-block px-2 py-1 rounded border border-white/5">
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