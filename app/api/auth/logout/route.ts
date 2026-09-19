import { cookies } from "next/headers";
import { sessionCookieName } from "../../../lib/collaborator-auth";
export async function POST() {
  const response = Response.json({ success: true });
  response.headers.append("Set-Cookie", `${sessionCookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`);
  return response;
}
