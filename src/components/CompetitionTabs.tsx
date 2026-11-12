"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";
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

  // Mobile : balayage horizontal d'un doigt → compétition voisine (vers la gauche = suivante)
  const touch = useRef<{ x: number; y: number } | null>(null);
  const onTouchStart = (e: TouchEvent) => {
    const el = e.target as HTMLElement;
    // Pas de changement depuis une zone qui défile en largeur ou un champ de saisie
    if (el.closest(".overflow-x-auto, input, select, textarea, [data-swipe-ignore]")) {
      touch.current = null;
      return;
    }
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // trop court, ou défilement vertical
    const next = props.tabs[index(selected) + (dx < 0 ? 1 : -1)];
    if (next) choose(next.code);
  };

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
      {/* Zone qui coupe le glissement entre compétitions : marge intérieure pour laisser la place au zoom des
          en-têtes au survol (sinon leurs bords et leur fond étaient rognés, seul le texte semblait grossir) */}
      <div className="-mx-6 overflow-hidden px-6 py-3 -my-3" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
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
