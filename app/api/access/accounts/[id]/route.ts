import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../../db";
import { collaboratorAccounts, projectViewers } from "../../../../../db/schema";
import { currentAccess, hashPassword } from "../../../../lib/collaborator-auth";

function deny() { return Response.json({ error: "只有 Kevin 可以管理權限" }, { status: 403 }); }
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if ((await currentAccess())?.kind !== "owner") return deny();
  const { id } = await context.params; const projectId = new URL(request.url).searchParams.get("projectId");
  if (!projectId) return Response.json({ error: "缺少專案" }, { status: 400 });
  await getDb().delete(projectViewers).where(and(eq(projectViewers.accountId, id), eq(projectViewers.projectId, projectId)));
  return Response.json({ success: true });
}
export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  if ((await currentAccess())?.kind !== "owner") return deny();
  const { id } = await context.params; const body = await request.json() as { password?: string; name?: string; status?: string };
  const update: Record<string, string> = { updatedAt: new Date().toISOString() };
  if (body.name?.trim()) update.name = body.name.trim(); if (body.status === "active" || body.status === "disabled") update.status = body.status;
  if (body.password) { if (body.password.length < 8) return Response.json({ error: "密碼至少需要 8 碼" }, { status: 400 }); const hashed = await hashPassword(body.password); update.passwordHash = hashed.hash; update.passwordSalt = hashed.salt; }
  const [account] = await getDb().update(collaboratorAccounts).set(update).where(eq(collaboratorAccounts.id, id)).returning();
  return account ? Response.json({ account: { id: account.id, name: account.name, email: account.email, status: account.status } }) : Response.json({ error: "找不到帳號" }, { status: 404 });
}
