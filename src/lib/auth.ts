import jwt from "jsonwebtoken";
import { type ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { getDb } from "@/lib/db";

const JWT_SECRET = process.env.JWT_SECRET || "tusk-dev-secret-change-in-production";

/**
 * Creates a signed JWT containing the given userId, valid for 7 days.
 */
export function signToken(userId: string): string {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

/**
 * Verifies a JWT and returns the decoded payload, or null if invalid/expired.
 */
export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    return { userId: payload.userId };
  } catch {
    return null;
  }
}

/**
 * Reads the "token" cookie, verifies it, looks up the user in the database,
 * and returns the session (userId + user info) or null.
 */
export function getSession(
  cookieStore: ReadonlyRequestCookies
): { userId: string; user: { id: string; name: string; email: string } } | null {
  const tokenCookie = cookieStore.get("token");
  if (!tokenCookie) return null;

  const payload = verifyToken(tokenCookie.value);
  if (!payload) return null;

  const db = getDb();
  const row = db
    .prepare("SELECT id, name, email FROM users WHERE id = ?")
    .get(payload.userId) as { id: string; name: string; email: string } | undefined;

  if (!row) return null;

  return {
    userId: row.id,
    user: { id: row.id, name: row.name, email: row.email },
  };
}

/**
 * Same as getSession but throws an error if the user is not authenticated.
 */
export function requireSession(
  cookieStore: ReadonlyRequestCookies
): { userId: string; user: { id: string; name: string; email: string } } {
  const session = getSession(cookieStore);
  if (!session) {
    throw new Error("Not authenticated");
  }
  return session;
}
