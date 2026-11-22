// « Les Trésors du Terroir » : bonus joués dans UNE ligue (fonctions pures, testées).
//  - Les Menhirs bretons : +2 points si le Stade Rennais n'encaisse aucun but (clean sheet) ;
//  - La Crêpe flambée : les points du buteur sont doublés ;
//  - La Bigouden : les points du score sont doublés.

export type BonusKind = "MENHIRS" | "CREPE_FLAMBEE" | "BIGOUDEN";
export const BONUS_KINDS: BonusKind[] = ["MENHIRS", "CREPE_FLAMBEE", "BIGOUDEN"];
export type BonusQuotas = Record<BonusKind, number>;
export const DEFAULT_BONUS_QUOTAS: BonusQuotas = { MENHIRS: 2, CREPE_FLAMBEE: 2, BIGOUDEN: 2 };

/** Nom de la famille de bonus, affiché partout sur le site */
export const BONUS_FAMILY = "Les Trésors du Terroir";
/** Points des Menhirs bretons en cas de clean sheet */
export const MENHIRS_POINTS = 2;

export const BONUS_INFO: Record<BonusKind, { name: string; short: string; effect: string; tagline: string; flash: string }> = {
  MENHIRS: {
    name: "Les Menhirs bretons",
    short: "Menhirs",
    effect: "+2 points si le SRFC n’encaisse aucun but",
    tagline: "Ça fait 5 000 ans qu’ils tiennent debout, c’est pas un attaquant qui va les faire tomber. +2 points pour un clean sheet du SRFC !",
    flash: "Clean sheet +2",
  },
  CREPE_FLAMBEE: {
    name: "La Crêpe flambée",
    short: "Crêpe flambée",
    effect: "Points du buteur doublés",
    tagline: "Un trait de lambig, une étincelle, et tes points s’enflamment ! Ton buteur est en feu : ses points x2 !",
    flash: "Buteur ×2",
  },
  BIGOUDEN: {
    name: "La Bigouden",
    short: "Bigouden",
    effect: "Points du score doublés",
    tagline: "Pas besoin de biniou pour faire les fous, vos points de score doublent d’un coup !",
    flash: "Score ×2",
  },
};

/** Nombre de bonus par saison : les réglages des anciens bonus reprennent les valeurs par défaut. */
export function normalizeQuotas(q: Partial<Record<string, number>> | null | undefined): BonusQuotas {
  if (!q || typeof q.MENHIRS !== "number") return { ...DEFAULT_BONUS_QUOTAS };
  return {
    MENHIRS: q.MENHIRS,
    CREPE_FLAMBEE: q.CREPE_FLAMBEE ?? DEFAULT_BONUS_QUOTAS.CREPE_FLAMBEE,
    BIGOUDEN: q.BIGOUDEN ?? DEFAULT_BONUS_QUOTAS.BIGOUDEN,
  };
}

/** Points AJOUTÉS par le bonus au total du match (le pronostic lui-même est noté normalement). */
export function bonusPoints(i: { kind: BonusKind; scorePoints: number; scorerPoints: number; cleanSheet: boolean }): number {
  switch (i.kind) {
    case "MENHIRS":
      return i.cleanSheet ? MENHIRS_POINTS : 0;
    case "CREPE_FLAMBEE":
      return Math.max(0, i.scorerPoints); // buteur qui ne marque pas : 0
    case "BIGOUDEN":
      return Math.max(0, i.scorePoints); // mauvais score : 0 (le −1 n'est pas doublé)
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
  if (i.kind === "CREPE_FLAMBEE" && (i.noScorerPick || !i.scorerId)) return "La Crêpe flambée : choisis d’abord un buteur rennais.";
  return null;
}

/** Le bonus demande-t-il un buteur rennais ? */
export const needsScorer = (kind: BonusKind) => kind === "CREPE_FLAMBEE";

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
