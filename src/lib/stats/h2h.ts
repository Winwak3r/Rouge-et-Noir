// Confrontations directes : les derniers matchs entre les deux équipes, dans la même configuration
// (même équipe à domicile). Fonctions pures testées + récupération ESPN mise en cache 24 h.
import type { CompetitionCode } from "@/lib/competitions";
import { fetchTeamResults } from "./espn-results";
import type { CompResult } from "./match-stats";

export interface H2HMatch {
  date: Date;
  homeGoals: number;
  awayGoals: number;
  /** Résultat pour l'équipe qui reçoit : V, N ou D */
  result: "V" | "N" | "D";
}

/** Les `n` dernières rencontres où `homeId` recevait `awayId` (doublons retirés, plus récentes d'abord). */
export function pickHeadToHead(results: readonly CompResult[], homeId: number, awayId: number, n = 5, before = new Date()): H2HMatch[] {
  const seen = new Set<number>();
  return results
    .filter((r) => r.homeId === homeId && r.awayId === awayId && r.date < before && !seen.has(r.id) && seen.add(r.id))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, n)
    .map((r) => ({
      date: r.date,
      homeGoals: r.homeGoals,
      awayGoals: r.awayGoals,
      result: r.homeGoals > r.awayGoals ? "V" : r.homeGoals < r.awayGoals ? "D" : "N",
    }));
}

export function headToHeadSummary(list: readonly H2HMatch[]) {
  return {
    wins: list.filter((m) => m.result === "V").length,
    draws: list.filter((m) => m.result === "N").length,
    losses: list.filter((m) => m.result === "D").length,
  };
}

/**
 * Calendriers de l'équipe qui reçoit sur les dernières saisons (en parallèle, cache 24 h : le passé ne change pas),
 * dans la compétition du match.
 */
export async function fetchHeadToHead(opts: {
  slug: string;
  competition: CompetitionCode;
  homeId: number;
  awayId: number;
  seasonStartYear: number;
  seasons?: number;
  before?: Date;
}): Promise<H2HMatch[]> {
  const years = Array.from({ length: opts.seasons ?? 10 }, (_, i) => opts.seasonStartYear - i);
  const lists = await Promise.all(
    years.map((y) => fetchTeamResults(opts.slug, opts.competition, opts.homeId, y, { next: { revalidate: 24 * 3600 } }).catch(() => [])),
  );
  return pickHeadToHead(lists.flat(), opts.homeId, opts.awayId, 5, opts.before);
}
