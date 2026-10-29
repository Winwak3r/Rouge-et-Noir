// Rappels par e-mail : 2 h avant le verrouillage, aux joueurs sans pronostic (adresse confirmée, rappels activés).
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { formatDateTime } from "@/lib/dates";
import { appUrl, sendEmail } from "@/lib/email";
import { emailReminderDue, reminderEmail } from "@/lib/mail-templates";
import { canEditPrediction, lockTime } from "@/lib/scoring/engine";

export const EMAIL_REMINDERS_SETTING = "email_reminders_enabled";

export async function emailRemindersEnabled(): Promise<boolean> {
  const row = await prisma.appSetting.findUnique({ where: { key: EMAIL_REMINDERS_SETTING } });
  return row ? row.value === true : true; // activés par défaut
}

/**
 * Envoie les rappels dus. `matchId` + `force` : envoi immédiat pour ce match (bouton de l'admin),
 * même hors de la fenêtre des 2 h. Un joueur ne reçoit jamais deux fois le rappel d'un même match.
 */
export async function sendEmailReminders(opts: { now?: Date; matchId?: string; force?: boolean } = {}): Promise<{ sent: number; failed: number }> {
  const now = opts.now ?? new Date();
  const matches = await prisma.match.findMany({
    where: opts.matchId
      ? { id: opts.matchId }
      : { status: "SCHEDULED", simulation: { equals: Prisma.AnyNull }, kickoffAt: { gt: now, lte: new Date(now.getTime() + 3 * 3600_000) } },
    include: { homeTeam: true, awayTeam: true },
  });
  let sent = 0;
  let failed = 0;
  for (const m of matches) {
    const lockAt = lockTime(m);
    if (!canEditPrediction(m, now)) continue;
    if (!opts.force && !emailReminderDue(lockAt, now)) continue;
    const [users, predicted, already] = await Promise.all([
      prisma.user.findMany({
        where: { isActive: true, emailReminders: true, emailVerifiedAt: { not: null } },
        select: { id: true, pseudo: true, email: true },
      }),
      prisma.prediction.findMany({ where: { matchId: m.id }, select: { userId: true } }),
      prisma.emailSent.findMany({ where: { matchId: m.id }, select: { userId: true } }),
    ]);
    const skip = new Set([...predicted, ...already].map((x) => x.userId));
    for (const u of users.filter((x) => !skip.has(x.id))) {
      try {
        await prisma.emailSent.create({ data: { userId: u.id, matchId: m.id } }); // réservé d'abord : jamais de doublon
      } catch {
        continue;
      }
      try {
        await sendEmail({
          to: u.email,
          ...reminderEmail({
            pseudo: u.pseudo,
            home: m.homeTeam.name,
            away: m.awayTeam.name,
            deadline: formatDateTime(lockAt),
            link: appUrl(`/#match-${m.id}`),
            settingsLink: appUrl("/compte"),
          }),
        });
        sent++;
      } catch {
        failed++;
        await prisma.emailSent.deleteMany({ where: { userId: u.id, matchId: m.id } }); // nouvel essai plus tard
      }
    }
  }
  return { sent, failed };
}
