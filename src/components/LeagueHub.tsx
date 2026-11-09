"use client";

import { useRouter } from "next/navigation";
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
  // Volet « Infos de la ligue » : replié par défaut
  const [infoOpen, setInfoOpen] = useState(false);
  const sentinel = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const back = () => {
    const fromSite = document.referrer.startsWith(window.location.origin);
    if (fromSite && window.history.length > 1) router.back();
    else router.push("/");
  };

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
        className={`sticky z-20 left-1/2 w-screen -translate-x-1/2 transition-colors duration-300 ${
          stuck ? "border-b border-neutral-200 bg-[var(--header-bg)] shadow-sm" : ""
        }`}
        style={{ top }}
      >
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-2 px-4 py-2">
        {/* Barre épinglée : flèche de retour, fine ligne, puis le titre (comme sur les autres pages) */}
        {stuck && (
          <>
            <button type="button" onClick={back} aria-label="Retour" className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-noir hover:bg-neutral-100 hover:text-rouge">
              <svg aria-hidden viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
            <span aria-hidden className="h-6 w-px shrink-0 bg-neutral-300" />
          </>
        )}
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
      </div>

      {sel === "general" ? (
        // Général R&N : l'information au-dessus, le classement en pleine largeur
        <div className="space-y-4">
          {props.panels.general}
          <StandingsBoard views={props.views} initial={sel} forcedKey={sel} hideSelector me={props.me} logos={props.logos} />
        </div>
      ) : (
        <div
          className={`grid items-start gap-4 transition-[grid-template-columns] duration-300 ${
            infoOpen ? "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : "lg:grid-cols-[3rem_minmax(0,1fr)]"
          }`}
        >
          {infoOpen ? (
            <div className="min-w-0 space-y-2">
              <button
                type="button"
                onClick={() => setInfoOpen(false)}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-neutral-600 hover:text-rouge"
              >
                <span aria-hidden>‹</span> Replier les infos de la ligue
              </button>
              {props.panels[sel]}
            </div>
          ) : (
            // Volet rangé : onglet vertical sur ordinateur, bouton sur mobile
            <button
              type="button"
              onClick={() => setInfoOpen(true)}
              aria-expanded={false}
              title="Afficher les infos de la ligue"
              className="group flex items-center justify-center gap-2 rounded-xl border border-dashed border-neutral-300 bg-[var(--color-surface)] px-3 py-2.5 text-sm font-semibold text-neutral-600 transition-colors hover:border-rouge hover:text-rouge lg:min-h-72 lg:flex-col lg:px-0 lg:py-4"
            >
              <span aria-hidden className="grid h-7 w-7 place-items-center rounded-full bg-rouge text-white transition-transform group-hover:translate-x-0.5">
                ›
              </span>
              <span className="lg:[writing-mode:vertical-rl] lg:rotate-180">Infos, gestion et invitations de la ligue</span>
            </button>
          )}
          <div className="min-w-0 space-y-2">
            {!infoOpen && (
              <p className="hidden items-center gap-1.5 text-xs text-neutral-500 lg:flex">
                <span aria-hidden className="animate-pulse text-rouge">←</span>
                Clique sur le volet à gauche pour voir les infos de la ligue, la gérer, tes spécialités restantes et l’invitation.
              </p>
            )}
            <StandingsBoard views={props.views} initial={sel} forcedKey={sel} hideSelector me={props.me} logos={props.logos} />
          </div>
        </div>
      )}
    </div>
  );
}
