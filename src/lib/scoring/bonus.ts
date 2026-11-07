// « Les Spécialités Maison » : bonus joués dans UNE ligue (fonctions pures, testées).
//  - Le Kouign-Amann : les points du match sont doublés ;
//  - Les Galettes Saucisses : un second buteur qui rapporte ses propres points ;
//  - La Pile de Crêpes : les points du buteur sont comptés à chaque but qu'il marque (sans plafond).

export type BonusKind = "KOUIGN_AMANN" | "GALETTES_SAUCISSES" | "PILE_CREPES";
export const BONUS_KINDS: BonusKind[] = ["KOUIGN_AMANN", "GALETTES_SAUCISSES", "PILE_CREPES"];
export type BonusQuotas = Record<BonusKind, number>;
export const DEFAULT_BONUS_QUOTAS: BonusQuotas = { KOUIGN_AMANN: 1, GALETTES_SAUCISSES: 2, PILE_CREPES: 2 };

export const BONUS_INFO: Record<BonusKind, { name: string; effect: string; tagline: string }> = {
  KOUIGN_AMANN: {
    name: "Le Kouign-Amann",
    effect: "Points du match doublés",
    tagline: "Deux fois plus de beurre, deux fois plus de points. À déguster une seule fois dans la saison.",
  },
  GALETTES_SAUCISSES: {
    name: "Les Galettes Saucisses",
    effect: "Un second buteur qui rapporte ses points",
    tagline: "Ketchup pour la première, moutarde pour la seconde : au final c’est deux chances de régaler.",
  },
  PILE_CREPES: {
    name: "La Pile de Crêpes",
    effect: "Les points du buteur à chaque but",
    tagline: "Chaque but de ton buteur ajoute une crêpe sur la pile… et les points qui vont avec. Doublé, triplé : sers-toi !",
  },
};

/** Points AJOUTÉS par le bonus au total du match (le pronostic lui-même est noté normalement). */
export function bonusPoints(i: {
  kind: BonusKind;
  matchTotal: number; // points du pronostic sur ce match (score + buteur)
  scorerId: string | null; // buteur choisi
  scorerPoints: number; // points rapportés par ce buteur s'il a marqué (sinon 0)
  secondScorerId?: string | null;
  secondScorerBonus?: number | null; // points du second buteur s'il marque
  rennesGoalScorerIds: readonly string[]; // un identifiant par but rennais (hors contre son camp)
}): number {
  switch (i.kind) {
    case "KOUIGN_AMANN":
      return Math.max(0, i.matchTotal); // 0 × 2 = 0 : le bonus est perdu
    case "GALETTES_SAUCISSES":
      return i.secondScorerId && i.rennesGoalScorerIds.includes(i.secondScorerId) ? (i.secondScorerBonus ?? 0) : 0;
    case "PILE_CREPES": {
      if (!i.scorerId || i.scorerPoints <= 0) return 0;
      const goals = i.rennesGoalScorerIds.filter((x) => x === i.scorerId).length;
      return goals > 1 ? i.scorerPoints * (goals - 1) : 0; // le 1er but est déjà compté par le pronostic
    }
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
export function bonusChoiceError(i: {
  kind: BonusKind;
  hasScore: boolean;
  scorerId: string | null;
  noScorerPick: boolean;
  secondScorerId?: string | null;
}): string | null {
  if (!i.hasScore) return "Enregistre d’abord un score pour jouer un bonus.";
  if (i.kind === "GALETTES_SAUCISSES" || i.kind === "PILE_CREPES") {
    if (i.noScorerPick || !i.scorerId) return `${BONUS_INFO[i.kind].name} : choisis d’abord un buteur rennais.`;
  }
  if (i.kind === "GALETTES_SAUCISSES") {
    if (!i.secondScorerId) return "Les Galettes Saucisses : choisis ton second buteur.";
    if (i.secondScorerId === i.scorerId) return "Les Galettes Saucisses : le second buteur doit être différent du premier.";
  }
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
