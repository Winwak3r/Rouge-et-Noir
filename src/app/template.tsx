"use client";

import { useState, type ReactNode } from "react";
import { takeNavDirection } from "@/lib/nav-direction";

/**
 * Recréé à chaque changement de page. Depuis la barre du bas (mobile), la page glisse dans le sens
 * du bouton touché ; sinon, léger fondu.
 */
export default function Template({ children }: { children: ReactNode }) {
  const [cls] = useState(() => {
    const d = takeNavDirection();
    return d ? `slide-from-${d}` : "page-enter";
  });
  return <div className={cls}>{children}</div>;
}
