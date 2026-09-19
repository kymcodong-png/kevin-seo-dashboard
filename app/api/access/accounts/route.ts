import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { collaboratorAccounts, projectViewers } from "../../../../db/schema";
import { currentAccess, hashPassword } from "../../../lib/collaborator-auth";

function deny() { return Response.json({ error: "只有 Kevin 可以管理權限" }, { status: 403 }); }
export async function GET(request: Request) {
  if ((await currentAccess())?.kind !== "owner") return deny();
  const projectId = new URL(request.url).searchParams.get("projectId");
  const rows = await getDb().select({ id: collaboratorAccounts.id, name: collaboratorAccounts.name, email: collaboratorAccounts.email, status: collaboratorAccounts.status, projectId: projectViewers.projectId }).from(collaboratorAccounts).leftJoin(projectViewers, eq(projectViewers.accountId, collaboratorAccounts.id));
  const assigned = new Set(rows.filter(row => projectId && row.projectId === projectId).map(row => row.id));
  const accounts = rows.filter((row, index, all) => all.findIndex(item => item.id === row.id) === index).map(row => ({ id: row.id, name: row.name, email: row.email, status: row.status, assigned: assigned.has(row.id) }));
  return Response.json({ accounts });
}
export async function POST(request: Request) {
  if ((await currentAccess())?.kind !== "owner") return deny();
  try {
    const body = await request.json() as { name?: string; email?: string; password?: string; projectId?: string };
    const name = String(body.name || "").trim(); const email = String(body.email || "").trim().toLowerCase(); const password = String(body.password || ""); const projectId = String(body.projectId || "");
    if (!name || !email || !projectId) return Response.json({ error: "請填寫姓名、Email 與專案" }, { status: 400 });
    const db = getDb(); const [existing] = await db.select().from(collaboratorAccounts).where(eq(collaboratorAccounts.email, email)).limit(1); const hashed = await hashPassword(password); let account = existing;
    if (account) { if (password && password.length < 8) return Response.json({ error: "密碼至少需要 8 碼" }, { status: 400 }); [account] = password ? await db.update(collaboratorAccounts).set({ name, passwordHash: hashed.hash, passwordSalt: hashed.salt, status: "active", updatedAt: new Date().toISOString() }).where(eq(collaboratorAccounts.id, account.id)).returning() : await db.update(collaboratorAccounts).set({ name, status: "active", updatedAt: new Date().toISOString() }).where(eq(collaboratorAccounts.id, account.id)).returning(); }
    else if (password.length < 8) return Response.json({ error: "新帳號密碼至少需要 8 碼" }, { status: 400 });
    else { [account] = await db.insert(collaboratorAccounts).values({ id: crypto.randomUUID(), name, email, passwordHash: hashed.hash, passwordSalt: hashed.salt }).returning(); }
    await db.insert(projectViewers).values({ id: crypto.randomUUID(), projectId, accountId: account.id }).onConflictDoNothing();
    return Response.json({ account: { id: account.id, name: account.name, email: account.email, status: account.status } }, { status: existing ? 200 : 201 });
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "帳號建立失敗" }, { status: 500 }); }
}
