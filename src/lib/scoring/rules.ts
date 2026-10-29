// Barème centralisé. Toute la logique de points passe par ce module, côté serveur.

export type Outcome = "WIN" | "DRAW" | "LOSS";
export type ScoreCategory = "EXACT" | "GOAL_DIFF" | "OUTCOME" | "WRONG" | "MISSING";

/** Un score toujours exprimé du point de vue de Rennes. */
export interface ScoreLine {
  rennes: number;
  opponent: number;
}

export interface ScoringRules {
  version: number;
  points: {
    exact: number; // score exact
    goalDiff: number; // bon résultat + bon écart
    outcome: number; // bon résultat, mauvais écart
    wrong: number; // mauvais résultat
    missing: number; // aucun pronostic avant le coup d'envoi
  };
  /** Score retenu pour les matchs à élimination directe (tirs au but jamais comptés). */
  knockoutScoreBasis: "REGULATION" | "AFTER_EXTRA_TIME";
  /** Bonus buteur = cote décimale ÷ diviseur, arrondie à l'entier le plus proche, entre un minimum et un maximum. */
  scorerBonus: { oddsDivisor: number; minBonus: number; maxBonus: number };
  /** Bonus quand le participant choisit « Aucun buteur » et qu'aucun joueur rennais ne marque (0 = désactivé). */
  noScorerBonus: number;
  /** Règle de secours quand aucune cote n'a été figée pour le buteur choisi. */
  scorerFallback: { mode: "FIXED" | "NONE"; fixedBonus: number };
}

export const DEFAULT_RULES: ScoringRules = {
  version: 3,
  points: { exact: 4, goalDiff: 2, outcome: 1, wrong: 0, missing: -1 },
  knockoutScoreBasis: "AFTER_EXTRA_TIME",
  scorerBonus: { oddsDivisor: 2, minBonus: 1, maxBonus: 6 },
  noScorerBonus: 2,
  scorerFallback: { mode: "FIXED", fixedBonus: 1 },
};
