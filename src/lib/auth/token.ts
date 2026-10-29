// Jeton de session signé (JWT HS256). Compatible avec le middleware (Edge) : pas de Prisma ici.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "rn_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 jours

export type Role = "PARTICIPANT" | "ADMIN";

export interface SessionPayload {
  sub: string;
  role: Role;
  v: number; // sessionVersion
}

function sessionKey(): Uint8Array {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET manquant ou trop court (32 caractères minimum).");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(p: SessionPayload): Promise<string> {
  return new SignJWT({ role: p.role, v: p.v })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(p.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(sessionKey());
}

export async function readSession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey(), { algorithms: ["HS256"] });
    if (typeof payload.sub !== "string") return null;
    return {
      sub: payload.sub,
      role: payload.role === "ADMIN" ? "ADMIN" : "PARTICIPANT",
      v: typeof payload.v === "number" ? payload.v : -1,
    };
  } catch {
    return null;
  }
}
