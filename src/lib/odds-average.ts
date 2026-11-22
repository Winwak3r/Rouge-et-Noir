// Moyenne des cotes des buteurs sur les derniers matchs (fonction pure, sans base de données : testable).

export const ESTIMATE_DEPTH = 5;

export interface OddsHistoryMatch {
  kickoffAt: Date;
  odds: Map<string, number>; // joueur → cote réelle
}

/** Moyenne des cotes de chaque joueur sur les N derniers matchs (avant « before ») ayant des cotes. Fonction pure. */
export function averageOdds(history: OddsHistoryMatch[], before: Date, depth = ESTIMATE_DEPTH): Map<string, number> {
  const recent = history
    .filter((h) => h.kickoffAt < before && h.odds.size > 0)
    .sort((a, b) => b.kickoffAt.getTime() - a.kickoffAt.getTime())
    .slice(0, depth);
  const sums = new Map<string, { total: number; n: number }>();
  for (const h of recent) {
    for (const [playerId, o] of h.odds) {
      if (!(o > 1)) continue;
      const s = sums.get(playerId) ?? { total: 0, n: 0 };
      s.total += o;
      s.n += 1;
      sums.set(playerId, s);
    }
  }
  const out = new Map<string, number>();
  for (const [playerId, s] of sums) out.set(playerId, Math.round((s.total / s.n) * 100) / 100);
  return out;
}
