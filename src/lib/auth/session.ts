import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { prisma } from "@/lib/db";
import { SESSION_COOKIE, SESSION_MAX_AGE, readSession, signSession, type Role } from "./token";

export async function createSession(user: { id: string; role: Role; sessionVersion: number }) {
  const token = await signSession({ sub: user.id, role: user.role, v: user.sessionVersion });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Utilisateur connecté, revérifié en base à chaque requête (compte actif, mot de passe inchangé). */
export const getCurrentUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const session = await readSession(token);
  if (!session) return null;
  const user = await prisma.user.findUnique({
    where: { id: session.sub },
    select: {
      id: true,
      pseudo: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      sessionVersion: true,
      avatarUpdatedAt: true,
      emailVerifiedAt: true,
      emailReminders: true,
      activeLeagueId: true,
      tutorialDoneAt: true,
    },
  });
  if (!user || !user.isActive || user.sessionVersion !== session.v) return null;
  return user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/connexion");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
