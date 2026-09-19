import { eq, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getDb } from "../../../db";
import { projects } from "../../../db/schema";
import SharedDashboard from "../shared-dashboard";

export default async function SharedProjectPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const rows = await getDb().select().from(projects).where(isNull(projects.archivedAt));
  const now = new Date();
  const project = rows.find(item => { try { const data = JSON.parse(item.dashboardData || "{}"); return Array.isArray(data.permissionConfig?.shareLinks) && data.permissionConfig.shareLinks.some((link: { token?: string; active?: boolean; expiresAt?: string }) => link.token === token && link.active && (!link.expiresAt || new Date(`${link.expiresAt}T23:59:59`) >= now)); } catch { return false; } });
  if (!project) notFound();
  let data: Record<string, unknown> = {}; try { data = JSON.parse(project.dashboardData || "{}"); } catch { data = {}; }
  return <SharedDashboard token={token} clientName={project.clientName} name={project.name} reportName={project.reportName} assessmentDate={project.assessmentDate} businessType={project.businessType} websiteUrl={project.websiteUrl} siteMode={project.siteMode} data={data} />;
}
