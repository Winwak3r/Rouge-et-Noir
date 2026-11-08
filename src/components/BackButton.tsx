"use client";

import { usePathname, useRouter } from "next/navigation";

/** Ordinateur : « ← Retour » en haut à gauche de chaque page (sauf l'accueil), vers la page précédente. */
export function BackButton() {
  const pathname = usePathname();
  const router = useRouter();
  if (pathname === "/" || pathname.startsWith("/match/")) return null; // la page d'un match a sa propre flèche
  const back = () => {
    // Page ouverte directement (lien, favori) : pas de page précédente sur le site → accueil
    const fromSite = typeof document !== "undefined" && document.referrer.startsWith(window.location.origin);
    if (fromSite && window.history.length > 1) router.back();
    else router.push("/");
  };
  return (
    <button
      type="button"
      onClick={back}
      className="mb-4 hidden items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-neutral-600 transition-colors hover:text-rouge focus-visible:outline-2 focus-visible:outline-noir sm:inline-flex"
    >
      <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
      Retour
    </button>
  );
}
