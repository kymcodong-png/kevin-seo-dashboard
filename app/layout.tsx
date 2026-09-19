import type { Metadata } from "next";
import "./globals.css";
import AuthGate from "./auth-gate";

export const metadata: Metadata = {
  title: "Kevin SEO Decision Dashboard｜Mobellio v1",
  description: "SEO＋AI Search 投資決策儀表板第一版。",
  other: { "codex-preview": "development" },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-Hant"><body><AuthGate>{children}</AuthGate></body></html>;
}
