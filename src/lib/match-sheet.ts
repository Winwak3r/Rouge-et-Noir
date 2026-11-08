// Données de la page d'un match à pronostiquer (/match/[id]) : formulaire, ligues et bonus, composition.
import { prisma } from "@/lib/db";
import { bonusStock } from "@/lib/bonus-data";
import { clubLogo } from "@/lib/club-logo";
import { clubLogosMode } from "@/lib/club-logo-mode";
import { formatDateTime, formatShortNumeric } from "@/lib/dates";
import { getLeagueLogos } from "@/lib/league-logos";
import { playerPhotoUrl } from "@/lib/player-photo";
import { getActiveRules } from "@/lib/scoring/active-rules";
import { canEditPrediction, oddsToBonus } from "@/lib/scoring/engine";
import { maxPredictedGoals } from "@/lib/settings";

export type LineupPlayer = { id: string; name: string; position: string | null; photo: string | null; number: number | null; starter: boolean };

export async function loadMatchSheet(matchId: string, userId: string) {
  const match = await prisma.match.findUnique({ where: { id: matchId }, include: { homeTeam: true, awayTeam: true } });
  if (!match) return null;
  const now = new Date();
  const [rules, players, odds, lineup, my, logos, mode, memberships] = await Promise.all([
    getActiveRules(),
    prisma.player.findMany({
      where: { isActive: true, seasonId: match.seasonId },
      orderBy: { name: "asc" },
      select: { id: true, name: true, position: true, photoUrl: true, externalId: true, officialPhotoUrl: true, customPhotoAt: true, shirtNumber: true },
    }),
    prisma.playerOdds.findMany({ where: { matchId }, select: { playerId: true, odds: true } }),
    match.lineupAt ? prisma.matchLineup.findMany({ where: { matchId }, select: { playerId: true, starter: true } }) : [],
    prisma.prediction.findUnique({ where: { userId_matchId: { userId, matchId } }, include: { scorer: { select: { name: true } } } }),
    getLeagueLogos(),
    clubLogosMode(),
    prisma.leagueMember.findMany({
      where: { userId, isActive: true },
      select: { league: { select: { id: true, name: true } } },
      orderBy: { joinedAt: "asc" },
    }),
  ]);
  const oddsOf = new Map(odds.map((o) => [o.playerId, Number(o.odds)]));
  const lineupOf = match.lineupAt ? new Map(lineup.map((l) => [l.playerId, l.starter])) : null;
  const fallback = rules.scorerFallback.mode === "FIXED" ? rules.scorerFallback.fixedBonus : 0;

  // Buteurs proposés : une cote ET (si elle est publiée) sur la feuille de match ; le choix enregistré reste visible
  const scorers = players
    .filter((p) => (oddsOf.has(p.id) && (!lineupOf || lineupOf.has(p.id))) || p.id === my?.scorerId)
    .map((p) => {
      const o = oddsOf.get(p.id) ?? null;
      const role = lineupOf ? (lineupOf.get(p.id) === undefined ? null : lineupOf.get(p.id) ? "starter" : "sub") : null;
      return {
        id: p.id,
        name: p.name,
        position: p.position,
        photo: playerPhotoUrl(p),
        number: p.shirtNumber,
        odds: o,
        bonus: o ? oddsToBonus(o, rules) : fallback,
        role,
      } as const;
    });

  const lineupPlayers: LineupPlayer[] = lineupOf
    ? players
        .filter((p) => lineupOf.has(p.id))
        .map((p) => ({ id: p.id, name: p.name, position: p.position, photo: playerPhotoUrl(p), number: p.shirtNumber, starter: lineupOf.get(p.id)! }))
    : [];

  const [stocks, uses] = await Promise.all([
    Promise.all(memberships.map((m) => bonusStock(userId, m.league.id, match.seasonId))),
    prisma.bonusUse.findMany({ where: { userId, matchId } }),
  ]);
  const code =
    match.competition === "COUPE_DE_FRANCE"
      ? (match.stage?.split(" ")[0] ?? "CdF")
      : match.matchday
        ? `J${match.matchday}`
        : (match.stage?.split(" ")[0] ?? "UEL");

  return {
    match,
    editable: canEditPrediction(match, now),
    lineupPlayers,
    sheet: {
      matchId: match.id,
      title: `${code} · ${formatShortNumeric(match.kickoffAt)} ${formatDateTime(match.kickoffAt).split(" à ")[1] ?? ""}`.trim(),
      competitionLogo: logos[match.competition] ?? null,
      home: { name: match.homeTeam.name, logo: clubLogo(match.homeTeam, mode), rennes: match.rennesIsHome },
      away: { name: match.awayTeam.name, logo: clubLogo(match.awayTeam, mode), rennes: !match.rennesIsHome },
      rennesIsHome: match.rennesIsHome,
      maxGoals: maxPredictedGoals(),
      noScorerBonus: rules.noScorerBonus,
      scorers,
      lineupPublished: Boolean(lineupOf),
      savedScorerOut: lineupOf && my?.scorerId && !lineupOf.has(my.scorerId) ? (my.scorer?.name ?? "Ton buteur") : null,
      initial: my ? { rennesGoals: my.rennesGoals, opponentGoals: my.opponentGoals, scorerId: my.scorerId, noScorerPick: my.noScorerPick } : null,
      leagues: memberships.map((m, i) => {
        const cur = uses.find((u) => u.leagueId === m.league.id);
        const stock = stocks[i];
        return { id: m.league.id, name: m.league.name, stock: cur ? { ...stock, [cur.kind]: stock[cur.kind] + 1 } : stock, current: cur ? { kind: cur.kind } : null };
      }),
    },
  };
}
