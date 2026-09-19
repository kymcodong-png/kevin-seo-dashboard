import { and, eq, gt } from "drizzle-orm";
import { cookies, headers } from "next/headers";
import { getDb } from "../../db";
import { authSessions, collaboratorAccounts, projectViewers } from "../../db/schema";

const SESSION_COOKIE = "kevin_collaborator_session";
const OWNER_EMAIL = "kymcodong@gmail.com";

function bytesToBase64(bytes: Uint8Array) { return btoa(String.fromCharCode(...bytes)); }
function base64ToBytes(value: string) { return Uint8Array.from(atob(value), char => char.charCodeAt(0)); }
async function digest(value: string) { const data = new TextEncoder().encode(value); return bytesToBase64(new Uint8Array(await crypto.subtle.digest("SHA-256", data))); }

export async function hashPassword(password: string, salt = bytesToBase64(crypto.getRandomValues(new Uint8Array(16)))) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: base64ToBytes(salt), iterations: 100000, hash: "SHA-256" }, key, 256);
  return { salt, hash: bytesToBase64(new Uint8Array(bits)) };
}

export async function verifyPassword(password: string, salt: string, expected: string) { return (await hashPassword(password, salt)).hash === expected; }

export async function currentAccess() {
  const requestHeaders = await headers();
  const ownerEmail = requestHeaders.get("oai-authenticated-user-email")?.toLowerCase();
  if (ownerEmail === OWNER_EMAIL) return { kind: "owner" as const, email: ownerEmail };
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const tokenHash = await digest(token);
  const [row] = await getDb().select({ id: collaboratorAccounts.id, name: collaboratorAccounts.name, email: collaboratorAccounts.email, status: collaboratorAccounts.status }).from(authSessions).innerJoin(collaboratorAccounts, eq(authSessions.accountId, collaboratorAccounts.id)).where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, new Date().toISOString()), eq(collaboratorAccounts.status, "active"))).limit(1);
  return row ? { kind: "viewer" as const, accountId: row.id, name: row.name, email: row.email } : null;
}

export async function viewerCanAccessProject(accountId: string, projectId: string) {
  const [row] = await getDb().select({ id: projectViewers.id }).from(projectViewers).where(and(eq(projectViewers.accountId, accountId), eq(projectViewers.projectId, projectId))).limit(1);
  return Boolean(row);
}

export async function createSession(accountId: string) {
  const token = crypto.randomUUID();
  const tokenHash = await digest(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  await getDb().insert(authSessions).values({ id: crypto.randomUUID(), tokenHash, accountId, expiresAt });
  return { token, expiresAt };
}

export const sessionCookieName = SESSION_COOKIE;
