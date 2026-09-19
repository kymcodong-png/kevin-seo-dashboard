"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname(); const publicShare = pathname.startsWith("/shared/"); const [allowed, setAllowed] = useState(pathname === "/login" || publicShare);
  useEffect(() => {
    if (pathname === "/login" || pathname.startsWith("/shared/")) { setAllowed(true); return; }
    setAllowed(false);
    fetch("/api/auth/me", { cache: "no-store" }).then(response => { if (!response.ok) { window.location.replace("/login"); return null; } return response.json(); }).then(data => { if (data?.access) setAllowed(true); }).catch(() => window.location.replace("/login"));
  }, [pathname]);
  if (!allowed) return <div className="auth-loading" aria-live="polite">正在確認登入狀態…</div>;
  return <>{children}</>;
}
