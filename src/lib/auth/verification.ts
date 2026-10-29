// Confirmation d'adresse e-mail : création et envoi du lien, validation.
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { appUrl, sendEmail } from "@/lib/email";
import { changeEmailConfirm, emailChangedNotice, verifyEmail } from "@/lib/mail-templates";

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const VALIDITY_MS = 48 * 3600_000;

export async function sendVerificationEmail(user: { id: string; email: string; pseudo: string }): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await prisma.emailToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + VALIDITY_MS) },
  });
  await sendEmail({ to: user.email, ...verifyEmail({ pseudo: user.pseudo, link: appUrl(`/verifier-email?token=${token}`) }) });
}

/** Changement d'adresse : lien envoyé à la NOUVELLE adresse ; l'ancienne reste valable jusqu'à la confirmation. */
export async function sendEmailChangeLink(user: { id: string; pseudo: string }, newEmail: string): Promise<void> {
  const token = randomBytes(32).toString("base64url");
  await prisma.emailToken.deleteMany({ where: { userId: user.id, newEmail: { not: null }, usedAt: null } });
  await prisma.emailToken.create({
    data: { userId: user.id, tokenHash: sha256(token), newEmail, expiresAt: new Date(Date.now() + VALIDITY_MS) },
  });
  await sendEmail({ to: newEmail, ...changeEmailConfirm({ pseudo: user.pseudo, newEmail, link: appUrl(`/verifier-email?token=${token}`) }) });
}

/** Valide un lien : renvoie le joueur si c'est bon, null sinon. */
export async function confirmEmailToken(token: string) {
  if (!token) return null;
  const row = await prisma.emailToken.findUnique({ where: { tokenHash: sha256(token) }, include: { user: true } });
  if (!row || row.usedAt || row.expiresAt < new Date()) return null;

  if (row.newEmail) {
    // Changement d'adresse : refusé si elle a été prise entre-temps par un autre compte
    const taken = await prisma.user.findFirst({ where: { email: row.newEmail, id: { not: row.userId } } });
    if (taken) return null;
    const oldEmail = row.user.email;
    await prisma.$transaction([
      prisma.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
      prisma.user.update({ where: { id: row.userId }, data: { email: row.newEmail, emailVerifiedAt: new Date() } }),
    ]);
    await sendEmail({ to: oldEmail, ...emailChangedNotice({ pseudo: row.user.pseudo, newEmail: row.newEmail }) }).catch(() => undefined);
    const user = await prisma.user.findUnique({ where: { id: row.userId } });
    return user ? { user, kind: "change" as const } : null;
  }

  await prisma.$transaction([
    prisma.emailToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.user.update({ where: { id: row.userId }, data: { emailVerifiedAt: row.user.emailVerifiedAt ?? new Date() } }),
    prisma.emailToken.deleteMany({ where: { userId: row.userId, usedAt: null, newEmail: null } }),
  ]);
  const user = await prisma.user.findUnique({ where: { id: row.userId } });
  return user ? { user, kind: "verify" as const } : null;
}
