"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import type { CompetitionCode } from "@/lib/competitions";
import { LeagueAvatar } from "./LeagueAvatar";
import { StandingsBoard, type BoardView } from "./StandingsBoard";

/**
 * « Mes Ligues » : ligne de sélection (« Mes Ligues : » + une pastille par ligue), collée sous l'en-tête au
 * défilement — le libellé devient alors le titre « MES LIGUES ». Dessous : le classement (à gauche) et les infos
 * de la ligue choisie (à droite).
 */
export function LeagueHub(props: {
  views: BoardView[];
  initial: string;
  me: string | null;
  logos: Partial<Record<CompetitionCode, string>>;
  panels: Record<string, ReactNode>;
}) {
  const [sel, setSel] = useState(props.views.some((v) => v.key === props.initial) ? props.initial : props.views[0]?.key);
  const [top, setTop] = useState(0);
  const [stuck, setStuck] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const head = document.querySelector("header");
    if (!head) return;
    const measure = () => setTop(head.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);
  // La ligne est « collée » dès que le repère placé juste au-dessus passe sous l'en-tête
  useEffect(() => {
    const el = sentinel.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < top + 1), {
      rootMargin: `-${Math.round(top)}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [top]);

  return (
    <div className="space-y-4">
      <div ref={sentinel} aria-hidden className="h-px" />
      <div
        className={`sticky z-20 -mx-4 flex flex-wrap items-center gap-2 px-4 py-2 transition-colors duration-300 ${
          stuck ? "border-b border-neutral-200 bg-[var(--header-bg)] shadow-sm" : ""
        }`}
        style={{ top }}
      >
        <span
          className={`mr-1 shrink-0 transition-all duration-300 ${
            stuck ? "font-display text-xl font-bold uppercase tracking-wide text-rouge sm:text-2xl" : "text-sm font-semibold text-neutral-600"
          }`}
        >
          {stuck ? "Mes Ligues" : "Mes Ligues :"}
        </span>
        <div role="tablist" aria-label="Ligue affichée" className="flex flex-wrap gap-2">
          {props.views.map((v) => {
            const on = v.key === sel;
            return (
              <button
                key={v.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => setSel(v.key)}
                className={`inline-flex items-center gap-2 rounded-md border py-1 pl-1 pr-3 text-sm font-semibold transition-colors ${
                  on ? "border-rouge bg-rouge text-white" : "border-neutral-300 bg-[var(--color-surface)] hover:border-neutral-500"
                }`}
              >
                {v.key === "general" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/icon-192.png" alt="" className="h-7 w-7 rounded" />
                ) : (
                  <LeagueAvatar leagueId={v.key} name={v.name} at={v.imageAt} size={28} />
                )}
                {v.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Ordinateur : deux blocs côte à côte (50 / 50) ; mobile : l'un sous l'autre */}
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <div className="min-w-0">
          <StandingsBoard views={props.views} initial={sel} forcedKey={sel} hideSelector me={props.me} logos={props.logos} />
        </div>
        <div className="min-w-0">{props.panels[sel]}</div>
      </div>
    </div>
  );
}
