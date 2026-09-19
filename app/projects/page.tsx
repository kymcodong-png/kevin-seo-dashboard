"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "../sidebar";

type Project = {
  id: string;
  name: string;
  clientName: string;
  websiteUrl: string;
  businessType: string;
  siteMode: "A" | "B" | "C";
  status: string;
  reportName: string;
  assessmentDate: string;
  updatedAt: string;
};

const modeNames = { A: "現有網站優化", B: "全新網站（新網域）", C: "全新網站（舊網域）" };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ clientName: "", name: "", websiteUrl: "", businessType: "B2B", siteMode: "A" });

  async function loadProjects() {
    setLoading(true);
    try {
      const response = await fetch("/api/projects");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "專案載入失敗");
      setProjects(data.projects);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "專案載入失敗");
    } finally { setLoading(false); }
  }

  useEffect(() => { fetch("/api/auth/me").then(response => response.ok ? response.json() : null).then(data => { if (data?.access?.kind !== "owner") { window.location.href = "/login"; return; } loadProjects(); }).catch(() => { window.location.href = "/login"; }); }, []);

  async function createProject(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "建立專案失敗");
      window.localStorage.setItem("kevin-active-project-id", data.project.id);
      window.location.href = "/data-fields";
    } catch (cause) { setError(cause instanceof Error ? cause.message : "建立專案失敗"); }
  }

  function openProject(id: string) {
    window.localStorage.setItem("kevin-active-project-id", id);
    window.location.href = "/overall";
  }

  async function archiveProject(project: Project) {
    if (!window.confirm(`確定要封存「${project.clientName}」專案嗎？資料不會顯示在目前專案清單中。`)) return;
    const response = await fetch(`/api/projects/${project.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) { setError(data.error || "專案封存失敗"); return; }
    if (window.localStorage.getItem("kevin-active-project-id") === project.id) window.localStorage.removeItem("kevin-active-project-id");
    loadProjects();
  }

  function downloadDataBackup(project: Project) {
    const link = document.createElement("a");
    link.href = `/api/projects/${encodeURIComponent(project.id)}/backup`;
    link.click();
  }

  function focusProjectList() {
    document.querySelector(".project-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return <main className="app-shell">
    <header className="topbar"><a className="brand brand-link" href="/"><span className="brand-mark">K</span><span><strong>Kevin SEO Decision Dashboard</strong><small>SEO＋AI Search 投資決策儀表板</small></span></a><button className="save-button" type="button" onClick={() => setCreating(true)}>＋ 建立新專案</button></header>
    <Sidebar active="projects" reviewMode />
    <div className="workspace sidebar-workspace project-management">
      <section className="project-heading"><div><p className="kicker">PROJECT MANAGEMENT</p><h1>專案管理</h1><p>每個客戶的報告、網站類型、評估分數與執行資料都會獨立保存。</p></div><button className="save-button" type="button" onClick={() => setCreating(true)}>＋ 建立新專案</button></section>
      {error && <div className="project-error" role="alert">{error}</div>}
      <section className="backup-center panel">
        <div className="backup-center-head"><div><p className="kicker">BACKUP CENTER</p><h2>備份中心</h2><p>三種備份用途不同：網站搬家、版本回復，以及專案資料保存。</p></div><span className="backup-note">完整備份＝版本備份＋資料備份</span></div>
        <div className="backup-grid">
          <article className="backup-card backup-card-full"><div className="backup-card-top"><span className="backup-icon">▣</span><span className="backup-tag">網站搬家</span></div><h3>完整備份</h3><p>整合網站原始碼、網站設定與專案資料，適合交給其他 AI 或搬移到新的平台。</p><small>包含：網站版本＋資料備份＋匯入說明</small><button className="backup-action" type="button" disabled>需整合後匯出</button></article>
          <article className="backup-card backup-card-version"><div className="backup-card-top"><span className="backup-icon">↶</span><span className="backup-tag">網站回復</span></div><h3>版本備份</h3><p>下載目前時間點的網站原始碼與設定，日後可以交給 AI 或開發者回復網站。</p><small>目前版本備份包含網站程式、資料庫結構與匯入說明</small><a className="backup-action backup-action-link" href="/backups/kevin-seo-dashboard-version-backup.zip" download>下載 ZIP 版本備份</a></article>
          <article className="backup-card backup-card-data"><div className="backup-card-top"><span className="backup-icon">⇩</span><span className="backup-tag">資料保存</span></div><h3>資料備份</h3><p>匯出目前專案的評估資料、分數、設定、漏斗內容與權限設定。</p><small>請從下方專案卡片下載指定專案</small><button className="backup-action" type="button" onClick={focusProjectList} disabled={!projects.length}>選擇專案下載</button></article>
        </div>
        <p className="backup-help">完整備份是網站搬移用途；版本備份是網站回復用途；資料備份則是保存目前各客戶專案內容。</p>
      </section>
      {creating && <form className="new-project-form panel" onSubmit={createProject}>
        <div className="settings-head"><div><p className="kicker">NEW PROJECT</p><h2>建立獨立專案</h2><p>建立後會自動切換到新專案的資料設定頁。</p></div><button type="button" className="dialog-close inline-close" onClick={() => setCreating(false)} aria-label="取消建立">×</button></div>
        <div className="project-form-grid">
          <label><span>客戶／品牌名稱 *</span><input required value={form.clientName} onChange={event => setForm({ ...form, clientName: event.target.value })} placeholder="例如：勝新冷凍空調" /></label>
          <label><span>專案名稱</span><input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} placeholder="留白將自動產生" /></label>
          <label className="wide"><span>客戶官網</span><input type="url" value={form.websiteUrl} onChange={event => setForm({ ...form, websiteUrl: event.target.value })} placeholder="https://www.example.com" /></label>
          <label><span>商業模式</span><select value={form.businessType} onChange={event => setForm({ ...form, businessType: event.target.value })}><option>B2B</option><option>B2C</option><option>其他</option></select></label>
          <label><span>網站類型</span><select value={form.siteMode} onChange={event => setForm({ ...form, siteMode: event.target.value })}><option value="A">A｜現有網站優化</option><option value="B">B｜全新網站（新網域）</option><option value="C">C｜全新網站（舊網域）</option></select></label>
        </div>
        <div className="settings-save"><small>評估項目會使用系統預設範本，之後可在 Kevin 審核模式調整。</small><button className="save-button" type="submit">建立並前往設定</button></div>
      </form>}
      <section className="project-list" aria-live="polite">
        {loading ? <div className="project-empty">正在載入專案…</div> : projects.length === 0 ? <div className="project-empty">尚未建立專案。</div> : projects.map(project => <article key={project.id}>
          <div className="project-avatar">{project.clientName.slice(0, 1).toUpperCase()}</div>
          <div className="project-info"><div><h2>{project.clientName}</h2><span>{project.status}</span></div><p>{project.name}</p><small>{project.websiteUrl || "尚未設定官網"}</small></div>
          <dl><div><dt>商業模式</dt><dd>{project.businessType}</dd></div><div><dt>網站類型</dt><dd>{project.siteMode}｜{modeNames[project.siteMode]}</dd></div><div><dt>評估報告</dt><dd>{project.reportName || "尚未上傳"}</dd></div><div><dt>最近更新</dt><dd>{project.updatedAt.slice(0, 10)}</dd></div></dl>
          <div className="project-actions"><button className="open-project" type="button" onClick={() => openProject(project.id)}>開啟專案</button><button className="backup-project" type="button" onClick={() => downloadDataBackup(project)}>資料備份</button>{project.id !== "mobellio-v1" && <button className="archive-project" type="button" onClick={() => archiveProject(project)}>封存</button>}</div>
        </article>)}
      </section>
    </div>
  </main>;
}
