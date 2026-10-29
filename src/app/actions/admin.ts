"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { nextVersion, validateAnnouncement } from "@/lib/announcement";
import { parisLocalToDate } from "@/lib/dates";
import { validateBroadcast } from "@/lib/push/messages";
import { EMAIL_REMINDERS_SETTING, sendEmailReminders } from "@/lib/email-reminders";
import { broadcastPush, broadcastPushTo } from "@/lib/push/send";
import { saveRules } from "@/lib/scoring/active-rules";
import { simulateResult } from "@/lib/simulation";
import { canEditPrediction } from "@/lib/scoring/engine";
import { parseOddsInput, parseRulesForm } from "@/lib/scoring/rules-form";
import { currentSeason, runSmartSync, scoreMatch, syncPhotosNow } from "@/lib/sync/sync";

export interface AdminState {
  error?: string;
  message?: string;
}

const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string) : "");
const json = (v: unknown) => (v === undefined ? Prisma.JsonNull : (v as Prisma.InputJsonValue));

async function audit(adminId: string, action: string, entity: string, entityId: string, before?: unknown, after?: unknown, reason?: string) {
  await prisma.adminAuditLog.create({
    data: { adminId, action, entity, entityId, before: json(before), after: json(after), reason: reason || null },
  });
}

function refresh(...paths: string[]) {
  for (const p of ["/", "/classement", ...paths]) revalidatePath(p);
}

// ─── Participants ───────────────────────────────────────────────────────────

/** Active ou désactive un participant (journalisé). Un admin ne peut pas se désactiver lui-même. */
export async function toggleUserActiveAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const userId = form.get("userId");
  if (typeof userId !== "string" || userId === admin.id) return;
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { isActive: true } });
  if (!before) return;
  await prisma.user.update({
    where: { id: userId },
    data: { isActive: !before.isActive, sessionVersion: { increment: 1 } }, // déconnexion immédiate
  });
  await audit(admin.id, before.isActive ? "DEACTIVATE_USER" : "ACTIVATE_USER", "User", userId, before, { isActive: !before.isActive });
  refresh("/admin/participants");
}

/**
 * Donne ou retire le rôle d'administrateur (journalisé). Un admin ne peut pas changer son propre rôle,
 * il reste donc toujours au moins un administrateur. La personne concernée doit se reconnecter.
 */
export async function toggleUserRoleAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const userId = str(form, "userId");
  if (!userId || userId === admin.id) return { error: "Tu ne peux pas changer ton propre rôle." };
  const before = await prisma.user.findUnique({ where: { id: userId }, select: { role: true, isActive: true, pseudo: true } });
  if (!before) return { error: "Participant introuvable." };
  if (before.role !== "ADMIN" && !before.isActive) return { error: "Réactive d’abord ce compte." };
  const role = before.role === "ADMIN" ? "PARTICIPANT" : "ADMIN";
  await prisma.user.update({
    where: { id: userId },
    // sessionVersion : nouvelle connexion obligatoire, pour que le nouveau rôle s'applique partout
    data: { role, sessionVersion: { increment: 1 } },
  });
  await audit(admin.id, role === "ADMIN" ? "GRANT_ADMIN" : "REVOKE_ADMIN", "User", userId, { role: before.role }, { role });
  refresh("/admin/participants");
  return {
    message:
      role === "ADMIN"
        ? `${before.pseudo} est administrateur (à sa prochaine connexion).`
        : `${before.pseudo} n’est plus administrateur.`,
  };
}

// ─── Synchronisation et points ──────────────────────────────────────────────

export async function syncNowAction(_: AdminState): Promise<AdminState> {
  await requireAdmin();
  const r = await runSmartSync({ force: true, reason: "manuel" });
  refresh("/admin", "/admin/matchs");
  if (r.skipped) return { error: `Synchronisation non lancée : ${r.skipped}. Réessaie dans une minute.` };
  if (r.errors.length) return { error: `Terminée avec ${r.errors.length} erreur(s) : ${r.errors[0]}` };
  return { message: `Synchronisation terminée : ${r.steps.length} étape(s). Détail dans le journal ci-dessous.` };
}

/** Recalcul contrôlé des points d'un match, avec son barème d'origine (journalisé). */
export async function rescoreMatchAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const matchId = form.get("matchId");
  if (typeof matchId !== "string") return;
  const n = await scoreMatch(matchId);
  await audit(admin.id, "RECALCULATE", "Match", matchId, undefined, { participants: n });
  refresh("/admin/matchs");
}

// ─── Dates limites ──────────────────────────────────────────────────────────

/** Fixe une date limite plus tôt que le coup d'envoi, ou la retire (« clear »). */
export async function setDeadlineAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const match = await prisma.match.findUnique({ where: { id: str(form, "matchId") } });
  if (!match) return { error: "Match introuvable." };
  if (match.kickoffAt <= new Date()) return { error: "Le match a commencé : la date limite ne peut plus changer." };

  let deadlineAt: Date | null = null;
  if (str(form, "mode") !== "clear") {
    deadlineAt = parisLocalToDate(str(form, "deadline"));
    if (!deadlineAt) return { error: "Date invalide." };
    if (deadlineAt >= match.kickoffAt) return { error: "La date limite doit être avant le coup d’envoi (sinon, retire-la)." };
  }
  await prisma.match.update({ where: { id: match.id }, data: { deadlineAt } });
  await audit(admin.id, "SET_DEADLINE", "Match", match.id, { deadlineAt: match.deadlineAt }, { deadlineAt }, str(form, "reason"));
  refresh("/admin/matchs");
  return { message: deadlineAt ? "Date limite enregistrée." : "Date limite retirée : clôture au coup d’envoi." };
}

// ─── Joueurs ────────────────────────────────────────────────────────────────

/** Crée ou modifie un joueur. Une fiche modifiée n'est plus écrasée par la synchro. */
export async function savePlayerAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const name = str(form, "name").trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 60) return { error: "Nom : 2 à 60 caractères." };
  const position = ["G", "D", "M", "F"].includes(str(form, "position")) ? str(form, "position") : null;
  const num = str(form, "shirtNumber").trim();
  const shirtNumber = num === "" ? null : Number(num);
  if (shirtNumber !== null && (!Number.isInteger(shirtNumber) || shirtNumber < 1 || shirtNumber > 99)) {
    return { error: "Numéro : 1 à 99." };
  }
  const isActive = form.get("isActive") === "on";
  const id = str(form, "playerId");

  if (id) {
    const before = await prisma.player.findUnique({ where: { id } });
    if (!before) return { error: "Joueur introuvable." };
    await prisma.player.update({ where: { id }, data: { name, position, shirtNumber, isActive, adminLocked: true } });
    await audit(admin.id, "EDIT_PLAYER", "Player", id, { name: before.name, position: before.position, shirtNumber: before.shirtNumber, isActive: before.isActive }, { name, position, shirtNumber, isActive });
  } else {
    const season = await currentSeason();
    const created = await prisma.player.create({
      data: { externalId: -Math.floor(Date.now() / 1000), seasonId: season.id, name, position, shirtNumber, isActive, adminLocked: true },
    });
    await audit(admin.id, "ADD_PLAYER", "Player", created.id, undefined, { name, position, shirtNumber, isActive });
  }
  refresh("/admin/joueurs");
  return { message: id ? "Joueur modifié." : "Joueur ajouté." };
}

/** Rend la fiche à la synchro (les données d'ESPN reprennent la main). */
export async function releasePlayerAction(form: FormData): Promise<void> {
  const admin = await requireAdmin();
  const id = form.get("playerId");
  if (typeof id !== "string") return;
  await prisma.player.update({ where: { id }, data: { adminLocked: false } });
  await audit(admin.id, "RELEASE_PLAYER", "Player", id);
  refresh("/admin/joueurs");
}

// ─── Cotes ──────────────────────────────────────────────────────────────────

/** Saisit (ou retire) la cote d'un joueur pour un match, avant le verrouillage. */
export async function setOddsAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const match = await prisma.match.findUnique({ where: { id: str(form, "matchId") } });
  const playerId = str(form, "playerId");
  if (!match || !playerId) return { error: "Match ou joueur introuvable." };
  if (!canEditPrediction(match, new Date())) return { error: "Pronostics verrouillés : les cotes de ce match sont figées." };
  const key = { matchId_playerId: { matchId: match.id, playerId } };
  const before = await prisma.playerOdds.findUnique({ where: key });
  const raw = str(form, "odds").trim();

  if (raw === "") {
    if (before?.source === "ADMIN") await prisma.playerOdds.delete({ where: key });
    await audit(admin.id, "CLEAR_ODDS", "PlayerOdds", `${match.id}:${playerId}`, before ? { odds: Number(before.odds) } : undefined);
    refresh("/admin/cotes");
    return { message: "Cote saisie retirée : celle de Bet365 reprendra à la prochaine synchro." };
  }
  const odds = parseOddsInput(raw);
  if (odds === null) return { error: "Cote décimale attendue (ex. 3,75)." };
  await prisma.playerOdds.upsert({
    where: key,
    create: { matchId: match.id, playerId, odds, source: "ADMIN", bookmaker: null },
    update: { odds, source: "ADMIN", bookmaker: null, fetchedAt: new Date() },
  });
  await audit(admin.id, "SET_ODDS", "PlayerOdds", `${match.id}:${playerId}`, before ? { odds: Number(before.odds), source: before.source } : undefined, { odds });
  refresh("/admin/cotes");
  return { message: `Cote enregistrée : ${odds.toLocaleString("fr-FR")}.` };
}

// ─── Barème ─────────────────────────────────────────────────────────────────

/** Nouveau barème : pour les matchs à venir (par défaut) ou recalcul de toute la saison (journalisé). */
export async function saveRulesAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const parsed = parseRulesForm(Object.fromEntries([...form.entries()].map(([k, v]) => [k, String(v)])));
  if (!parsed.ok) return { error: parsed.error };
  const version = await saveRules(parsed.rules, admin.id);
  let recomputed = 0;
  if (str(form, "mode") === "all") {
    const done = await prisma.match.findMany({ where: { resultConfirmedAt: { not: null } }, select: { id: true } });
    for (const m of done) {
      await scoreMatch(m.id, { useActiveRules: true });
      recomputed++;
    }
  }
  await audit(admin.id, "SAVE_RULES", "ScoringRuleSet", String(version), undefined, { ...parsed.rules, recomputed }, str(form, "reason"));
  refresh("/admin/bareme", "/regles");
  return {
    message: recomputed
      ? `Barème v${version} enregistré, ${recomputed} match(s) recalculé(s).`
      : `Barème v${version} enregistré : il s’appliquera aux prochains matchs.`,
  };
}

// ─── Messages ───────────────────────────────────────────────────────────────

export async function saveAnnouncementAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const v = validateAnnouncement({
    title: str(form, "title"),
    body: str(form, "body"),
    askNotifications: form.get("askNotifications") === "on",
    active: form.get("active") === "on",
  });
  if (!v.ok) return { error: v.error };
  const prev = await prisma.announcement.findUnique({ where: { id: "current" } });
  const version = nextVersion(prev, v.data);
  await prisma.announcement.upsert({ where: { id: "current" }, create: { id: "current", ...v.data, version }, update: { ...v.data, version } });
  await audit(admin.id, "SAVE_ANNOUNCEMENT", "Announcement", "current", undefined, { ...v.data, version });
  if (str(form, "mode") === "preview") (await cookies()).delete(`announce_${admin.id}`); // le revoir soi-même
  refresh("/admin/messages");
  return {
    message: v.data.active
      ? str(form, "mode") === "preview"
        ? "Enregistré : ouvre l’accueil pour le voir."
        : "Message publié : chaque joueur le verra une fois à l’ouverture."
      : "Message enregistré (non publié).",
  };
}

export async function broadcastPushAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const v = validateBroadcast({ title: str(form, "title"), body: str(form, "body") });
  if (!v.ok) return { error: v.error };
  const testOnly = str(form, "mode") === "test";
  const r = testOnly ? await broadcastPushTo(admin.id, v.title, v.body) : await broadcastPush(v.title, v.body);
  if (r.skipped) return { error: "Notifications non configurées : ajoute les clés VAPID (voir la page)." };
  if (!testOnly) await audit(admin.id, "BROADCAST_PUSH", "Push", "all", undefined, { title: v.title, body: v.body, sent: r.sent });
  return {
    message: `${r.sent} appareil(s) notifié(s)${r.failed ? `, ${r.failed} en échec` : ""}${r.removed ? `, ${r.removed} abonnement(s) expiré(s) retiré(s)` : ""}.`,
  };
}

// ─── Suppression d'un participant ───────────────────────────────────────────

/** Supprime définitivement un participant et ses pronostics (journalisé). Impossible sur son propre compte. */
export async function deleteUserAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const userId = str(form, "userId");
  if (!userId || userId === admin.id) return { error: "Tu ne peux pas supprimer ton propre compte." };
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { pseudo: true, email: true, role: true } });
  if (!u) return { error: "Participant introuvable." };
  await audit(admin.id, "DELETE_USER", "User", userId, { pseudo: u.pseudo, email: u.email, role: u.role });
  await prisma.$transaction([
    prisma.predictionResult.deleteMany({ where: { userId } }),
    prisma.prediction.deleteMany({ where: { userId } }),
    prisma.pushSent.deleteMany({ where: { userId } }),
    prisma.emailSent.deleteMany({ where: { userId } }),
    prisma.user.delete({ where: { id: userId } }), // photo, abonnements, liens : supprimés avec le compte
  ]);
  refresh("/admin/participants");
  return { message: `${u.pseudo} a été supprimé.` };
}

// ─── Simulation (mode test) ─────────────────────────────────────────────────

/** Simule le résultat d'un match pas encore joué : score (imposé ou tiré au sort), buteurs, points. */
export async function simulateMatchAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const match = await prisma.match.findUnique({ where: { id: str(form, "matchId") }, include: { homeTeam: true, awayTeam: true } });
  if (!match) return { error: "Match introuvable." };
  if (match.simulation) return { error: "Ce match est déjà simulé : annule d’abord la simulation." };
  if (match.status !== "SCHEDULED" && match.status !== "POSTPONED") {
    return { error: "Seul un match pas encore joué peut être simulé (les vrais résultats ne sont jamais écrasés)." };
  }
  const goals = (k: string) => {
    const v = str(form, k).trim();
    if (v === "") return null;
    const n = Number(v);
    return Number.isInteger(n) && n >= 0 && n <= 9 ? n : NaN;
  };
  const rennesIn = goals("rennes");
  const opponentIn = goals("opponent");
  if (Number.isNaN(rennesIn) || Number.isNaN(opponentIn)) return { error: "Score : un nombre de 0 à 9 (ou vide pour un tirage au sort)." };

  // Buteurs possibles : joueurs avec une cote (favoris d'abord), sinon feuille de match, sinon effectif
  const [odds, lineup, squad] = await Promise.all([
    prisma.playerOdds.findMany({ where: { matchId: match.id }, orderBy: { odds: "asc" }, select: { playerId: true } }),
    prisma.matchLineup.findMany({ where: { matchId: match.id }, select: { playerId: true } }),
    prisma.player.findMany({ where: { isActive: true, position: { not: "G" } }, select: { id: true } }),
  ]);
  const candidates = odds.length ? odds.map((o) => o.playerId) : lineup.length ? lineup.map((l) => l.playerId) : squad.map((p) => p.id);
  const sim = simulateResult(candidates, { rennes: rennesIn, opponent: opponentIn });
  const players = await prisma.player.findMany({ where: { id: { in: sim.scorerIds } }, select: { id: true, name: true } });
  const home = match.rennesIsHome ? sim.rennes : sim.opponent;
  const away = match.rennesIsHome ? sim.opponent : sim.rennes;
  const now = new Date();
  const minutes = (n: number) => Array.from({ length: n }, (_, i) => Math.round(((i + 1) * 88) / (n + 1)) + 1);

  await prisma.$transaction([
    prisma.matchGoal.deleteMany({ where: { matchId: match.id } }),
    prisma.matchCard.deleteMany({ where: { matchId: match.id } }),
    prisma.matchGoal.createMany({
      data: [
        ...sim.scorerIds.map((pid, i) => ({
          matchId: match.id,
          externalEventKey: `sim-r${i}`,
          playerId: pid,
          scorerName: players.find((p) => p.id === pid)?.name ?? "Joueur rennais",
          minute: minutes(sim.rennes)[i],
          forRennes: true,
        })),
        ...minutes(sim.opponent).map((min, i) => ({
          matchId: match.id,
          externalEventKey: `sim-o${i}`,
          scorerName: `${(match.rennesIsHome ? match.awayTeam : match.homeTeam).name} (simulation)`,
          minute: min,
          forRennes: false,
        })),
      ],
    }),
    prisma.match.update({
      where: { id: match.id },
      data: {
        simulation: { status: match.status, at: now.toISOString(), by: admin.id },
        status: "FINISHED",
        regHomeScore: home,
        regAwayScore: away,
        aetHomeScore: null,
        aetAwayScore: null,
        penHomeScore: null,
        penAwayScore: null,
        liveHomeScore: home,
        liveAwayScore: away,
        liveMinute: null,
        resultConfirmedAt: now,
      },
    }),
  ]);
  const n = await scoreMatch(match.id, { useActiveRules: true });
  await audit(admin.id, "SIMULATION_RUN", "Match", match.id, undefined, { home, away, scorers: sim.scorerIds.length });
  refresh("/admin/simulation");
  return { message: `Simulation : ${match.homeTeam.name} ${home}-${away} ${match.awayTeam.name}, points calculés pour ${n} participant(s).` };
}

/** Annule la simulation : supprime le résultat fictif et les points, remet le match comme avant. */
export async function cancelSimulationAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const match = await prisma.match.findUnique({ where: { id: str(form, "matchId") } });
  if (!match?.simulation) return { message: "Aucune simulation à annuler pour ce match." };
  const backup = match.simulation as unknown as { status?: "SCHEDULED" | "POSTPONED" };
  await prisma.$transaction([
    prisma.predictionResult.deleteMany({ where: { matchId: match.id } }),
    prisma.matchGoal.deleteMany({ where: { matchId: match.id } }),
    prisma.matchCard.deleteMany({ where: { matchId: match.id } }),
    prisma.match.update({
      where: { id: match.id },
      data: {
        status: backup.status ?? "SCHEDULED",
        regHomeScore: null,
        regAwayScore: null,
        liveHomeScore: null,
        liveAwayScore: null,
        resultConfirmedAt: null,
        scoredAt: null,
        rulesVersion: null,
        simulation: Prisma.DbNull,
      },
    }),
    // les pronostics redeviennent modifiables, la cote sera de nouveau figée au vrai coup d'envoi
    prisma.prediction.updateMany({ where: { matchId: match.id }, data: { lockedAt: null, scorerOdds: null, scorerOddsSource: null } }),
  ]);
  await audit(admin.id, "SIMULATION_CANCEL", "Match", match.id);
  refresh("/admin/simulation");
  return { message: "Simulation annulée : résultat fictif et points supprimés, le match est rouvert." };
}

// ─── Rappels par e-mail ─────────────────────────────────────────────────────

export async function setEmailRemindersAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const enabled = str(form, "mode") === "on";
  await prisma.appSetting.upsert({
    where: { key: EMAIL_REMINDERS_SETTING },
    create: { key: EMAIL_REMINDERS_SETTING, value: enabled },
    update: { value: enabled },
  });
  await audit(admin.id, "EMAIL_REMINDERS", "AppSetting", EMAIL_REMINDERS_SETTING, undefined, { enabled });
  refresh("/admin/messages");
  return { message: enabled ? "Rappels automatiques par e-mail activés." : "Rappels automatiques par e-mail désactivés." };
}

/** Envoi immédiat du rappel pour un match (joueurs sans pronostic, rappels activés, jamais deux fois). */
export async function sendEmailRemindersNowAction(_: AdminState, form: FormData): Promise<AdminState> {
  const admin = await requireAdmin();
  const matchId = str(form, "matchId");
  if (!matchId) return { error: "Aucun match ouvert aux pronostics." };
  const r = await sendEmailReminders({ matchId, force: true });
  await audit(admin.id, "EMAIL_REMINDERS_SEND", "Match", matchId, undefined, r);
  return { message: `${r.sent} e-mail(s) envoyé(s)${r.failed ? `, ${r.failed} en échec` : ""}.` };
}


/** Photos officielles mises à jour maintenant (1 requête API-Football). */
export async function syncPhotosAction(_: AdminState): Promise<AdminState> {
  const admin = await requireAdmin();
  if (!process.env.API_FOOTBALL_KEY) return { error: "API_FOOTBALL_KEY absente du fichier .env." };
  try {
    const message = await syncPhotosNow();
    await audit(admin.id, "SYNC_PHOTOS", "Player", "all", undefined, { message });
    refresh("/admin/joueurs");
    return { message };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Mise à jour impossible." };
  }
}
