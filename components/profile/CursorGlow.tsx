"use client";

import { useEffect } from "react";

export function CursorGlow() {
  useEffect(() => {
    function onMove(e: MouseEvent) {
      document.documentElement.style.setProperty("--cursor-x", `${e.clientX}px`);
      document.documentElement.style.setProperty("--cursor-y", `${e.clientY}px`);
    }
    document.addEventListener("mousemove", onMove);
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  return <div className="cursor-glow" aria-hidden />;
}