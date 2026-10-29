// Mode simulation (tests, repris de F1 Pronos) : résultat fictif sur un match pas encore joué,
// annulable sans toucher aux vraies données. Fonctions pures (aléa injectable pour les tests).

export interface SimulatedResult {
  rennes: number;
  opponent: number;
  /** Buteurs rennais tirés au sort (identifiants de joueurs), un par but de Rennes. */
  scorerIds: string[];
}

/** Nombre de buts plausible (0 à 4, plus souvent 0-2). */
function randomGoals(rng: () => number): number {
  const r = rng();
  return r < 0.25 ? 0 : r < 0.6 ? 1 : r < 0.85 ? 2 : r < 0.96 ? 3 : 4;
}

/**
 * Tire un score (ou prend celui imposé par l'admin) et un buteur pour chaque but rennais,
 * parmi les joueurs proposés (de préférence ceux qui ont une cote : les plus probables d'abord).
 */
export function simulateResult(
  candidates: string[],
  opts: { rennes?: number | null; opponent?: number | null } = {},
  rng: () => number = Math.random,
): SimulatedResult {
  const rennes = opts.rennes ?? randomGoals(rng);
  const opponent = opts.opponent ?? randomGoals(rng);
  const scorerIds: string[] = [];
  for (let i = 0; i < rennes && candidates.length > 0; i++) {
    // Tirage pondéré : les premiers de la liste (favoris) sortent plus souvent
    const weights = candidates.map((_, k) => 1 / (k + 1));
    let x = rng() * weights.reduce((a, b) => a + b, 0);
    let pick = 0;
    while (x > weights[pick] && pick < candidates.length - 1) x -= weights[pick++];
    scorerIds.push(candidates[pick]);
  }
  return { rennes, opponent, scorerIds };
}
