// Défilement de la page. Sur téléphone, la page défile dans un conteneur (#app-scroll) et non plus dans la
// fenêtre : la barre d'adresse du navigateur ne se replie plus, et le menu du bas reste parfaitement immobile.

/** Conteneur de défilement des pages (téléphone) ; sur ordinateur, c'est la fenêtre qui défile. */
export const APP_SCROLL_ID = "app-scroll";

/** Remonte en haut de la page, quel que soit l'élément qui défile. */
export function scrollPageTop(behavior: ScrollBehavior = "auto") {
  window.scrollTo({ top: 0, behavior });
  document.getElementById(APP_SCROLL_ID)?.scrollTo({ top: 0, behavior });
}

/** Écoute le défilement de la page (fenêtre ou conteneur) ; renvoie la fonction de nettoyage. */
export function onPageScroll(cb: () => void): () => void {
  const opts = { passive: true, capture: true } as const;
  document.addEventListener("scroll", cb, opts);
  return () => document.removeEventListener("scroll", cb, opts);
}
