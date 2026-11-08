"use client";

import { useState, type ReactNode } from "react";

/** Matchs déjà joués du calendrier : masqués, affichables d'un clic. */
export function PastMatches({ count, children }: { count: number; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  if (count === 0) return null;
  return (
    <div className="space-y-3">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-[var(--color-surface)] px-3 py-2 text-sm font-semibold text-neutral-600 transition-colors hover:border-neutral-500 hover:text-noir"
      >
        <svg aria-hidden viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="M6 9l6 6 6-6" />
        </svg>
        {open ? "Masquer les matchs déjà joués" : `Afficher les matchs déjà joués (${count})`}
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  );
}
