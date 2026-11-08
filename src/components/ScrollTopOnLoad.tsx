"use client";

import { useEffect } from "react";

/**
 * Au chargement (ou au rafraîchissement) d'une page : on affiche toujours le haut de la page,
 * au lieu de revenir à l'endroit où l'on était. Un lien vers un match (#match-…) garde son défilement.
 */
export function ScrollTopOnLoad() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual";
    if (!window.location.hash) window.scrollTo(0, 0);
  }, []);
  return null;
}
