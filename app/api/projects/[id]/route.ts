import { eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { projects } from "../../../../db/schema";
import { currentAccess, viewerCanAccessProject } from "../../../lib/collaborator-auth";

function message(error: unknown) {
  return error instanceof Error ? error.message : "專案資料暫時無法使用";
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const access = await currentAccess();
    if (!access || (access.kind === "viewer" && !(await viewerCanAccessProject(access.accountId, id)))) return Response.json({ error: "你沒有查看這個專案的權限" }, { status: 403 });
    const [project] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!project || project.archivedAt) return Response.json({ error: "找不到這個專案" }, { status: 404 });
    return Response.json({ project });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if ((await currentAccess())?.kind !== "owner") return Response.json({ error: "只有 Kevin 可以修改專案" }, { status: 403 });
    const payload = (await request.json()) as Record<string, unknown>;
    const update: Record<string, string> = { updatedAt: new Date().toISOString() };
    if (typeof payload.name === "string" && payload.name.trim()) update.name = payload.name.trim();
    if (typeof payload.clientName === "string" && payload.clientName.trim()) update.clientName = payload.clientName.trim();
    if (typeof payload.websiteUrl === "string") update.websiteUrl = payload.websiteUrl.trim();
    if (["B2B", "B2C", "其他"].includes(String(payload.businessType))) update.businessType = String(payload.businessType);
    if (["A", "B", "C"].includes(String(payload.siteMode))) update.siteMode = String(payload.siteMode);
    if (typeof payload.status === "string") update.status = payload.status.trim();
    if (typeof payload.reportName === "string") update.reportName = payload.reportName.trim();
    if (typeof payload.assessmentDate === "string") update.assessmentDate = payload.assessmentDate;
    if (payload.dashboardData && typeof payload.dashboardData === "object") update.dashboardData = JSON.stringify(payload.dashboardData);
    const [project] = await getDb().update(projects).set(update).where(eq(projects.id, id)).returning();
    if (!project) return Response.json({ error: "找不到這個專案" }, { status: 404 });
    return Response.json({ project });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    if ((await currentAccess())?.kind !== "owner") return Response.json({ error: "只有 Kevin 可以封存專案" }, { status: 403 });
    if (id === "mobellio-v1") return Response.json({ error: "Mobellio 範例專案不可封存" }, { status: 400 });
    const [project] = await getDb().update(projects).set({ archivedAt: new Date().toISOString(), updatedAt: new Date().toISOString() }).where(eq(projects.id, id)).returning();
    if (!project) return Response.json({ error: "找不到這個專案" }, { status: 404 });
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
