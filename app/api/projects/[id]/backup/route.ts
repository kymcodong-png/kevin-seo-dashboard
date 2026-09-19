import { eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { projects } from "../../../../../db/schema";
import { currentAccess } from "../../../../lib/collaborator-auth";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    if ((await currentAccess())?.kind !== "owner") return Response.json({ error: "只有 Kevin 可以匯出專案備份" }, { status: 403 });
    const { id } = await context.params;
    const [project] = await getDb().select().from(projects).where(eq(projects.id, id)).limit(1);
    if (!project || project.archivedAt) return Response.json({ error: "找不到這個專案" }, { status: 404 });
    let dashboardData: unknown = {};
    try { dashboardData = JSON.parse(project.dashboardData || "{}"); } catch { dashboardData = { raw: project.dashboardData }; }
    const backup = { backupType: "data", backupTypeName: "資料備份", exportedAt: new Date().toISOString(), project: { ...project, dashboardData }, note: "此檔案保存專案資料，不包含網站原始碼、正式環境密碼或資料庫連線資訊。" };
    const filename = `kevin-seo-data-backup-${project.clientName.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]+/g, "-") || "project"}.json`;
    return new Response(JSON.stringify(backup, null, 2), { headers: { "content-type": "application/json; charset=utf-8", "content-disposition": `attachment; filename="${encodeURIComponent(filename)}"`, "cache-control": "no-store" } });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "備份匯出失敗" }, { status: 500 });
  }
}
