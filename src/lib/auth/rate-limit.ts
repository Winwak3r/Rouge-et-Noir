// Limitation des tentatives (connexion, inscription, mot de passe oublié), stockée en base.
import { headers } from "next/headers";
import { prisma } from "@/lib/db";

export const LIMITS = {
  loginPerEmail: { max: 5, windowMs: 15 * 60_000 }, // 5 échecs / 15 min par compte
  loginPerIp: { max: 20, windowMs: 15 * 60_000 }, // 20 échecs / 15 min par adresse IP
  registerPerIp: { max: 5, windowMs: 60 * 60_000 },
  resetPerEmail: { max: 3, windowMs: 60 * 60_000 },
  resetPerIp: { max: 10, windowMs: 60 * 60_000 },
} as const;

export async function clientIp(): Promise<string> {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "inconnue";
}

export async function isLimited(
  key: string,
  limit: { max: number; windowMs: number },
  onlyFailures: boolean,
): Promise<boolean> {
  const count = await prisma.loginAttempt.count({
    where: {
      key,
      createdAt: { gte: new Date(Date.now() - limit.windowMs) },
      ...(onlyFailures ? { success: false } : {}),
    },
  });
  return count >= limit.max;
}

export async function recordAttempt(key: string, success: boolean): Promise<void> {
  await prisma.loginAttempt.create({ data: { key, success } });
}

export async function clearFailures(key: string): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key, success: false } });
}

/** Nettoyage des traces de plus de 24 h (appelé de temps en temps). */
export async function purgeOldAttempts(): Promise<void> {
  await prisma.loginAttempt.deleteMany({
    where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } },
  });
}
