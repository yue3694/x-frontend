"use client";

import type { Profile } from "@/lib/go-api";
import { RevealOnScroll } from "./RevealOnScroll";
import nextDynamic from "next/dynamic";

const NeuralHub = nextDynamic(
  () => import("./NeuralHub").then((m) => m.NeuralHub),
  { ssr: false },
);

/**
 * Split a headline of the form "陈傲 (Alex Chen)" into bold + light segments.
 * Falls back to whole-string-bold when no parentheses are present.
 */
function splitHeadline(headline: string): { primary: string; secondary?: string } {
  const m = headline.match(/^(.+?)\s*\(([^)]+)\)\s*$/);
  if (m) return { primary: m[1].trim(), secondary: m[2].trim() };
  return { primary: headline };
}

/**
 * Split a quote of the form '"中文" (English)' into Chinese + English.
 * Returns the raw quote when no English part is found.
 */
function splitQuote(quote: string): { cn: string; en?: string } {
  const m = quote.match(/^["“]?(.+?)["”]?\s*\(([^)]+)\)\s*$/);
  if (m) return { cn: m[1].trim(), en: m[2].trim() };
  return { cn: quote };
}

export function IdentityCore({ profile }: { profile: Profile }) {
  const headline = splitHeadline(profile.headline);
  const quote = splitQuote(profile.quote);

  return (
    <RevealOnScroll>
      <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter items-center relative p-8 md:p-12 rounded-2xl glass-card">
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
            <div className="absolute -bottom-4 -right-4 bg-surface p-3 rounded-xl border border-primary/30 shadow-glow">
              <div className="font-code-sm text-xs text-primary flex items-center gap-2">
                <span className="w-2 h-2 bg-primary rounded-full pulse-dot" /> UPTIME: 99.9%
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-7 space-y-6 text-center md:text-left mt-8 md:mt-0 z-10">
          <RevealOnScroll delay={100}>
            <div className="inline-block px-4 py-1.5 bg-primary/10 border border-primary/30 rounded-full mb-2">
              <span className="font-label-caps text-xs text-primary tracking-widest uppercase">
                系统初始化: 运行良好
              </span>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={100}>
            <h1 className="font-headline-xl text-5xl md:text-6xl text-on-surface font-bold tracking-tight">
              {headline.primary}{" "}
              {headline.secondary && (
                <span className="text-on-surface-variant font-light">({headline.secondary})</span>
              )}
            </h1>
          </RevealOnScroll>
          <RevealOnScroll delay={200}>
            <p className="font-headline-md text-xl md:text-2xl text-primary font-medium mb-1">
              {profile.subheadline}
            </p>
            <p className="font-body-lg text-lg text-secondary opacity-90 italic">
              &quot;{quote.cn}&quot;{quote.en && (
                <span className="ml-1">({quote.en})</span>
              )}
            </p>
          </RevealOnScroll>
          <RevealOnScroll delay={300}>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start mt-4">
              <div className="flex items-center gap-2 text-on-surface-variant font-code-sm text-sm">
                <span className="material-symbols-outlined text-[16px]">mail</span> {profile.email}
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant font-code-sm text-sm">
                <span className="material-symbols-outlined text-[16px]">location_on</span> {profile.location}
              </div>
              <div className="flex items-center gap-2 text-success-green font-code-sm text-sm">
                <span className="material-symbols-outlined text-[16px]">check_circle</span> {profile.availability}
              </div>
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={300}>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-6 border-t border-white/10 mt-6 relative overflow-hidden">
              <div className="scan-line" />
              {profile.metrics.map((m) => (
                <div key={m.label}>
                  <div className="font-label-caps text-xs text-on-surface-variant uppercase mb-1">
                    {m.label}
                  </div>
                  <div className={`font-headline-lg text-2xl ${metricColor(m.color)}`}>{m.value}</div>
                </div>
              ))}
            </div>
          </RevealOnScroll>
          <RevealOnScroll delay={300}>
            <div className="flex flex-wrap gap-4 justify-center md:justify-start pt-6">
              <button className="px-6 py-3 bg-primary text-surface font-label-caps text-sm font-bold rounded-lg hover:bg-primary-container transition-colors">
                建立连接 [CONNECT]
              </button>
              <div className="flex gap-2">
                <a
                  className="w-12 h-12 rounded-lg border border-white/10 flex items-center justify-center hover:border-primary hover:text-primary transition-all text-on-surface-variant"
                  href="#"
                  aria-label="code"
                >
                  <span className="material-symbols-outlined">code</span>
                </a>
                <a
                  className="w-12 h-12 rounded-lg border border-white/10 flex items-center justify-center hover:border-tertiary hover:text-tertiary transition-all text-on-surface-variant"
                  href="#"
                  aria-label="chat"
                >
                  <span className="material-symbols-outlined">chat</span>
                </a>
              </div>
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
