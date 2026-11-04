// Sens de la transition entre deux onglets de la barre du bas (mobile) : la nouvelle page arrive
// de la droite si l'onglet touché est à droite de l'onglet actuel, de la gauche sinon.

/** Position des onglets de la barre du bas (le choix de la ligue n'est pas une page). */
export function tabIndex(path: string): number {
  if (path === "/") return 1; // calendrier (centre)
  if (path.startsWith("/classements-srfc")) return -1; // classements officiels : hors barre
  if (path.startsWith("/ligue")) return 0; // /ligues et /ligue
  if (path.startsWith("/classement")) return 2;
  if (path.startsWith("/compte")) return 3;
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
