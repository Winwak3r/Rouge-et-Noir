"use client";

import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";
import { takeNavDirection } from "@/lib/nav-direction";

/**
 * Recréé à chaque changement de page. Depuis la barre du bas (mobile), la page glisse dans le sens
 * du bouton touché ; sinon, léger fondu.
 */
export default function Template({ children }: { children: ReactNode }) {
  // Page d'un match : pas d'animation d'arrivée. Une animation de déplacement ferait de ce bloc le cadre de
  // référence de la page plein écran (position fixe), qui s'afficherait alors dans un petit cadre.
  const fullScreen = usePathname().startsWith("/match/");
  const [cls] = useState(() => {
    const d = takeNavDirection();
    return d ? `slide-from-${d}` : "page-enter";
  });
  return <div className={fullScreen ? undefined : cls}>{children}</div>;
}
