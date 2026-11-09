// Sens de la transition entre deux onglets de la barre du bas (mobile) : la nouvelle page arrive
// de la droite si l'onglet touché est à droite de l'onglet actuel, de la gauche sinon.

/** Position des onglets de la barre du bas (le choix de la ligue n'est pas une page). */
export function tabIndex(path: string): number {
  if (path.startsWith("/actus") || path.startsWith("/classements-srfc")) return 0; // Actus (à gauche)
  if (path.startsWith("/ligue")) return 1; // /ligues et /ligue
  if (path === "/") return 2; // calendrier (centre)
  if (path.startsWith("/regles")) return 3;
  if (path.startsWith("/compte")) return 4;
  return -1;
}

export function directionBetween(from: string, to: string): "left" | "right" | null {
  const a = tabIndex(from);
  const b = tabIndex(to);
  if (a < 0 || b < 0 || a === b) return null;
  return b > a ? "right" : "left";
}

let pending: "left" | "right" | null = null;

/** Noté au toucher d'un onglet… */
export function setNavDirection(from: string, to: string) {
  pending = directionBetween(from, to);
}

/** … et lu une seule fois par la page qui s'affiche. */
export function takeNavDirection(): "left" | "right" | null {
  const d = pending;
  pending = null;
  return d;
}
