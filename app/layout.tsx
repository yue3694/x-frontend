import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "Neural Synthesis",
  description: "SSR + oRPC gateway backed by Go",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
