"use client";

import { useRef, useState, type ReactNode } from "react";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import { CompetitionBadge } from "./CompetitionBadge";

/**
 * Boutons de sélection de la compétition (logo + nom) : seule la liste choisie est affichée.
 * Elle arrive par la droite si l'on choisit un bouton plus à droite, par la gauche sinon.
 */
export function CompetitionTabs(props: {
  defaultCode: CompetitionCode;
  tabs: Array<{ code: CompetitionCode; count?: number; logo?: string | null; panel: ReactNode }>;
}) {
  const [selected, setSelected] = useState<CompetitionCode>(props.defaultCode);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const index = (c: CompetitionCode) => props.tabs.findIndex((t) => t.code === c);
  const changes = useRef(0);

  const choose = (c: CompetitionCode) => {
    if (c === selected) return;
    setDirection(index(c) > index(selected) ? "right" : "left");
    changes.current++;
    setSelected(c);
  };
  const active = props.tabs.find((t) => t.code === selected) ?? props.tabs[0];

  return (
    <div className="space-y-4">
      <div className={`grid gap-2 ${props.tabs.length === 2 ? "grid-cols-2" : "grid-cols-3"}`} role="group" aria-label="Choix de la compétition">
        {props.tabs.map((t) => {
          const c = COMPETITIONS[t.code];
          const on = t.code === selected;
          return (
            <button
              key={t.code}
              type="button"
              aria-pressed={on}
              onClick={() => choose(t.code)}
              className={`flex min-w-0 items-center justify-center gap-1.5 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-noir sm:gap-2 sm:text-sm ${
                on ? `${c.bgClass} border-transparent text-white shadow-sm` : "border-neutral-300 bg-surface text-neutral-800 hover:border-neutral-500"
              }`}
            >
              <CompetitionBadge code={t.code} logo={t.logo} size="md" />
              <span className="truncate">{c.label}</span>
              {t.count !== undefined && (
                <span className={`hidden rounded-full px-1.5 text-[11px] tabular-nums sm:inline ${on ? "bg-white/25" : "bg-neutral-100 text-neutral-600"}`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="overflow-hidden">
        <div
          key={`${active.code}-${changes.current}`}
          className={`space-y-3 ${direction === "right" ? "slide-from-right" : direction === "left" ? "slide-from-left" : ""}`}
        >
          {active.panel}
        </div>
      </div>
    </div>
  );
}
