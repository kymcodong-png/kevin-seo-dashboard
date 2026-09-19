"use client";

import { useEffect, useState } from "react";

type SidebarProps = {
  active: "home" | "overall" | "market" | "execution" | "outcome" | "blueprint" | "progress" | "results" | "data-fields" | "projects" | "permissions";
  reviewMode?: boolean;
  singleProjectReadonly?: boolean;
  readonlyProjectName?: string;
  sharedToken?: string;
};

const decisionItems = [
  { id: "overall", number: "D01", label: "投資判斷", href: "/overall", type: "investment" },
  { id: "market", number: "D02", label: "市場機會", href: "/market", type: "market" },
  { id: "execution", number: "D03", label: "落地準備", href: "/execution", type: "readiness" },
  { id: "outcome", number: "D04", label: "成果預估", href: "/outcome", type: "outcome" },
] as const;

function DecisionNavIcon({ type }: { type: "investment" | "market" | "readiness" | "outcome" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 4, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 48 48" aria-hidden="true">
    {type === "investment" && <><path {...common} d="M9 34a17 17 0 1 1 30 0" /><path {...common} d="M12 25h4M32 25h4M24 12v4" /><path className="icon-accent" {...common} d="m19 30 11-9-5 13a4 4 0 0 1-6-4Z" /></>}
    {type === "market" && <><circle {...common} cx="22" cy="22" r="13" /><path {...common} d="m31.5 31.5 8 8" /><path className="icon-accent" {...common} d="M15.5 26l5-6 4 3 5-7M27 16h2.5v2.5" /></>}
    {type === "readiness" && <><path {...common} d="M20 8h8l1.5 5a15 15 0 0 1 3.5 2l5-1 4 7-3.5 4a15 15 0 0 1 0 4L42 33l-4 7-5-1a15 15 0 0 1-3.5 2L28 46h-8l-1.5-5a15 15 0 0 1-3.5-2l-5 1-4-7 3.5-4a15 15 0 0 1 0-4L6 21l4-7 5 1a15 15 0 0 1 3.5-2Z" /><path className="icon-accent" {...common} d="m17 27 5 5 10-11" /></>}
    {type === "outcome" && <><circle {...common} cx="24" cy="24" r="17" /><path {...common} d="M24 4v3M44 24h-3M24 44v-3M4 24h3" /><path className="icon-accent" {...common} d="M24 14v11l7 4" /></>}
  </svg>;
}

function ProjectNavIcon({ type }: { type: "blueprint" | "progress" | "results" }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    {type === "blueprint" && <><path {...common} d="M4 6.5 9 4l6 2.5L20 4v13.5L15 20l-6-2.5L4 20Z" /><path {...common} d="M9 4v13.5M15 6.5V20" /><path {...common} d="m11 12 2 2 4-5" /></>}
    {type === "progress" && <><path {...common} d="M12 3a9 9 0 1 1-6.36 2.64" /><path {...common} d="M12 7v5l3 2" /><path {...common} d="M3 3v5h5" /></>}
    {type === "results" && <><path {...common} d="M7 3h10v4h3v14H4V7h3Z" /><path {...common} d="M9 3h6v4H9Z" /><path {...common} d="m8 14 3 3 6-7" /></>}
  </svg>;
}

function HomeNavIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9" /><path d="M10 20v-7h4v7" />
  </svg>;
}

function AccessNavIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c.7-3.4 3.2-5.5 7-5.5s6.3 2.1 7 5.5" />
  </svg>;
}

function sharedHref(sharedToken: string | undefined, href: string) {
  if (!sharedToken) return href;
  const section = href === "/" ? "home" : href.slice(1);
  return `/shared/${sharedToken}${section === "home" ? "" : `?section=${section}`}`;
}

export default function Sidebar({ active, reviewMode = false, singleProjectReadonly = false, readonlyProjectName = "", sharedToken }: SidebarProps) {
  const [projectList, setProjectList] = useState<Array<{ id: string; clientName: string; siteMode: string; businessType: string }>>([]);
  const [activeProjectId, setActiveProjectId] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [viewerAccess, setViewerAccess] = useState(false);
  const [ownerAccess, setOwnerAccess] = useState(false);

  useEffect(() => {
    fetch("/api/projects").then(response => response.json()).then(data => {
      const items = Array.isArray(data.projects) ? data.projects : [];
      setProjectList(items);
      const saved = window.localStorage.getItem("kevin-active-project-id");
      const selected = items.some((item: { id: string }) => item.id === saved) ? saved : items[0]?.id;
      if (selected) {
        setActiveProjectId(selected);
        window.localStorage.setItem("kevin-active-project-id", selected);
      }
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    setCollapsed(window.localStorage.getItem("kevin-sidebar-collapsed") === "true");
    fetch("/api/auth/me").then(response => response.ok ? response.json() : null).then(data => { setViewerAccess(data?.access?.kind === "viewer"); setOwnerAccess(data?.access?.kind === "owner"); }).catch(() => undefined);
  }, []);

  function switchProject(id: string) {
    setActiveProjectId(id);
    window.localStorage.setItem("kevin-active-project-id", id);
    window.location.reload();
  }

  function toggleSidebar() {
    setCollapsed(value => {
      const next = !value;
      window.localStorage.setItem("kevin-sidebar-collapsed", String(next));
      return next;
    });
  }

  return (
    <aside className={`main-sidebar ${collapsed ? "collapsed" : ""} ${reviewMode ? "review-mode" : "client-mode"}`} aria-label="主要功能選單">
      <button className="sidebar-collapse" type="button" onClick={toggleSidebar} aria-label={collapsed ? "展開功能選單" : "收合功能選單"} title={collapsed ? "展開功能選單" : "收合功能選單"}>{collapsed ? "›" : "‹"}</button>
      <div className={`project-picker ${singleProjectReadonly ? "readonly-project-picker" : ""}`}>
        <span>目前專案</span>
        {singleProjectReadonly ? <div className="readonly-project-name">{readonlyProjectName || "目前專案"}<small>單一專案・唯讀</small></div> : <div className="project-select-wrap">
          <select value={activeProjectId} onChange={event => switchProject(event.target.value)} aria-label="切換目前專案">
            {projectList.length === 0 && <option>載入專案中</option>}
            {projectList.map(project => <option value={project.id} key={project.id}>{project.clientName}｜{project.siteMode} 類｜{project.businessType || "其他"}</option>)}
          </select>
        </div>}
      </div>
      <nav>
        <section className="sidebar-group sidebar-group-decision" aria-label="決策評估">
          <p>決策評估</p>
          <a className={active === "home" ? "active" : ""} href={sharedHref(sharedToken, "/")}><span className="sidebar-home-icon"><HomeNavIcon /></span><b><em>DM</em>決策首頁</b></a>
          {decisionItems.map((item) => <a className={active === item.id ? "active" : ""} href={sharedHref(sharedToken, item.href)} key={item.id}><span className="sidebar-decision-icon"><DecisionNavIcon type={item.type} /></span><b><em>{item.number}</em>{item.label}</b></a>)}
        </section>
        {!singleProjectReadonly && <section className="sidebar-group sidebar-group-execution" aria-label="專案執行">
          <p>專案執行</p>
          <a className={active === "blueprint" ? "active" : ""} href="/blueprint"><span className="sidebar-line-icon"><ProjectNavIcon type="blueprint" /></span><b><em>P01</em>執行藍圖</b></a>
          <a className={active === "progress" ? "active" : ""} href="/progress"><span className="sidebar-line-icon"><ProjectNavIcon type="progress" /></span><b><em>P02</em>進度追蹤</b></a>
          <a className={active === "results" ? "active" : ""} href="/results"><span className="sidebar-line-icon"><ProjectNavIcon type="results" /></span><b><em>P03</em>成果驗證</b></a>
        </section>}
        {!singleProjectReadonly && ownerAccess && <section className="sidebar-group sidebar-group-tools" aria-label="管理工具">
          <p>管理工具</p>
          <a className={active === "projects" ? "active" : ""} href="/projects"><span>＋</span><b><em>M01</em>專案管理</b></a>
          <a className={active === "data-fields" ? "active" : ""} href="/data-fields"><span>⚙</span><b><em>M02</em>資料設定</b></a>
          <a className={active === "permissions" ? "active" : ""} href="/permissions"><span className="sidebar-line-icon"><AccessNavIcon /></span><b><em>M03</em>權限管理</b></a>
        </section>}
      </nav>
      <div className="sidebar-access"><span className={singleProjectReadonly || viewerAccess ? "published" : reviewMode ? "review" : "published"} /><div><b>{singleProjectReadonly ? "單一專案｜純瀏覽" : viewerAccess ? "合作窗口｜純瀏覽" : reviewMode ? "Kevin 審核模式" : "客戶發布預覽"}</b><small>{singleProjectReadonly ? "僅顯示目前連結專案" : viewerAccess ? "僅顯示被授權專案" : reviewMode ? "可查看評估參數" : "隱藏評分參數"}</small></div></div>
    </aside>
  );
}
