// Indices de victoire / nul / victoire (1 à 5) à partir des cotes du match (fonctions pures, testées).

export interface OutcomeIndex {
  probability: number; // probabilité implicite, marge du bookmaker retirée
  level: 1 | 2 | 3 | 4 | 5;
}

/** Probabilités implicites (1/cote), ramenées à 100 % pour retirer la marge du bookmaker. */
export function impliedProbabilities(o: { home: number; draw: number; away: number }) {
  const inv = { home: 1 / o.home, draw: 1 / o.draw, away: 1 / o.away };
  const total = inv.home + inv.draw + inv.away;
  return { home: inv.home / total, draw: inv.draw / total, away: inv.away / total };
}

/** 1 très faible (< 15 %) · 2 faible (< 30 %) · 3 moyen (< 45 %) · 4 probable (< 60 %) · 5 très probable. */
export function indexLevel(p: number): OutcomeIndex["level"] {
  return p < 0.15 ? 1 : p < 0.3 ? 2 : p < 0.45 ? 3 : p < 0.6 ? 4 : 5;
}

export function outcomeIndices(o: { home: number; draw: number; away: number }) {
  const p = impliedProbabilities(o);
  const mk = (x: number): OutcomeIndex => ({ probability: x, level: indexLevel(x) });
  return { home: mk(p.home), draw: mk(p.draw), away: mk(p.away) };
}

/** Rouge → orange → jaune → vert clair → vert. */
export const LEVEL_COLORS = { 1: "#E53935", 2: "#FB8C00", 3: "#FBC02D", 4: "#8BC34A", 5: "#2E7D32" } as const;
export const LEVEL_LABELS = { 1: "Très faible", 2: "Faible", 3: "Moyen", 4: "Probable", 5: "Très probable" } as const;
