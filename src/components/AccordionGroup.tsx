"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface Group {
  openId: string | null;
  toggle: (id: string) => void;
}
const Ctx = createContext<Group | null>(null);

/**
 * Un seul match ouvert à la fois (comme les Grands Prix de F1 Pronos).
 * Une adresse « /#match-… » (clic sur une notification ou un e-mail) ouvre directement ce match.
 */
export function AccordionGroup({ defaultOpenId, children }: { defaultOpenId?: string | null; children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  useEffect(() => {
    const fromHash = () => {
      const m = /^#match-(.+)$/.exec(window.location.hash);
      if (!m) return;
      setOpenId(m[1]);
      setTimeout(() => document.getElementById(`match-${m[1]}`)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
      // Repère utilisé une seule fois : retiré de l'adresse, pour qu'un rafraîchissement reparte du haut de la page
      window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
    };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    return () => window.removeEventListener("hashchange", fromHash);
  }, []);
  return (
    <Ctx.Provider value={{ openId, toggle: (id) => setOpenId((cur) => (cur === id ? null : id)) }}>{children}</Ctx.Provider>
  );
}

export const useAccordionGroup = () => useContext(Ctx);
