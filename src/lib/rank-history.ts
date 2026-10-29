// Évolution de la position d'un joueur au classement, match après match (fonction pure, testée).
import { buildStandings, type ResultRow } from "@/lib/scoring/ranking";

export interface RankPoint {
  matchId: string;
  label: string;
  rank: number;
  of: number;
}

/**
 * Position du joueur après chacun des `n` derniers matchs notés (classement cumulé jusqu'à ce match).
 * `matches` : matchs notés, dans l'ordre chronologique.
 */
export function rankHistory(
  userId: string,
  participants: ReadonlyArray<{ userId: string; pseudo: string }>,
  results: ReadonlyArray<ResultRow & { matchId: string }>,
  matches: ReadonlyArray<{ id: string; label: string }>,
  n = 5,
): RankPoint[] {
  const out: RankPoint[] = [];
  const done = new Set<string>();
  for (const m of matches) {
    done.add(m.id);
    const standings = buildStandings(participants, results.filter((r) => done.has(r.matchId)));
    const me = standings.find((s) => s.userId === userId);
    if (me) out.push({ matchId: m.id, label: m.label, rank: me.rank, of: standings.length });
  }
  return out.slice(-n);
}
