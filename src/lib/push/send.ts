// Envoi des notifications : message de l'admin, test, rappels automatiques avant les matchs.
import { prisma } from "@/lib/db";
import { canEditPrediction, lockTime } from "@/lib/scoring/engine";
import { GENERIC_MESSAGE, TEST_MESSAGE, reminderDue, reminderText, type PushText } from "./messages";
import { sendPush, vapidFromEnv } from "./webpush";

export interface PushReport {
  sent: number;
  failed: number;
  removed: number;
  skipped?: string;
}

/** Dépose le texte sur chaque appareil puis envoie le « réveil ». Les abonnements expirés sont supprimés. */
async function deliver(subs: Array<{ id: string; endpoint: string }>, text: PushText): Promise<PushReport> {
  const vapid = vapidFromEnv();
  if (!vapid) return { sent: 0, failed: 0, removed: 0, skipped: "clés VAPID non configurées" };
  let sent = 0;
  let failed = 0;
  let removed = 0;
  for (const sub of subs) {
    await prisma.pushSubscription.update({
      where: { id: sub.id },
      data: { pendingTitle: text.title, pendingBody: text.body, pendingUrl: text.url, pendingAt: new Date() },
    });
    try {
      const r = await sendPush(sub.endpoint, vapid);
      if (r.gone) {
        await prisma.pushSubscription.deleteMany({ where: { id: sub.id } });
        removed++;
      } else if (r.status >= 200 && r.status < 300) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { sent, failed, removed };
}

/** Message de l'administrateur à tous les joueurs actifs abonnés. */
export async function broadcastPush(title: string, body: string): Promise<PushReport> {
  const subs = await prisma.pushSubscription.findMany({ where: { user: { isActive: true } }, select: { id: true, endpoint: true } });
  return deliver(subs, { title, body, url: "/", tag: "message" });
}

/** Message à un seul joueur (test de l'admin). */
export async function broadcastPushTo(userId: string, title: string, body: string): Promise<PushReport> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId }, select: { id: true, endpoint: true } });
  return deliver(subs, { title, body, url: "/", tag: "message" });
}

/** Rappels : 1 h avant le verrouillage, aux joueurs abonnés qui n'ont pas pronostiqué. Un seul rappel par match. */
export async function sendReminders(now = new Date()): Promise<PushReport> {
  if (!vapidFromEnv()) return { sent: 0, failed: 0, removed: 0, skipped: "clés VAPID non configurées" };
  const soon = await prisma.match.findMany({
    where: { status: "SCHEDULED", kickoffAt: { gt: now, lte: new Date(now.getTime() + 2 * 3600_000) } },
    include: { homeTeam: true, awayTeam: true },
  });
  const total: PushReport = { sent: 0, failed: 0, removed: 0 };
  for (const m of soon) {
    const lockAt = lockTime(m);
    if (!canEditPrediction(m, now) || !reminderDue(lockAt, now)) continue;
    const [subs, predicted, already] = await Promise.all([
      prisma.pushSubscription.findMany({ where: { user: { isActive: true } }, select: { id: true, userId: true, endpoint: true } }),
      prisma.prediction.findMany({ where: { matchId: m.id }, select: { userId: true } }),
      prisma.pushSent.findMany({ where: { matchId: m.id }, select: { userId: true } }),
    ]);
    const skip = new Set([...predicted, ...already].map((x) => x.userId));
    const byUser = new Map<string, typeof subs>();
    for (const s of subs) if (!skip.has(s.userId)) byUser.set(s.userId, [...(byUser.get(s.userId) ?? []), s]);
    for (const [userId, userSubs] of byUser) {
      try {
        await prisma.pushSent.create({ data: { userId, matchId: m.id } }); // réservé d'abord : jamais de doublon
      } catch {
        continue;
      }
      const r = await deliver(userSubs, reminderText({ home: m.homeTeam.name, away: m.awayTeam.name, lockAt, now, matchId: m.id }));
      total.sent += r.sent;
      total.failed += r.failed;
      total.removed += r.removed;
      if (r.sent === 0 && r.failed > 0) await prisma.pushSent.deleteMany({ where: { userId, matchId: m.id } }); // nouvel essai
    }
  }
  return total;
}

/** Notification de test vers un appareil du joueur. */
export async function sendTest(subId: string, endpoint: string): Promise<PushReport> {
  await prisma.pushSubscription.update({ where: { id: subId }, data: { testAt: new Date() } });
  return deliver([{ id: subId, endpoint }], TEST_MESSAGE);
}

/** Texte demandé par le service worker après un « réveil » (puis effacé). */
export async function messageForEndpoint(endpoint: string, now = new Date()): Promise<PushText> {
  const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  if (!sub) return GENERIC_MESSAGE;
  if (sub.pendingAt && now.getTime() - sub.pendingAt.getTime() < 30 * 60_000 && sub.pendingTitle && sub.pendingBody) {
    await prisma.pushSubscription.update({
      where: { id: sub.id },
      data: { pendingTitle: null, pendingBody: null, pendingUrl: null, pendingAt: null, testAt: null },
    });
    return { title: sub.pendingTitle, body: sub.pendingBody, url: sub.pendingUrl ?? "/", tag: "message" };
  }
  return GENERIC_MESSAGE;
}
