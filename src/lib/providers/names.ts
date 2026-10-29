// Rapprochement des noms de joueurs entre sources (les cotes n'ont pas d'identifiant).

export function normalizeName(s: string): string {
  return s
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Renvoie l'identifiant du joueur correspondant, ou null si aucun ou plusieurs candidats.
 * 1) nom identique après normalisation ; 2) même nom de famille et même prénom ;
 * 3) même dernier mot, s'il est unique dans l'effectif.
 */
export function matchPlayerName<T extends { id: string; name: string }>(
  name: string,
  players: readonly T[],
): T | null {
  const target = normalizeName(name);
  if (!target) return null;
  const norm = players.map((p) => ({ p, n: normalizeName(p.name) }));

  const exact = norm.filter((x) => x.n === target);
  if (exact.length === 1) return exact[0].p;

  const tWords = target.split(" ");
  const first = tWords[0];
  const last = tWords[tWords.length - 1];

  const firstAndLast = norm.filter((x) => {
    const w = x.n.split(" ");
    return w[0] === first && w.some((part) => part === last || part.endsWith(last));
  });
  if (firstAndLast.length === 1) return firstAndLast[0].p;

  const lastOnly = norm.filter((x) => x.n.split(" ").at(-1) === last);
  if (lastOnly.length === 1) return lastOnly[0].p;

  return null;
}
