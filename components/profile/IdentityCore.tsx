"use client";

import type { Profile } from "@/lib/go-api";
import { RevealOnScroll } from "./RevealOnScroll";
import nextDynamic from "next/dynamic";

const NeuralHub = nextDynamic(
  () => import("./NeuralHub").then((m) => m.NeuralHub),
  { ssr: false },
);

export function IdentityCore({ profile }: { profile: Profile }) {
  return (
    <RevealOnScroll>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative p-8 md:p-12 rounded-2xl glass-card">
        <div className="scan-line" />
        <div className="md:col-span-5 flex justify-center relative">
          <NeuralHub />
          <div className="relative group z-10">
            <div className="absolute -inset-2 bg-gradient-to-r from-primary to-secondary rounded-full blur-xl opacity-30 group-hover:opacity-60 transition duration-1000" />
            <div className="relative w-56 h-56 md:w-64 md:h-64 rounded-full border-4 border-primary/20 overflow-hidden bg-surface-container">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={profile.headline}
                className="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"
                src={profile.avatarUrl}
              />
            </div>
            <div className="absolute -bottom-4 -right-4 bg-surface p-3 rounded-xl border border-primary/30 shadow-[0_0_15px_rgba(173,198,255,0.2)]">
              <div className="font-mono text-xs text-primary flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full pulse-dot" /> UPTIME: 99.9%
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 space-y-6 text-center md:text-left mt-8 md:mt-0 z-10">
          <RevealOnScroll>
            <div className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/30 rounded-full mb-2">
              <span className="font-mono text-xs text-primary tracking-widest uppercase">
                系统初始化: 运行良好
              </span>
            </div>
          </RevealOnScroll>
          <RevealOnScroll>
            <h1 className="font-mono text-5xl md:text-6xl text-on-surface font-bold tracking-tight">
              {profile.headline}
            </h1>
          </RevealOnScroll>
          <RevealOnScroll>
            <p className="font-mono text-xl md:text-2xl text-primary font-medium mb-1">
              {profile.subheadline}
            </p>
            <p className="font-sans text-lg text-secondary opacity-90 italic">
              &quot;{profile.quote}&quot;
            </p>
          </RevealOnScroll>
          <RevealOnScroll>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-4">
              <div className="flex items-center gap-2 text-on-surface-variant font-mono text-sm">
                <span className="material-symbols-outlined text-base">mail</span> {profile.email}
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant font-mono text-sm">
                <span className="material-symbols-outlined text-base">location_on</span> {profile.location}
              </div>
              <div className="flex items-center gap-2 text-success-green font-mono text-sm">
                <span className="material-symbols-outlined text-base">check_circle</span> {profile.availability}
              </div>
            </div>
          </RevealOnScroll>
          <RevealOnScroll>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/10 mt-6 relative overflow-hidden">
              <div className="scan-line" />
              {profile.metrics.map((m) => (
                <div key={m.label}>
                  <div className="font-mono text-xs text-on-surface-variant uppercase mb-1">
                    {m.label}
                  </div>
                  <div className={`font-mono text-2xl ${metricColor(m.color)}`}>{m.value}</div>
                </div>
              ))}
            </div>
          </RevealOnScroll>
        </div>
      </div>
    </RevealOnScroll>
  );
}

function metricColor(c: string): string {
  switch (c) {
    case "primary": return "text-primary";
    case "secondary": return "text-secondary";
    case "tertiary": return "text-tertiary";
    case "success": return "text-success-green";
    default: return "text-on-surface";
  }
}