import { and, desc, eq, isNull } from "drizzle-orm";
import { getDb } from "../../../db";
import { projectViewers, projects } from "../../../db/schema";
import { currentAccess } from "../../lib/collaborator-auth";

const defaultProject = {
  id: "mobellio-v1",
  name: "Mobellio SEO 投資評估",
  clientName: "Mobellio",
  websiteUrl: "https://www.mobellio.com/zh-tw/home",
  businessType: "B2B",
  siteMode: "A",
  status: "評估中",
  reportName: "Mobellio SEO＋AI Search 初步評估報告",
  assessmentDate: "2026-08-08",
};

function message(error: unknown) {
  return error instanceof Error ? error.message : "專案資料暫時無法使用";
}

export async function GET() {
  try {
    const access = await currentAccess();
    if (!access) return Response.json({ error: "請先登入查看專案" }, { status: 401 });
    const db = getDb();
    let rows = access.kind === "owner"
      ? await db.select().from(projects).where(isNull(projects.archivedAt)).orderBy(desc(projects.updatedAt))
      : await db.select({ id: projects.id, name: projects.name, clientName: projects.clientName, websiteUrl: projects.websiteUrl, businessType: projects.businessType, siteMode: projects.siteMode, status: projects.status, reportName: projects.reportName, assessmentDate: projects.assessmentDate, dashboardData: projects.dashboardData, createdAt: projects.createdAt, updatedAt: projects.updatedAt, archivedAt: projects.archivedAt }).from(projects).innerJoin(projectViewers, eq(projectViewers.projectId, projects.id)).where(and(eq(projectViewers.accountId, access.accountId), isNull(projects.archivedAt))).orderBy(desc(projects.updatedAt));
    if (rows.length === 0 && access.kind === "owner") {
      await db.insert(projects).values(defaultProject).onConflictDoNothing();
      rows = await db.select().from(projects).where(isNull(projects.archivedAt)).orderBy(desc(projects.updatedAt));
    }
    return Response.json({ projects: rows });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if ((await currentAccess())?.kind !== "owner") return Response.json({ error: "只有 Kevin 可以建立專案" }, { status: 403 });
    const payload = (await request.json()) as Record<string, unknown>;
    const clientName = String(payload.clientName ?? "").trim();
    const name = String(payload.name ?? "").trim() || `${clientName} SEO 投資評估`;
    const websiteUrl = String(payload.websiteUrl ?? "").trim();
    const businessType = ["B2B", "B2C", "其他"].includes(String(payload.businessType)) ? String(payload.businessType) : "B2B";
    const siteMode = ["A", "B", "C"].includes(String(payload.siteMode)) ? String(payload.siteMode) : "A";
    if (!clientName) return Response.json({ error: "請輸入客戶或品牌名稱" }, { status: 400 });
    if (websiteUrl) {
      try { new URL(websiteUrl); } catch { return Response.json({ error: "請輸入完整且正確的官網網址" }, { status: 400 }); }
    }
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const [project] = await getDb().insert(projects).values({ id, name, clientName, websiteUrl, businessType, siteMode, assessmentDate: now.slice(0, 10), updatedAt: now }).returning();
    return Response.json({ project }, { status: 201 });
  } catch (error) {
    return Response.json({ error: message(error) }, { status: 500 });
  }
}
