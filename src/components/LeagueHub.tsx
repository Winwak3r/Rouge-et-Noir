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
  const sentinel = useRef<HTMLDivElement>(null);
  // Mobile : « Classement » ou « Infos de ligue » (deux boutons épinglés sous la barre des ligues)
  const [mTab, setMTab] = useState<"rank" | "info">("rank");
  const barRef = useRef<HTMLDivElement>(null);
  const [barH, setBarH] = useState(0);
  useEffect(() => {
    const el = barRef.current;
    if (!el) return;
    const measure = () => setBarH(el.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
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
        ref={barRef}
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
                title={v.name}
                aria-label={v.name}
                className={`inline-flex items-center gap-2 rounded-md border py-1 pl-1 text-sm font-semibold transition-colors ${stuck ? "pr-1 sm:pr-3" : "pr-3"} ${
                  on ? "border-rouge bg-rouge text-white" : "border-neutral-300 bg-[var(--color-surface)] hover:border-neutral-500"
                }`}
              >
                {v.key === "general" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/icon-192.png" alt="" className="h-7 w-7 rounded-md" />
                ) : (
                  <LeagueAvatar leagueId={v.key} name={v.name} at={v.imageAt} size={28} className="rounded-md" />
                )}
                <span className={stuck ? "hidden sm:inline" : ""}>{v.name}</span>
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
        // Ligue : infos à gauche (plus étroit), classement à droite (plus large) ; mobile : l'un ou l'autre
        <div className="space-y-3">
          <div
            role="tablist"
            className="sticky z-[19] -mx-4 grid grid-cols-2 divide-x divide-neutral-200 border-y border-neutral-200 lg:hidden"
            style={{ top: top + barH }}
          >
            {(
              [
                ["rank", "Classement"],
                ["info", "Infos de ligue"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                role="tab"
                aria-selected={mTab === k}
                onClick={() => setMTab(k)}
                className={`py-2.5 text-sm font-bold transition-colors ${mTab === k ? "bg-rouge text-white" : "bg-neutral-100 text-neutral-600"}`}
              >
                {label}
              </button>
            ))}
          </div>
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
          <div className={`min-w-0 ${mTab === "info" ? "" : "hidden lg:block"}`}>{props.panels[sel]}</div>
          <div className={`min-w-0 ${mTab === "rank" ? "" : "hidden lg:block"}`}>
            <StandingsBoard views={props.views} initial={sel} forcedKey={sel} hideSelector me={props.me} logos={props.logos} />
          </div>
        </div>
        </div>
      )}
    </div>
  );
}
