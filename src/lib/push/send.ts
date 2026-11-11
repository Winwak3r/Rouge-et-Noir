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
    // Le message rejoint la file de l'appareil : chaque « réveil » affiche le suivant
    await prisma.pushMessage.create({
      data: { subscriptionId: sub.id, title: text.title, body: text.body, url: text.url ?? "/", tag: text.tag ?? "rn", icon: text.icon ?? null },
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
  return deliver([{ id: subId, endpoint }], { ...TEST_MESSAGE, tag: `test-${Date.now()}` });
}

/** Message suivant de la file de l'appareil, demandé par le service worker après un « réveil ». */
export async function messageForEndpoint(endpoint: string, now = new Date()): Promise<PushText> {
  const sub = await prisma.pushSubscription.findUnique({ where: { endpoint } });
  if (!sub) return GENERIC_MESSAGE;
  const next = await prisma.pushMessage.findFirst({
    where: { subscriptionId: sub.id, deliveredAt: null, createdAt: { gte: new Date(now.getTime() - 30 * 60_000) } },
    orderBy: { createdAt: "asc" },
  });
  if (!next) return GENERIC_MESSAGE;
  await prisma.pushMessage.update({ where: { id: next.id }, data: { deliveredAt: now } });
  // ménage : messages remis depuis plus d'un jour
  await prisma.pushMessage.deleteMany({ where: { subscriptionId: sub.id, deliveredAt: { lt: new Date(now.getTime() - 24 * 3600_000) } } });
  return { title: next.title, body: next.body, url: next.url, tag: next.tag, icon: next.icon };
}

/**
 * Notification de match envoyée UNE fois par joueur (but, mi-temps, veille, cotes…).
 * `pref` : réglage du joueur à respecter ; `userIds` : destinataires précis (sinon tous les joueurs actifs).
 */
export async function notifyOnce(opts: {
  matchId: string;
  kind: string;
  text: PushText;
  pref: "live" | "prematch";
  userIds?: string[];
}): Promise<number> {
  if (!vapidFromEnv()) return 0;
  const subs = await prisma.pushSubscription.findMany({
    where: {
      user: { isActive: true, ...(opts.pref === "live" ? { pushLive: true } : { pushPrematch: true }) },
      ...(opts.userIds ? { userId: { in: opts.userIds } } : {}),
    },
    select: { id: true, userId: true, endpoint: true },
  });
  if (subs.length === 0) return 0;
  const already = new Set(
    (await prisma.pushEvent.findMany({ where: { matchId: opts.matchId, kind: opts.kind }, select: { userId: true } })).map((x) => x.userId),
  );
  const users = [...new Set(subs.map((x) => x.userId))].filter((u) => !already.has(u));
  if (users.length === 0) return 0;
  // réservé d'abord : jamais de doublon, même si deux synchros se croisent
  await prisma.pushEvent.createMany({ data: users.map((userId) => ({ userId, matchId: opts.matchId, kind: opts.kind })), skipDuplicates: true });
  const r = await deliver(subs.filter((x) => users.includes(x.userId)), opts.text);
  return r.sent;
}


/** Notification de test vers TOUS les appareils d'un joueur, sans aucune règle d'envoi (administration). */
export async function sendToUser(userId: string, text: PushText): Promise<PushReport> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId }, select: { id: true, endpoint: true } });
  if (subs.length === 0) return { sent: 0, failed: 0, removed: 0, skipped: "aucun appareil abonné" };
  return deliver(subs, text);
}
