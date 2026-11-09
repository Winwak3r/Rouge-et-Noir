"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { CompetitionCode } from "@/lib/competitions";
import { LeagueAvatar } from "./LeagueAvatar";
import { StandingsBoard, type BoardView } from "./StandingsBoard";

/**
 * « Mes Ligues » : ligne « Mes Ligues : » + une pastille par ligue, puis les infos de la ligue et son classement.
 * Au défilement, des barres FIXES (posées par-dessus la page, sans la déplacer) apparaissent sous l'en-tête :
 *  1. la barre des ligues (flèche de retour, titre, ligues — images seules sur mobile) ;
 *  2. sur mobile, si l'on continue, les boutons « Classement » / « Infos de ligue » juste dessous.
 */
export function LeagueHub(props: {
  views: BoardView[];
  initial: string;
  me: string | null;
  logos: Partial<Record<CompetitionCode, string>>;
  panels: Record<string, ReactNode>;
  /** Ligues dont je suis administrateur */
  adminKeys?: string[];
}) {
  const router = useRouter();
  const [sel, setSel] = useState(props.views.some((v) => v.key === props.initial) ? props.initial : props.views[0]?.key);
  const [mTab, setMTab] = useState<"rank" | "info">("rank");
  const [top, setTop] = useState(0);
  const [showBar, setShowBar] = useState(false);
  const [showTabs, setShowTabs] = useState(false);
  const [mounted, setMounted] = useState(false);
  const barMark = useRef<HTMLDivElement>(null);
  const tabsMark = useRef<HTMLDivElement>(null);
  const BAR_H = 52; // hauteur de la barre fixe des ligues

  useEffect(() => setMounted(true), []);
  // Hauteur de l'en-tête du site
  useEffect(() => {
    const head = document.querySelector("header");
    if (!head) return;
    const measure = () => setTop(head.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);
  // Barres fixes : visibles dès que leurs repères passent sous l'en-tête (les repères ne bougent jamais)
  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const b = barMark.current?.getBoundingClientRect().top ?? Infinity;
        const t = tabsMark.current?.getBoundingClientRect().top ?? Infinity;
        setShowBar(b < top);
        setShowTabs(t < top + BAR_H);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [top, sel]);

  const back = () => {
    const fromSite = document.referrer.startsWith(window.location.origin);
    if (fromSite && window.history.length > 1) router.back();
    else router.push("/");
  };

  // Pastilles des ligues ; « compact » : images seules sur mobile (barre fixe)
  const leagueButtons = (compact: boolean) =>
    props.views.map((v) => {
      const on = v.key === sel;
      const admin = props.adminKeys?.includes(v.key);
      return (
        <button
          key={v.key}
          type="button"
          role="tab"
          aria-selected={on}
          title={v.name}
          aria-label={v.name}
          onClick={() => setSel(v.key)}
          className={`relative inline-flex shrink-0 items-center gap-2 rounded-md border py-1 pl-1 text-sm font-semibold transition-colors ${compact ? "pr-1 sm:pr-3" : "min-w-0 justify-center pr-3 sm:justify-start"} ${
            on ? "border-rouge bg-rouge text-white" : "border-neutral-300 bg-[var(--color-surface)] hover:border-neutral-500"
          }`}
        >
          {v.key === "general" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/icon-192.png" alt="" className="h-7 w-7 rounded-md" />
          ) : (
            <LeagueAvatar leagueId={v.key} name={v.name} at={v.imageAt} size={28} className="rounded-md" />
          )}
          <span className={compact ? "hidden sm:inline" : "truncate"}>{v.name}</span>
          {admin && (
            <span
              title="Tu es administrateur de cette ligue"
              className={`rounded px-1 py-px text-[9px] font-bold uppercase tracking-wide ${on ? "bg-white text-rouge" : "bg-rouge text-white"} ${
                compact ? "hidden sm:inline" : ""
              }`}
            >
              Admin
            </span>
          )}
        </button>
      );
    });

  const tabButtons = (
    <>
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
    </>
  );

  return (
    <div className="space-y-4">
      {/* Ligne des ligues (dans la page) */}
      {/* Mobile : 1 ou 2 ligues → une par ligne ; 3 → deux puis R&N en pleine largeur ; 4 → 2 × 2. Ordinateur : à la suite */}
      <div ref={barMark}>
        <div
          role="tablist"
          aria-label="Ligue affichée"
          className={`grid gap-2 sm:flex sm:flex-wrap ${props.views.length <= 2 ? "grid-cols-1" : "grid-cols-2"} ${
            props.views.length > 2 && props.views.length % 2 === 1 ? "[&>*:last-child]:col-span-2" : ""
          }`}
        >
          {leagueButtons(false)}
        </div>
      </div>

      {sel === "general" ? (
        // Général R&N : l'information au-dessus, le classement en pleine largeur
        <div className="space-y-4">
          {props.panels.general}
          <div>
            <h2 className="hidden mb-2 font-display text-xl font-bold uppercase tracking-wide text-rouge sm:text-2xl lg:block">Classement</h2>
            <StandingsBoard views={props.views} initial={sel} forcedKey={sel} hideSelector hideHeading me={props.me} logos={props.logos} />
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Mobile : Classement / Infos de ligue */}
          <div ref={tabsMark} role="tablist" className="-mx-4 grid grid-cols-2 divide-x divide-neutral-200 border-y border-neutral-200 lg:hidden">
            {tabButtons}
          </div>
          {/* Ordinateur : infos à gauche (plus étroit), classement à droite (plus large) ; mobile : l'un ou l'autre */}
          <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div className={`min-w-0 ${mTab === "info" ? "" : "hidden lg:block"}`}>
              {props.panels[sel]}
            </div>
            <div className={`min-w-0 ${mTab === "rank" ? "" : "hidden lg:block"}`}>
              <h2 className="hidden mb-2 font-display text-xl font-bold uppercase tracking-wide text-rouge sm:text-2xl lg:block">Classement</h2>
              <StandingsBoard views={props.views} initial={sel} forcedKey={sel} hideSelector hideHeading me={props.me} logos={props.logos} />
            </div>
          </div>
        </div>
      )}

      {/* Barres fixes, rendues dans <body> (indépendantes de l'animation d'arrivée de la page) */}
      {mounted &&
        createPortal(
          <>
            <div
              aria-hidden={!showBar}
              className={`fixed inset-x-0 z-[25] border-b border-neutral-200 bg-[var(--header-bg)] shadow-sm transition-all duration-300 ${
                showBar ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
              }`}
              style={{ top, height: BAR_H }}
            >
              <div className="mx-auto flex h-full max-w-5xl items-center gap-2 px-4">
                <button type="button" onClick={back} aria-label="Retour" tabIndex={showBar ? 0 : -1} className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-noir hover:bg-neutral-100 hover:text-rouge">
                  <svg aria-hidden viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M19 12H5M12 19l-7-7 7-7" />
                  </svg>
                </button>
                <span aria-hidden className="h-6 w-px shrink-0 bg-neutral-300" />
                <span className="shrink-0 font-display text-xl font-bold uppercase tracking-wide text-rouge sm:text-2xl">Mes Ligues</span>
                <div role="tablist" aria-label="Ligue affichée" className="ml-1 flex min-w-0 gap-1.5 overflow-x-auto sm:gap-2">
                  {leagueButtons(true)}
                </div>
              </div>
            </div>
            {sel !== "general" && (
              <div
                role="tablist"
                aria-hidden={!showTabs}
                className={`fixed inset-x-0 z-[24] grid grid-cols-2 divide-x divide-neutral-200 border-b border-neutral-200 shadow-sm transition-all duration-300 lg:hidden ${
                  showTabs && showBar ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
                }`}
                style={{ top: top + BAR_H }}
              >
                {tabButtons}
              </div>
            )}
          </>,
          document.body,
        )}
    </div>
  );
}
