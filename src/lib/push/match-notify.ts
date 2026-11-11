// Notifications automatiques de match : direct (buts, cartons, buteur remplacé, déroulé),
// veille du match, cotes disponibles, composition publiée. Chaque événement n'est envoyé qu'une fois.
import { prisma } from "@/lib/db";
import { clubLogo } from "@/lib/club-logo";
import { clubLogosMode } from "@/lib/club-logo-mode";
import type { ProviderMatchDetail } from "@/lib/providers/types";
import { notifyOnce } from "./send";
import {
  eveText,
  fullTimeText,
  goalText,
  halftimeText,
  kickoffText,
  lineupText,
  oddsText,
  redCardText,
  scorerSubText,
  secondHalfText,
  type MatchLabel,
} from "./match-texts";

const HOUR = 3600_000;

/** Le direct ne concerne que le match qui se joue (jamais les vieux matchs lus lors d'un premier remplissage). */
function isFresh(kickoffAt: Date, now: Date): boolean {
  const t = now.getTime() - kickoffAt.getTime();
  return t > -15 * 60_000 && t < 4 * HOUR;
}

export async function notifyMatchProgress(opts: {
  match: { id: string; kickoffAt: Date; resultConfirmedAt: Date | null; rennesIsHome: boolean };
  label: MatchLabel;
  detail: ProviderMatchDetail;
  rennesId: number;
  now?: Date;
}): Promise<number> {
  const now = opts.now ?? new Date();
  const { match, label: m, detail: d } = opts;
  if (match.resultConfirmedAt || !isFresh(match.kickoffAt, now)) return 0;
  const teamName = (teamId: number | null) =>
    teamId === opts.rennesId ? (match.rennesIsHome ? m.home : m.away) : match.rennesIsHome ? m.away : m.home;
  // Logo du club (officiel ou factice selon le réglage), en image de la notification
  const teams = await prisma.match.findUnique({ where: { id: match.id }, select: { homeTeam: true, awayTeam: true } });
  const rennesTeam = teams ? (match.rennesIsHome ? teams.homeTeam : teams.awayTeam) : null;
  const otherTeam = teams ? (match.rennesIsHome ? teams.awayTeam : teams.homeTeam) : null;
  const logoMode = await clubLogosMode();
  const teamLogo = (teamId: number | null) => {
    const t = teamId === opts.rennesId ? rennesTeam : otherTeam;
    const url = t ? clubLogo(t, logoMode) : null;
    return url && url.startsWith("http") ? url : null; // les logos factices (images en ligne) ne passent pas en notification
  };
  let sent = 0;
  const send = (kind: string, text: ReturnType<typeof kickoffText>, userIds?: string[]) =>
    notifyOnce({ matchId: match.id, kind, text, pref: "live", userIds }).then((n) => (sent += n));

  // Déroulé : coup d'envoi, mi-temps, reprise, fin (on n'annonce que l'étape en cours)
  if (d.status === "FINISHED") await send("full-time", fullTimeText(m, d.homeScore, d.awayScore));
  else if (d.phases.secondHalf) await send("second-half", secondHalfText(m, d.homeScore, d.awayScore));
  else if (d.phases.halftime) await send("halftime", halftimeText(m, d.homeScore, d.awayScore));
  else if (d.phases.kickoff || d.status === "LIVE") await send("kickoff", kickoffText(m));

  // Buts (hors tirs au but) et cartons rouges
  for (const g of d.goals.filter((x) => !x.isShootout)) {
    // pour un but contre son camp, l'équipe qui en profite est l'autre
    const scoringTeam = g.isOwnGoal ? (g.teamExternalId === opts.rennesId ? -1 : opts.rennesId) : g.teamExternalId;
    await send(
      `goal:${g.key}`,
      goalText(
        m,
        {
          key: g.key,
          playerName: g.playerName,
          team: teamName(scoringTeam),
          teamLogo: teamLogo(scoringTeam),
          minute: g.minute,
          extra: g.extraMinute,
          ownGoal: g.isOwnGoal,
          penalty: g.isPenalty,
        },
        { home: d.homeScore, away: d.awayScore },
      ),
    );
  }
  for (const c of d.redCards) {
    await send(`red:${c.key}`, redCardText(m, { key: c.key, playerName: c.playerName, team: teamName(c.teamExternalId), minute: c.minute, extra: c.extraMinute }));
  }

  // Buteur choisi remplacé ou entré en jeu : seulement aux joueurs qui l'ont choisi
  const rennesSubs = d.substitutions.filter((s) => s.teamExternalId === opts.rennesId);
  if (rennesSubs.length) {
    const preds = await prisma.prediction.findMany({
      where: { matchId: match.id, scorerId: { not: null } },
      select: { userId: true, scorer: { select: { externalId: true, name: true } } },
    });
    for (const s of rennesSubs) {
      for (const [extId, goesIn, name] of [
        [s.inExternalId, true, s.inName],
        [s.outExternalId, false, s.outName],
      ] as const) {
        if (extId === null) continue;
        const users = preds.filter((p) => p.scorer?.externalId === extId).map((p) => p.userId);
        if (users.length) {
          await send(`sub:${s.key}:${goesIn ? "in" : "out"}`, scorerSubText(m, { key: `${s.key}-${goesIn ? "in" : "out"}`, playerName: name, goesIn, minute: s.minute, extra: s.extraMinute }), users);
        }
      }
    }
  }
  return sent;
}

/** Cotes buteur publiées / composition publiée (avant le match). */
export async function notifyPrematch(kind: "odds" | "lineup", match: { id: string; kickoffAt: Date }, label: MatchLabel, now = new Date()): Promise<number> {
  if (match.kickoffAt.getTime() - now.getTime() < -5 * 60_000) return 0; // match déjà commencé : sans intérêt
  return notifyOnce({ matchId: match.id, kind, text: kind === "odds" ? oddsText(label) : lineupText(label), pref: "prematch" });
}

const paris = (d: Date, opts: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", ...opts }).format(d);

/** Veille du match : 24 h avant le coup d'envoi (au plus tard 1 h avant), à tous, pronostic saisi ou non. */
export async function notifyEves(now = new Date()): Promise<number> {
  const matches = await prisma.match.findMany({
    where: { status: "SCHEDULED", kickoffAt: { gt: new Date(now.getTime() + HOUR), lte: new Date(now.getTime() + 24 * HOUR) } },
    include: { homeTeam: true, awayTeam: true },
  });
  let sent = 0;
  for (const m of matches) {
    const today = paris(m.kickoffAt, { dateStyle: "short" }) === paris(now, { dateStyle: "short" });
    const time = paris(m.kickoffAt, { hour: "2-digit", minute: "2-digit" });
    sent += await notifyOnce({
      matchId: m.id,
      kind: "eve",
      text: eveText({ id: m.id, home: m.homeTeam.name, away: m.awayTeam.name }, m.competition, time, today),
      pref: "prematch",
    });
  }
  return sent;
}
