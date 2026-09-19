"use client";

import { FormEvent, useState } from "react";

export default function LoginPage() {
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setLoading(true); setError(""); try { const response = await fetch("/api/auth/login", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password }) }); const data = await response.json(); if (!response.ok) throw new Error(data.error || "登入失敗"); window.location.href = "/"; } catch (cause) { setError(cause instanceof Error ? cause.message : "登入失敗"); setLoading(false); } }
  return <main className="login-page"><div className="login-card"><div className="brand-mark">K</div><p className="kicker">COLLABORATOR ACCESS</p><h1>專案查看登入</h1><p>請使用 Kevin 提供的 Email 與密碼登入。登入後只能看到被指派的專案。</p><form onSubmit={submit}><label><span>Email</span><input required type="email" value={email} onChange={event => setEmail(event.target.value)} autoComplete="username" /></label><label><span>密碼</span><input required type="password" value={password} onChange={event => setPassword(event.target.value)} autoComplete="current-password" /></label>{error && <div className="project-error" role="alert">{error}</div>}<button className="save-button" type="submit" disabled={loading}>{loading ? "登入中…" : "登入查看"}</button></form><a href="/">返回首頁</a></div></main>;
}
