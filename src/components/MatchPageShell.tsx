"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { SheetContext } from "./PredictionSheet";

/**
 * Page d'un match à pronostiquer : plein écran (au-dessus de l'en-tête et de la barre du bas),
 * sur le fond d'écran du thème. Retour : page précédente ; une fois enregistré : retour au calendrier.
 */
export function MatchPageShell({ matchId, children }: { matchId: string; children: ReactNode }) {
  const router = useRouter();
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  const close = () => {
    const fromSite = document.referrer.startsWith(window.location.origin);
    if (fromSite && window.history.length > 1) router.back();
    else router.push("/");
  };
  const done = () => router.push(`/#match-${matchId}`);
  return (
    <div className="wallpaper-bg fixed inset-0 z-[60]">
      {/* Même largeur que l'accueil */}
      <div className="mx-auto flex h-full w-full max-w-5xl flex-col sm:border-x sm:border-neutral-200 sm:shadow-2xl">
        <SheetContext.Provider value={{ close, done }}>{children}</SheetContext.Provider>
      </div>
    </div>
  );
}
