import type { ScoreCategory } from "./rules";

export interface ResultRow {
  userId: string;
  category: ScoreCategory;
  totalPoints: number;
  correctScorer: boolean;
}

export interface Standing {
  rank: number;
  tied: boolean; // ex æquo après les trois critères de départage
  userId: string;
  pseudo: string;
  totalPoints: number;
  exactScores: number;
  goalDiffs: number; // bons écarts (hors scores exacts : catégories exclusives)
  outcomes: number; // bons résultats seuls
  scorers: number; // buteurs trouvés
  missing: number; // pronostics manquants
  scoredMatches: number;
}

/**
 * Tri : points, puis 1) scores exacts, 2) buteurs trouvés, 3) bons écarts.
 * Égalité persistante → même rang (1, 2, 2, 4). Aucun quatrième critère :
 * l'ordre alphabétique ne sert qu'à l'affichage à l'intérieur d'un ex æquo.
 * Pour un classement par compétition, filtrer les lignes avant l'appel.
 */
export function buildStandings(
  participants: ReadonlyArray<{ userId: string; pseudo: string }>,
  rows: ReadonlyArray<ResultRow>,
): Standing[] {
  const byUser = new Map<string, Standing>();
  for (const p of participants) {
    byUser.set(p.userId, {
      rank: 0,
      tied: false,
      userId: p.userId,
      pseudo: p.pseudo,
      totalPoints: 0,
      exactScores: 0,
      goalDiffs: 0,
      outcomes: 0,
      scorers: 0,
      missing: 0,
      scoredMatches: 0,
    });
  }

  for (const r of rows) {
    const s = byUser.get(r.userId);
    if (!s) continue; // participant désactivé ou hors périmètre
    s.totalPoints += r.totalPoints;
    s.scoredMatches += 1;
    if (r.category === "EXACT") s.exactScores += 1;
    else if (r.category === "GOAL_DIFF") s.goalDiffs += 1;
    else if (r.category === "OUTCOME") s.outcomes += 1;
    else if (r.category === "MISSING") s.missing += 1;
    if (r.correctScorer) s.scorers += 1;
  }

  const compare = (a: Standing, b: Standing): number =>
    b.totalPoints - a.totalPoints ||
    b.exactScores - a.exactScores ||
    b.scorers - a.scorers ||
    b.goalDiffs - a.goalDiffs;

  const list = [...byUser.values()].sort(
    (a, b) => compare(a, b) || a.pseudo.localeCompare(b.pseudo, "fr"),
  );

  list.forEach((s, i) => {
    const prev = list[i - 1];
    s.rank = prev && compare(prev, s) === 0 ? prev.rank : i + 1;
  });
  list.forEach((s, i) => {
    const prev = list[i - 1];
    const next = list[i + 1];
    s.tied =
      (prev !== undefined && prev.rank === s.rank) || (next !== undefined && next.rank === s.rank);
  });

  return list;
}
