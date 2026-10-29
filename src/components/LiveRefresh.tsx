"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Pendant un match en cours : la page se met à jour toute seule toutes les 2 minutes
 * (sans rechargement complet : les accordéons ouverts et les formulaires restent en place).
 * Rien ne se passe quand l'onglet est en arrière-plan ; mise à jour immédiate au retour.
 */
export function LiveRefresh({ intervalMs = 120_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const tick = () => {
      if (document.visibilityState !== "visible") return;
      last = Date.now();
      router.refresh();
    };
    const timer = setInterval(tick, intervalMs);
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - last >= intervalMs) tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [router, intervalMs]);
  return null;
}
