"use client";

import nextDynamic from "next/dynamic";

const WebGLBackground = nextDynamic(
  () => import("./WebGLBackground").then((m) => m.WebGLBackground),
  { ssr: false },
);

export function BackgroundLayer() {
  return <WebGLBackground />;
}