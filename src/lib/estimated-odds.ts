// Cotes ESTIMÉES des buteurs : permettent de choisir son buteur avant la publication des vraies cotes
// (environ 48 h avant le match). Pour chaque joueur, moyenne de ses vraies cotes sur les 5 derniers matchs de la
// saison qui en avaient (moins s'il y en a moins : début de saison). 1er match de la saison : aucune estimation.
// Les points en découlent avec le barème habituel (cote ÷ 2, de 1 à 6 points).

import { prisma } from "@/lib/db";

import { averageOdds, type OddsHistoryMatch } from "@/lib/odds-average";

export { averageOdds, ESTIMATE_DEPTH, type OddsHistoryMatch } from "@/lib/odds-average";

/** Historique des vraies cotes d'une saison (une requête), par match. */
export async function oddsHistory(seasonId: string): Promise<OddsHistoryMatch[]> {
  const rows = await prisma.playerOdds.findMany({
    where: { match: { seasonId, status: { not: "CANCELLED" } } },
    select: { matchId: true, playerId: true, odds: true, match: { select: { kickoffAt: true } } },
  });
  const byMatch = new Map<string, OddsHistoryMatch>();
  for (const r of rows) {
    const h = byMatch.get(r.matchId) ?? { kickoffAt: r.match.kickoffAt, odds: new Map() };
    h.odds.set(r.playerId, Number(r.odds));
    byMatch.set(r.matchId, h);
  }
  return [...byMatch.values()];
}

/** Cotes estimées pour un match (vide pour le 1er match de la saison). */
export async function estimatedOddsFor(match: { seasonId: string; kickoffAt: Date }): Promise<Map<string, number>> {
  return averageOdds(await oddsHistory(match.seasonId), match.kickoffAt);
}
