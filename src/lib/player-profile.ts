// Profil public d'un joueur : position dans chacune de ses ligues (et au Général R&N), avec l'évolution.
import { prisma } from "@/lib/db";
import { rankHistory, type RankPoint } from "@/lib/rank-history";
import { buildStandings } from "@/lib/scoring/ranking";
import { scopeResultFilter } from "@/lib/leagues";
import { leagueBonusPoints } from "@/lib/bonus-data";
import { withBonuses } from "@/lib/scoring/bonus";

export interface LeagueStanding {
  rank: number | null; // null tant que le joueur n'a aucun match noté dans la ligue
  of: number;
  points: number;
  history: RankPoint[];
}

type Competition = "LIGUE_1" | "EUROPA_LEAGUE" | "COUPE_DE_FRANCE";

/** Position d'un joueur parmi `memberIds` (matchs après `since`, dans `competitions`, bonus de `leagueId`). */
export async function leagueStanding(
  userId: string,
  scope: { memberIds: Set<string>; since: Date | null; competitions: string[] | null; leagueId: string | null },
): Promise<LeagueStanding> {
  const ids = { in: [...scope.memberIds] };
  const [participants, results, matches] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true, id: ids }, select: { id: true, pseudo: true } }),
    prisma.predictionResult.findMany({
      where: { user: { isActive: true }, userId: ids, ...scopeResultFilter({ since: scope.since, competitions: scope.competitions }) },
      select: { userId: true, matchId: true, category: true, totalPoints: true, correctScorer: true },
    }),
    prisma.match.findMany({
      where: {
        resultConfirmedAt: { not: null },
        results: { some: {} },
        ...(scope.since ? { kickoffAt: { gte: scope.since } } : {}),
        ...(scope.competitions ? { competition: { in: scope.competitions as Competition[] } } : {}),
      },
      orderBy: { kickoffAt: "asc" },
      select: { id: true, competition: true, matchday: true },
    }),
  ]);
  const people = participants.map((p) => ({ userId: p.id, pseudo: p.pseudo }));
  const rows = scope.leagueId ? withBonuses(results, await leagueBonusPoints(scope.leagueId)) : results;
  const me = buildStandings(people, rows).find((x) => x.userId === userId);
  const history = rankHistory(
    userId,
    people,
    rows,
    matches.map((m) => ({
      id: m.id,
      label: m.competition === "LIGUE_1" ? `J${m.matchday ?? "?"}` : m.competition === "EUROPA_LEAGUE" ? "UEL" : "CdF",
    })),
  );
  return {
    rank: me && me.scoredMatches > 0 ? me.rank : null,
    of: participants.length,
    points: me?.totalPoints ?? 0,
    history,
  };
}
