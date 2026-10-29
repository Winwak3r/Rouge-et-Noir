"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

interface Group {
  openId: string | null;
  toggle: (id: string) => void;
}
const Ctx = createContext<Group | null>(null);

/** Un seul match ouvert à la fois (comme les Grands Prix de F1 Pronos). */
export function AccordionGroup({ defaultOpenId, children }: { defaultOpenId?: string | null; children: ReactNode }) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  return (
    <Ctx.Provider value={{ openId, toggle: (id) => setOpenId((cur) => (cur === id ? null : id)) }}>{children}</Ctx.Provider>
  );
}

export const useAccordionGroup = () => useContext(Ctx);
