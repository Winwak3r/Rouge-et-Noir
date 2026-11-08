// « Les Spécialités Maison » : bonus joués dans UNE ligue (fonctions pures, testées).
//  - Le Kouign-Amann : tous les points du match sont doublés (score ET buteur) ;
//  - La Galette-Saucisse : les points du buteur sont doublés.

export type BonusKind = "KOUIGN_AMANN" | "GALETTE_SAUCISSE";
export const BONUS_KINDS: BonusKind[] = ["KOUIGN_AMANN", "GALETTE_SAUCISSE"];
export type BonusQuotas = Record<BonusKind, number>;
export const DEFAULT_BONUS_QUOTAS: BonusQuotas = { KOUIGN_AMANN: 2, GALETTE_SAUCISSE: 3 };

export const BONUS_INFO: Record<BonusKind, { name: string; effect: string; tagline: string }> = {
  KOUIGN_AMANN: {
    name: "Le Kouign-Amann",
    effect: "Points du match doublés (score et buteur)",
    tagline: "Kouign c’est la Reine des bonus. Vu les calories, c’est le pactole niveau points. X2 pour les points du score ET du buteur.",
  },
  GALETTE_SAUCISSE: {
    name: "La Galette-Saucisse",
    effect: "Points du buteur doublés",
    tagline: "Moutarde, ketchup, mayo ? Fais le bon choix, car ton buteur préféré verra ses points doublés !",
  },
};

/** Nombre de bonus par saison : les anciens réglages (avant les deux spécialités) reprennent les valeurs par défaut. */
export function normalizeQuotas(q: Partial<Record<string, number>> | null | undefined): BonusQuotas {
  if (!q || typeof q.GALETTE_SAUCISSE !== "number") return { ...DEFAULT_BONUS_QUOTAS };
  return { KOUIGN_AMANN: q.KOUIGN_AMANN ?? DEFAULT_BONUS_QUOTAS.KOUIGN_AMANN, GALETTE_SAUCISSE: q.GALETTE_SAUCISSE };
}

/** Points AJOUTÉS par le bonus au total du match (le pronostic lui-même est noté normalement). */
export function bonusPoints(i: { kind: BonusKind; matchTotal: number; scorerPoints: number }): number {
  switch (i.kind) {
    case "KOUIGN_AMANN":
      return Math.max(0, i.matchTotal); // 0 × 2 = 0 : le bonus est perdu
    case "GALETTE_SAUCISSE":
      return Math.max(0, i.scorerPoints); // buteur qui ne marque pas : 0
  }
}

/** Bonus encore disponibles dans une ligue : stock de la saison + ajouts de l'admin − bonus joués. */
export function remainingBonuses(
  quotas: BonusQuotas,
  used: ReadonlyArray<{ kind: BonusKind }>,
  granted: ReadonlyArray<{ kind: BonusKind; delta: number }> = [],
): BonusQuotas {
  const r = { ...quotas };
  for (const g of granted) r[g.kind] += g.delta;
  for (const u of used) r[u.kind] -= 1;
  for (const k of BONUS_KINDS) r[k] = Math.max(0, r[k]);
  return r;
}

/** Bonus jouable avec ce pronostic ? Renvoie un message d'erreur, ou null. */
export function bonusChoiceError(i: { kind: BonusKind; hasScore: boolean; scorerId: string | null; noScorerPick: boolean }): string | null {
  if (!i.hasScore) return "Enregistre d’abord un score pour jouer un bonus.";
  if (i.kind === "GALETTE_SAUCISSE" && (i.noScorerPick || !i.scorerId)) return "La Galette-Saucisse : choisis d’abord un buteur rennais.";
  return null;
}

/** Ajoute aux résultats d'une ligue les points de ses bonus (même match, même joueur). */
export function withBonuses<T extends { userId: string; matchId: string; totalPoints: number }>(
  results: readonly T[],
  bonuses: ReadonlyArray<{ userId: string; matchId: string; points: number | null }>,
): T[] {
  const extra = new Map<string, number>();
  for (const b of bonuses) if (b.points) extra.set(`${b.userId}|${b.matchId}`, (extra.get(`${b.userId}|${b.matchId}`) ?? 0) + b.points);
  return results.map((r) => {
    const e = extra.get(`${r.userId}|${r.matchId}`);
    return e ? { ...r, totalPoints: r.totalPoints + e } : r;
  });
}
