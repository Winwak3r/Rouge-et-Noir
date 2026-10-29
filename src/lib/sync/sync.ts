// Synchronisation automatique : calendrier, effectif, direct, résultats, cotes, verrouillage, points.
// Tout est idempotent : relancer la même synchro ne change rien et n'ajoute jamais de points.
import { Prisma, type Match } from "@prisma/client";
import { prisma } from "@/lib/db";
import { createEspnProvider } from "@/lib/providers/espn";
import { matchPlayerName } from "@/lib/providers/names";
import type { FootballProvider, ProviderTeam } from "@/lib/providers/types";
import { emailRemindersEnabled, sendEmailReminders } from "@/lib/email-reminders";
import { sendReminders } from "@/lib/push/send";
import { syncSquadPhotos } from "./squad-photos-sync";
import { getActiveRules, getRulesByVersion } from "@/lib/scoring/active-rules";
import { lockTime, scoreParticipantForMatch } from "@/lib/scoring/engine";
import type { ScoreLine } from "@/lib/scoring/rules";

const MIN = 60_000;
const HOUR = 60 * MIN;

export const SYNC_INTERVALS = {
  calendar: 6 * HOUR,
  squad: 24 * HOUR,
  oddsWindow: 48 * HOUR, // on récupère les cotes des matchs des 48 prochaines heures…
  oddsRefresh: 2 * HOUR, // … toutes les 2 heures
  confirmAfter: 150 * MIN, // résultat confirmé 2 h 30 après le coup d'envoi
  minGap: 45_000, // pas plus d'une synchro automatique toutes les 45 s
  lockTtl: 3 * MIN,
  // Photos officielles : elles ne changent qu'aux transferts → tous les 60 jours (6 fois par an), réglable
  photos: Number(process.env.PHOTOS_SYNC_DAYS ?? 60) * 24 * HOUR,
  lineupWindow: 2 * HOUR, // dans les 2 h avant le coup d'envoi…
  lineupRefresh: 5 * MIN, // … on guette la feuille de match toutes les 5 min
};

// ─── Petits outils ──────────────────────────────────────────────────────────

export async function getSetting<T>(key: string): Promise<T | null> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row ? (row.value as unknown as T) : null;
}

async function setSetting(key: string, value: Prisma.InputJsonValue): Promise<void> {
  await prisma.appSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
}

async function since(key: string): Promise<number> {
  const v = await getSetting<string>(key);
  return v ? Date.now() - new Date(v).getTime() : Infinity;
}

async function acquireLock(): Promise<boolean> {
  const until = await getSetting<string>("sync_lock");
  if (until && new Date(until).getTime() > Date.now()) return false;
  await setSetting("sync_lock", new Date(Date.now() + SYNC_INTERVALS.lockTtl).toISOString());
  return true;
}

async function releaseLock(): Promise<void> {
  await prisma.appSetting.deleteMany({ where: { key: "sync_lock" } });
}

export async function currentSeason() {
  const startYear = Number(process.env.SEASON_START_YEAR ?? 2026);
  return prisma.season.upsert({
    where: { startYear },
    update: {},
    create: { startYear, label: `${startYear}-${startYear + 1}`, isCurrent: true },
  });
}

async function upsertTeam(t: ProviderTeam) {
  return prisma.team.upsert({
    where: { externalId: t.externalId },
    create: { externalId: t.externalId, name: t.name, shortName: t.shortName, logoUrl: t.logoUrl },
    update: { name: t.name, shortName: t.shortName, logoUrl: t.logoUrl ?? undefined },
  });
}

// ─── Calendrier ─────────────────────────────────────────────────────────────

export async function syncCalendar(provider: FootballProvider): Promise<number> {
  const season = await currentSeason();
  const matches = await provider.listMatches(season.startYear);
  let changed = 0;

  for (const m of matches) {
    const [home, away] = await Promise.all([upsertTeam(m.home), upsertTeam(m.away)]);
    const existing = await prisma.match.findUnique({ where: { externalId: m.externalId } });
    if (existing?.simulation) continue; // match en simulation (mode test) : on n'y touche pas
    const common = {
      seasonId: season.id,
      competition: m.competition,
      matchday: m.matchday,
      stage: m.stage,
      isKnockout: m.isKnockout,
      homeTeamId: home.id,
      awayTeamId: away.id,
      rennesIsHome: m.home.externalId === provider.teamExternalId,
      // Pas de lastSyncedAt ici : cette date sert à espacer la récupération du DÉTAIL (cotes, feuille de match).
      // La mettre à jour avec le calendrier retardait la récupération des cotes de plusieurs heures.
    };

    if (!existing) {
      await prisma.match.create({ data: { ...common, externalId: m.externalId, kickoffAt: m.kickoffAt, status: m.status } });
      changed++;
      continue;
    }

    // L'horaire ne bouge que tant que le match n'a pas commencé (report, reprogrammation).
    const notStarted = (s: string) => s === "SCHEDULED" || s === "POSTPONED";
    const kickoffAt = notStarted(existing.status) && notStarted(m.status) ? m.kickoffAt : existing.kickoffAt;
    // Un résultat confirmé n'est plus modifié par le calendrier (le détail du match s'en charge).
    const status = existing.resultConfirmedAt ? existing.status : m.status;

    const moved = kickoffAt.getTime() !== existing.kickoffAt.getTime();
    if (moved || status !== existing.status) changed++;
    // Horaire modifié (report) : la date limite fixée par l'admin n'a plus de sens, on l'efface.
    await prisma.match.update({
      where: { id: existing.id },
      data: { ...common, kickoffAt, status, ...(moved ? { deadlineAt: null } : {}) },
    });
  }
  return changed;
}

// ─── Effectif ───────────────────────────────────────────────────────────────

export async function syncSquad(provider: FootballProvider): Promise<number> {
  const season = await currentSeason();
  const squad = await provider.getSquad();
  if (squad.length === 0) throw new Error("Effectif vide : synchronisation ignorée.");
  const locked = new Set(
    (await prisma.player.findMany({ where: { seasonId: season.id, adminLocked: true }, select: { externalId: true } })).map((p) => p.externalId),
  );
  for (const p of squad) {
    if (locked.has(p.externalId)) continue; // fiche gérée par l'admin
    await prisma.player.upsert({
      where: { externalId_seasonId: { externalId: p.externalId, seasonId: season.id } },
      create: { ...p, seasonId: season.id, isActive: true },
      update: { name: p.name, position: p.position, shirtNumber: p.shirtNumber, photoUrl: p.photoUrl, isActive: true },
    });
  }
  // Les joueurs partis restent en base (anciens pronostics) mais disparaissent des menus.
  // Les joueurs ajoutés à la main (identifiant négatif) et les fiches gérées par l'admin ne sont pas touchés.
  await prisma.player.updateMany({
    where: { seasonId: season.id, adminLocked: false, externalId: { gt: 0, notIn: squad.map((p) => p.externalId) } },
    data: { isActive: false },
  });
  return squad.length;
}

// ─── Détail d'un match ──────────────────────────────────────────────────────

const toRennes = (m: Pick<Match, "rennesIsHome">, home: number, away: number): ScoreLine =>
  m.rennesIsHome ? { rennes: home, opponent: away } : { rennes: away, opponent: home };

export async function syncMatchDetail(provider: FootballProvider, match: Match): Promise<string[]> {
  const notes: string[] = [];
  const d = await provider.getMatchDetail({ externalId: match.externalId, competition: match.competition });
  const now = new Date();
  const season = await prisma.season.findUniqueOrThrow({ where: { id: match.seasonId } });

  // 1. Buts (remplacés à chaque fois : idempotent)
  const rennesId = provider.teamExternalId;
  const goalRows = [];
  for (const g of d.goals) {
    const forRennes = g.teamExternalId === rennesId;
    let playerId: string | null = null;
    if (forRennes && !g.isOwnGoal && g.playerExternalId !== null) {
      const player = await prisma.player.upsert({
        where: { externalId_seasonId: { externalId: g.playerExternalId, seasonId: season.id } },
        create: { externalId: g.playerExternalId, seasonId: season.id, name: g.playerName },
        update: {},
      });
      playerId = player.id;
    }
    goalRows.push({
      matchId: match.id,
      externalEventKey: g.key,
      playerId,
      scorerName: g.playerName,
      minute: g.minute,
      extraMinute: g.extraMinute,
      forRennes,
      isOwnGoal: g.isOwnGoal,
      isPenalty: g.isPenalty && !g.isShootout,
    });
  }
  // Les tirs au but ne sont pas des buts : on ne les enregistre pas.
  const keep = d.goals.filter((g) => !g.isShootout).map((g) => g.key);
  await prisma.$transaction([
    prisma.matchGoal.deleteMany({ where: { matchId: match.id, externalEventKey: { notIn: keep } } }),
    ...goalRows
      .filter((r) => keep.includes(r.externalEventKey))
      .map((r) =>
        prisma.matchGoal.upsert({
          where: { matchId_externalEventKey: { matchId: match.id, externalEventKey: r.externalEventKey } },
          create: r,
          update: r,
        }),
      ),
  ]);

  // 1 bis. Cartons rouges (remplacés à chaque fois : idempotent)
  await prisma.$transaction([
    prisma.matchCard.deleteMany({ where: { matchId: match.id } }),
    prisma.matchCard.createMany({
      data: d.redCards.map((c) => ({
        matchId: match.id,
        externalEventKey: c.key,
        playerName: c.playerName,
        forRennes: c.teamExternalId === rennesId,
        minute: c.minute,
        extraMinute: c.extraMinute,
        secondYellow: c.secondYellow,
      })),
      skipDuplicates: true,
    }),
  ]);

  // 2. Feuille de match rennaise (titulaires + remplaçants), dès sa publication
  const lineup = d.lineups[rennesId] ?? [];
  if (lineup.length > 0) {
    const rows: Array<{ matchId: string; playerId: string; starter: boolean }> = [];
    for (const l of lineup) {
      const player = await prisma.player.upsert({
        where: { externalId_seasonId: { externalId: l.externalId, seasonId: season.id } },
        create: { externalId: l.externalId, seasonId: season.id, name: l.name, position: l.position, shirtNumber: l.shirtNumber },
        update: {},
      });
      rows.push({ matchId: match.id, playerId: player.id, starter: l.starter });
    }
    await prisma.$transaction([
      prisma.matchLineup.deleteMany({ where: { matchId: match.id } }),
      prisma.matchLineup.createMany({ data: rows }),
      ...(match.lineupAt ? [] : [prisma.match.update({ where: { id: match.id }, data: { lineupAt: now } })]),
    ]);
    if (!match.lineupAt) notes.push(`feuille de match : ${lineup.filter((l) => l.starter).length} titulaires, ${lineup.filter((l) => !l.starter).length} remplaçants`);
  }

  // 3. Cotes buteur : uniquement avant le verrouillage
  if (now < lockTime(match) && d.scorerOdds.length > 0) {
    const players = await prisma.player.findMany({ where: { seasonId: season.id }, select: { id: true, name: true } });
    let matched = 0;
    const unmatched: string[] = [];
    for (const o of d.scorerOdds) {
      const p = matchPlayerName(o.playerName, players);
      if (!p) {
        unmatched.push(o.playerName);
        continue;
      }
      matched++;
      const existing = await prisma.playerOdds.findUnique({
        where: { matchId_playerId: { matchId: match.id, playerId: p.id } },
      });
      if (existing?.source === "ADMIN") continue; // une cote saisie par l'admin n'est pas écrasée
      await prisma.playerOdds.upsert({
        where: { matchId_playerId: { matchId: match.id, playerId: p.id } },
        create: { matchId: match.id, playerId: p.id, odds: o.decimal, source: "PROVIDER", bookmaker: "Bet365" },
        update: { odds: o.decimal, fetchedAt: now },
      });
    }
    notes.push(`cotes : ${matched} joueurs rennais`);
    // Les noms non trouvés sont surtout les adversaires : on ne les signale pas tous.
    void unmatched;
  }

  // 4. Statut, direct et résultat
  const data: Prisma.MatchUpdateInput = { lastSyncedAt: now };
  if (!match.resultConfirmedAt) data.status = d.status;
  if (d.status === "LIVE" || d.status === "INTERRUPTED") {
    data.liveHomeScore = d.homeScore;
    data.liveAwayScore = d.awayScore;
    data.liveMinute = d.minute;
  }
  let resultChanged = false;
  if (d.status === "FINISHED" && d.regulation) {
    const next = {
      regHomeScore: d.regulation.home,
      regAwayScore: d.regulation.away,
      aetHomeScore: d.afterExtraTime?.home ?? null,
      aetAwayScore: d.afterExtraTime?.away ?? null,
      penHomeScore: d.penalties?.home ?? null,
      penAwayScore: d.penalties?.away ?? null,
    };
    resultChanged = (Object.keys(next) as (keyof typeof next)[]).some((k) => match[k] !== next[k]);
    Object.assign(data, next, { liveHomeScore: d.homeScore, liveAwayScore: d.awayScore, liveMinute: null });
    if (resultChanged && match.resultConfirmedAt) {
      notes.push(
        `résultat corrigé par le fournisseur : ${match.regHomeScore}-${match.regAwayScore} → ${next.regHomeScore}-${next.regAwayScore}`,
      );
    }
    if (!match.resultConfirmedAt && now.getTime() - match.kickoffAt.getTime() >= SYNC_INTERVALS.confirmAfter) {
      data.resultConfirmedAt = now;
      data.status = "FINISHED";
      notes.push("résultat confirmé");
    }
  }
  const updated = await prisma.match.update({ where: { id: match.id }, data });

  // 5. Verrouillage (cote figée) dès le coup d'envoi, puis points si le résultat est confirmé
  if (now >= lockTime(updated)) await lockPredictions(updated.id);
  if (updated.resultConfirmedAt && (resultChanged || !updated.scoredAt || data.resultConfirmedAt)) {
    const n = await scoreMatch(updated.id);
    notes.push(n === 0 ? "aucun participant concerné" : `points attribués à ${n} participant${n > 1 ? "s" : ""}`);
  }
  if (updated.status === "CANCELLED") await prisma.predictionResult.deleteMany({ where: { matchId: updated.id } });
  return notes;
}

/** Fige la cote du buteur choisi (dernière cote d'avant-match connue). Idempotent. */
export async function lockPredictions(matchId: string): Promise<number> {
  const preds = await prisma.prediction.findMany({ where: { matchId, lockedAt: null } });
  if (preds.length === 0) return 0;
  const odds = await prisma.playerOdds.findMany({ where: { matchId } });
  const now = new Date();
  for (const p of preds) {
    const o = p.scorerId ? odds.find((x) => x.playerId === p.scorerId) : undefined;
    await prisma.prediction.update({
      where: { id: p.id },
      data: { lockedAt: now, scorerOdds: o?.odds ?? null, scorerOddsSource: o?.source ?? null },
    });
  }
  return preds.length;
}

// ─── Points ─────────────────────────────────────────────────────────────────

/**
 * Calcule (ou recalcule) les points de tous les participants pour un match confirmé.
 * Renvoie le nombre de participants notés (inscrits avant le match ou ayant pronostiqué).
 */
export async function scoreMatch(matchId: string, opts: { useActiveRules?: boolean } = {}): Promise<number> {
  await lockPredictions(matchId);
  const m = await prisma.match.findUniqueOrThrow({
    where: { id: matchId },
    include: { goals: true, predictions: true },
  });
  if (m.status === "CANCELLED") {
    await prisma.predictionResult.deleteMany({ where: { matchId } });
    return 0;
  }
  if (!m.resultConfirmedAt || m.regHomeScore === null || m.regAwayScore === null) return 0;

  // Un match déjà noté garde SON barème, sauf recalcul explicite avec le barème actif.
  const rules = m.rulesVersion && !opts.useActiveRules ? await getRulesByVersion(m.rulesVersion) : await getActiveRules();
  const result = {
    regulation: toRennes(m, m.regHomeScore, m.regAwayScore),
    afterExtraTime:
      m.aetHomeScore !== null && m.aetAwayScore !== null ? toRennes(m, m.aetHomeScore, m.aetAwayScore) : null,
    penalties:
      m.penHomeScore !== null && m.penAwayScore !== null ? toRennes(m, m.penHomeScore, m.penAwayScore) : null,
  };
  const scorerIds = m.goals
    .filter((g) => g.forRennes && !g.isOwnGoal && g.playerId)
    .map((g) => g.playerId as string);
  // « Aucun buteur » : un but rennais d'un joueur rennais (identifié ou non) annule le bonus.
  // Prudence : si Rennes a marqué mais qu'aucun but n'est détaillé, on considère qu'un Rennais a marqué.
  const finalRennes = (result.afterExtraTime ?? result.regulation).rennes;
  const rennesPlayerScored =
    m.goals.some((g) => g.forRennes && !g.isOwnGoal) || (finalRennes > 0 && m.goals.length === 0);
  const users = await prisma.user.findMany({ select: { id: true, createdAt: true } });
  const byUser = new Map(m.predictions.map((p) => [p.userId, p]));

  const ops: Prisma.PrismaPromise<unknown>[] = [];
  let scored = 0;
  for (const u of users) {
    const p = byUser.get(u.id);
    const s = scoreParticipantForMatch(
      {
        kickoffAt: m.kickoffAt,
        deadlineAt: m.deadlineAt,
        status: m.status,
        resultConfirmed: true,
        isKnockout: m.isKnockout,
        result,
        rennesScorerIds: scorerIds,
        rennesPlayerScored,
        userRegisteredAt: u.createdAt,
        prediction: p
          ? {
              score: { rennes: p.rennesGoals, opponent: p.opponentGoals },
              scorerId: p.scorerId,
              noScorerPick: p.noScorerPick,
              scorerOdds: p.scorerOdds === null ? null : Number(p.scorerOdds),
              savedAt: p.submittedAt,
            }
          : null,
      },
      rules,
    );
    if (!s) {
      ops.push(prisma.predictionResult.deleteMany({ where: { userId: u.id, matchId } }));
      continue;
    }
    scored++;
    const data = {
      predictionId: p?.id ?? null,
      category: s.category,
      scorePoints: s.scorePoints,
      scorerPoints: s.scorerPoints,
      totalPoints: s.totalPoints,
      correctScorer: s.correctScorer,
      oddsUsed: s.oddsUsed,
      usedFallback: s.usedFallback,
      rulesVersion: s.rulesVersion,
      calculatedAt: new Date(),
    };
    ops.push(
      prisma.predictionResult.upsert({
        where: { userId_matchId: { userId: u.id, matchId } },
        create: { userId: u.id, matchId, ...data },
        update: data,
      }),
    );
  }
  ops.push(prisma.match.update({ where: { id: matchId }, data: { scoredAt: new Date(), rulesVersion: rules.version } }));
  await prisma.$transaction(ops);
  return scored;
}

// ─── Orchestration ──────────────────────────────────────────────────────────

export interface SyncReport {
  skipped?: string;
  status?: "SUCCESS" | "PARTIAL" | "FAILED";
  steps: string[];
  errors: string[];
}

/**
 * Synchro « intelligente », appelable aussi souvent qu'on veut (cron chaque minute, visite du site,
 * bouton admin) : elle ne fait que ce qui est nécessaire et ne tourne jamais deux fois en parallèle.
 */
export async function runSmartSync(opts: { force?: boolean; reason: string; budgetMs?: number }): Promise<SyncReport> {
  if (!opts.force && (await since("last_sync_at")) < SYNC_INTERVALS.minGap) {
    return { skipped: "synchronisation récente", steps: [], errors: [] };
  }
  if (!(await acquireLock())) return { skipped: "synchronisation déjà en cours", steps: [], errors: [] };

  const provider = createEspnProvider();
  const report: SyncReport = { steps: [], errors: [] };
  const started = new Date();
  let matchesUpdated = 0;
  const step = async (label: string, fn: () => Promise<string | void>) => {
    try {
      const r = await fn();
      report.steps.push(r ? `${label} : ${r}` : label);
    } catch (e) {
      report.errors.push(`${label} : ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  try {
    await setSetting("last_sync_at", started.toISOString());

    if (opts.force || (await since("last_squad_sync")) > SYNC_INTERVALS.squad) {
      await step("effectif", async () => {
        const n = await syncSquad(provider);
        await setSetting("last_squad_sync", new Date().toISOString());
        return `${n} joueurs`;
      });
    }

    // Pas déclenchée par « Synchroniser maintenant » : seulement à intervalle, ou par son propre bouton
    if (process.env.API_FOOTBALL_KEY && (await since("last_photos_sync")) > SYNC_INTERVALS.photos) {
      await step("photos officielles (API-Football)", async () => {
        const r = await syncSquadPhotos((await currentSeason()).id);
        await setSetting("last_photos_sync", new Date().toISOString());
        return `${r.matched}/${r.total} joueurs${r.unmatched.length ? ` (non retrouvés : ${r.unmatched.join(", ")})` : ""}`;
      });
    }

    if (opts.force || (await since("last_logos_sync")) > SYNC_INTERVALS.squad) {
      await step("logos des compétitions", async () => {
        const logos = await provider.getLeagueLogos();
        if (Object.keys(logos).length > 0) await setSetting("league_logos", logos);
        await setSetting("last_logos_sync", new Date().toISOString());
        return `${Object.keys(logos).length}/3`;
      });
    }

    if (opts.force || (await since("last_calendar_sync")) > SYNC_INTERVALS.calendar) {
      await step("calendrier", async () => {
        const n = await syncCalendar(provider);
        matchesUpdated += n;
        await setSetting("last_calendar_sync", new Date().toISOString());
        const w = provider.warnings();
        return `${n} changement(s)${w.length ? ` (${w.length} avertissement(s) : ${w.join(" ; ")})` : ""}`;
      });
    }

    const now = new Date();
    const candidates = await prisma.match.findMany({
      where: {
        simulation: { equals: Prisma.AnyNull },
        OR: [
          { status: { in: ["LIVE", "INTERRUPTED"] } },
          { status: "SCHEDULED", kickoffAt: { lte: now } }, // aurait dû commencer
          { status: "FINISHED", resultConfirmedAt: null },
          // corrections éventuelles du résultat : seulement pour les matchs JOUÉS récemment
          // (et non pour les vieux matchs confirmés lors du premier remplissage de la base)
          { status: "FINISHED", resultConfirmedAt: { not: null }, kickoffAt: { gte: new Date(now.getTime() - 36 * HOUR) } },
          { status: "SCHEDULED", kickoffAt: { gt: now, lte: new Date(now.getTime() + SYNC_INTERVALS.oddsWindow) } },
        ],
      },
      orderBy: { kickoffAt: "asc" },
    });
    // Priorités : 1) en cours, 2) à venir (cotes, feuille de match), 3) résultats à confirmer, 4) vérifications
    const rank = (m: (typeof candidates)[number]) =>
      m.status === "LIVE" || m.status === "INTERRUPTED" ? 0 : m.status === "SCHEDULED" ? 1 : m.resultConfirmedAt ? 3 : 2;
    candidates.sort((a, b) => rank(a) - rank(b) || a.kickoffAt.getTime() - b.kickoffAt.getTime());

    const budget = opts.budgetMs ?? 40_000; // sous la limite de Vercel : la suite se fera à la synchro suivante
    let postponed = 0;
    for (const m of candidates) {
      if (Date.now() - started.getTime() > budget) {
        postponed++;
        continue;
      }
      const upcoming = m.status === "SCHEDULED" && m.kickoffAt > now;
      const age = m.lastSyncedAt ? now.getTime() - m.lastSyncedAt.getTime() : Infinity;
      // Juste avant le match et sans feuille de match : on vérifie plus souvent.
      const awaitingLineup = upcoming && !m.lineupAt && m.kickoffAt.getTime() - now.getTime() <= SYNC_INTERVALS.lineupWindow;
      const interval = awaitingLineup ? SYNC_INTERVALS.lineupRefresh : SYNC_INTERVALS.oddsRefresh;
      if (upcoming && !opts.force && age < interval) continue;
      const confirmedRecently = m.status === "FINISHED" && m.resultConfirmedAt;
      if (confirmedRecently && !opts.force && age < HOUR) continue;
      await step(`match ${m.externalId}`, async () => {
        const notes = await syncMatchDetail(provider, m);
        matchesUpdated++;
        return notes.join(", ") || "à jour";
      });
    }

    if (postponed) report.steps.push(`${postponed} match(s) reporté(s) à la synchro suivante (temps limité)`);

    // Rappels par e-mail 2 h avant le verrouillage (si activés par l'admin)
    try {
      if (await emailRemindersEnabled()) {
        const r = await sendEmailReminders();
        if (r.sent || r.failed) report.steps.push(`e-mails de rappel : ${r.sent} envoyé(s)${r.failed ? `, ${r.failed} en échec` : ""}`);
      }
    } catch (e) {
      report.errors.push(`e-mails de rappel : ${e instanceof Error ? e.message : String(e)}`);
    }

    // Rappels push 1 h avant le verrouillage (ne fait rien s'il n'y a aucun match proche)
    try {
      const r = await sendReminders();
      if (r.sent || r.failed) report.steps.push(`rappels : ${r.sent} envoyé(s)${r.failed ? `, ${r.failed} en échec` : ""}`);
    } catch (e) {
      report.errors.push(`rappels : ${e instanceof Error ? e.message : String(e)}`);
    }
  } finally {
    report.status = report.errors.length === 0 ? "SUCCESS" : report.steps.length > 0 ? "PARTIAL" : "FAILED";
    const didSomething = report.steps.length > 0 || report.errors.length > 0;
    // Rien à faire (aucun match proche, calendrier récent) : pas de ligne de journal inutile.
    if (didSomething) await prisma.syncLog.create({
      data: {
        kind: opts.reason,
        status: report.status,
        startedAt: started,
        finishedAt: new Date(),
        requestsUsed: provider.requestCount(),
        matchesUpdated,
        message: report.errors[0] ?? report.steps.slice(0, 3).join(" · ") ?? null,
        details: { steps: report.steps, errors: report.errors },
      },
    });
    if (didSomething && report.status !== "FAILED") {
      await setSetting("last_sync_success", new Date().toISOString());
    }
    await releaseLock();
  }
  return report;
}


/** Mise à jour des photos officielles à la demande (bouton de l'administration). */
export async function syncPhotosNow(): Promise<string> {
  const r = await syncSquadPhotos((await currentSeason()).id);
  await setSetting("last_photos_sync", new Date().toISOString());
  return `${r.matched}/${r.total} joueurs mis à jour${r.unmatched.length ? ` (non retrouvés : ${r.unmatched.join(", ")})` : ""}.`;
}

export async function lastPhotosSync(): Promise<Date | null> {
  const v = await getSetting<string>("last_photos_sync");
  return v ? new Date(v) : null;
}
