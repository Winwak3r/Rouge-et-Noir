// Statistiques d'avant-match : forme, buteurs récents, classements général / domicile / extérieur.
// Calculées à partir des résultats de la compétition (fonctions pures, testées).

export interface ResultGoal {
  teamId: number;
  player: string;
  ownGoal: boolean;
}

export interface CompResult {
  id: number;
  date: Date;
  homeId: number;
  awayId: number;
  homeName: string;
  awayName: string;
  homeGoals: number;
  awayGoals: number;
  goals: ResultGoal[] | null; // null : détail des buts non fourni
}

export interface FormEntry {
  result: "V" | "N" | "D";
  opponent: string;
  home: boolean;
  score: string; // « 2-1 » du point de vue de l'équipe
  date: Date;
}

/** Les n derniers matchs joués par l'équipe, du plus ancien au plus récent. */
export function teamForm(teamId: number, results: CompResult[], n = 5): FormEntry[] {
  return results
    .filter((r) => r.homeId === teamId || r.awayId === teamId)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-n)
    .map((r) => {
      const home = r.homeId === teamId;
      const gf = home ? r.homeGoals : r.awayGoals;
      const ga = home ? r.awayGoals : r.homeGoals;
      return {
        result: gf > ga ? "V" : gf < ga ? "D" : "N",
        opponent: home ? r.awayName : r.homeName,
        home,
        score: `${gf}-${ga}`,
        date: r.date,
      };
    });
}

export const formPoints = (f: FormEntry[]) => f.reduce((s, e) => s + (e.result === "V" ? 3 : e.result === "N" ? 1 : 0), 0);

/** Meilleurs buteurs de l'équipe sur ses n derniers matchs (hors buts contre son camp). */
export function recentScorers(teamId: number, results: CompResult[], n = 5): Array<{ player: string; goals: number }> {
  const last = results
    .filter((r) => r.homeId === teamId || r.awayId === teamId)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(-n);
  const count = new Map<string, number>();
  for (const r of last) {
    for (const g of r.goals ?? []) {
      if (g.teamId === teamId && !g.ownGoal) count.set(g.player, (count.get(g.player) ?? 0) + 1);
    }
  }
  return [...count.entries()]
    .map(([player, goals]) => ({ player, goals }))
    .sort((a, b) => b.goals - a.goals || a.player.localeCompare(b.player, "fr"));
}

export interface TableRow {
  teamId: number;
  name: string;
  rank: number;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
}

/** Classement calculé : général, à domicile ou à l'extérieur (points, différence, buts marqués). */
export function computeTable(results: CompResult[], venue: "all" | "home" | "away"): TableRow[] {
  const rows = new Map<number, TableRow>();
  const row = (id: number, name: string) => {
    if (!rows.has(id)) rows.set(id, { teamId: id, name, rank: 0, played: 0, won: 0, drawn: 0, lost: 0, goalsFor: 0, goalsAgainst: 0, points: 0 });
    return rows.get(id)!;
  };
  const add = (r: TableRow, gf: number, ga: number) => {
    r.played++;
    r.goalsFor += gf;
    r.goalsAgainst += ga;
    if (gf > ga) {
      r.won++;
      r.points += 3;
    } else if (gf === ga) {
      r.drawn++;
      r.points += 1;
    } else r.lost++;
  };
  for (const m of results) {
    const h = row(m.homeId, m.homeName);
    const a = row(m.awayId, m.awayName);
    if (venue !== "away") add(h, m.homeGoals, m.awayGoals);
    if (venue !== "home") add(a, m.awayGoals, m.homeGoals);
  }
  const list = [...rows.values()].filter((r) => r.played > 0);
  const cmp = (a: TableRow, b: TableRow) =>
    b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor;
  list.sort((a, b) => cmp(a, b) || a.name.localeCompare(b.name, "fr"));
  list.forEach((r, i) => (r.rank = i > 0 && cmp(list[i - 1], r) === 0 ? list[i - 1].rank : i + 1));
  return list;
}
