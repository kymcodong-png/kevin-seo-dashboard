import { and, eq } from "drizzle-orm";
import { getDb } from "../../../../db";
import { collaboratorAccounts } from "../../../../db/schema";
import { createSession, sessionCookieName, verifyPassword } from "../../../lib/collaborator-auth";

export async function POST(request: Request) {
  try {
    const body = await request.json() as { email?: string; password?: string };
    const email = String(body.email || "").trim().toLowerCase(); const password = String(body.password || "");
    if (!email || !password) return Response.json({ error: "請輸入 Email 與密碼" }, { status: 400 });
    const [account] = await getDb().select().from(collaboratorAccounts).where(and(eq(collaboratorAccounts.email, email), eq(collaboratorAccounts.status, "active"))).limit(1);
    if (!account || !(await verifyPassword(password, account.passwordSalt, account.passwordHash))) return Response.json({ error: "Email 或密碼不正確" }, { status: 401 });
    const session = await createSession(account.id);
    const response = Response.json({ user: { name: account.name, email: account.email } });
    response.headers.append("Set-Cookie", `${sessionCookieName}=${session.token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
    return response;
  } catch (error) { return Response.json({ error: error instanceof Error ? error.message : "登入服務暫時無法使用" }, { status: 500 }); }
}
