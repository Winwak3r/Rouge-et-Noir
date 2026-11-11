"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { CompetitionCode } from "@/lib/competitions";
import { LeagueAvatar } from "./LeagueAvatar";
import { StandingsBoard, type BoardView } from "./StandingsBoard";

/** Panneau d'une ligue, en trois parties (placées différemment sur ordinateur et sur mobile). */
export interface LeaguePanel {
  info: ReactNode;
  bonus: ReactNode | null;
  invite: ReactNode | null;
}

const STEP_MS = 1000; // déplacement des ligues et apparition de leurs infos
const REVEAL_DELAY = 150; // Classement puis Spécialités : affichés presque aussitôt
const REVEAL_MS = 350; // durée de leur apparition
const T = "mb-2 font-display text-xl font-bold uppercase tracking-wide text-rouge sm:text-2xl";

/**
 * « Mes Ligues ».
 *  - Ordinateur : la ligue choisie se place toujours en premier à gauche (les autres glissent à sa droite) et ses infos
 *    apparaissent sur la même ligne ; puis « Classement » (80 %) et enfin « Mes spécialités maison » (20 %).
 *  - Mobile : tuiles des ligues, puis « Classement » / « Infos de ligue ».
 *  - Au défilement : barres fixes (ligues, puis Classement / Infos sur mobile).
 */
export function LeagueHub(props: {
  views: BoardView[];
  initial: string;
  me: string | null;
  logos: Partial<Record<CompetitionCode, string>>;
  panels: Record<string, LeaguePanel>;
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
  const BAR_H = 52;

  // Étapes d'apparition (ordinateur) : 0 ligues + infos · 1 Classement · 2 Spécialités
  const [stage, setStage] = useState(0);
  useEffect(() => {
    setStage(0);
    const a = window.setTimeout(() => setStage(1), REVEAL_DELAY);
    const b = window.setTimeout(() => setStage(2), REVEAL_DELAY * 2);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [sel]);

  // Déplacement animé des tuiles (ordinateur) : on mémorise leur position avant le changement, puis on les fait glisser
  const tileRefs = useRef(new Map<string, HTMLElement>());
  const before = useRef(new Map<string, DOMRect>());
  const choose = (key: string) => {
    if (key === sel) return;
    before.current = new Map([...tileRefs.current].map(([k, el]) => [k, el.getBoundingClientRect()]));
    setSel(key);
  };
  useLayoutEffect(() => {
    if (before.current.size === 0) return;
    for (const [k, el] of tileRefs.current) {
      const b = before.current.get(k);
      if (!b) continue;
      const a = el.getBoundingClientRect();
      const dx = b.left - a.left;
      const dy = b.top - a.top;
      if (dx || dy) {
        el.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "translate(0, 0)" }], {
          duration: STEP_MS,
          easing: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        });
      }
    }
    before.current = new Map();
  }, [sel]);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    const head = document.querySelector("header");
    if (!head) return;
    const measure = () => setTop(head.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);
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

  const image = (v: BoardView) =>
    v.key === "general" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/icon-192.png" alt="" className="h-full w-full object-cover" />
    ) : (
      <LeagueAvatar leagueId={v.key} name={v.name} at={v.imageAt} size={96} radius={0} className="!h-full !w-full !ring-0" />
    );

  // Tuile : image en bloc, nom en dessous (20 caractères, une ligne), contour rouge si sélectionnée
  const tile = (v: BoardView, size: string, withRef: boolean) => {
    const on = v.key === sel;
    const admin = props.adminKeys?.includes(v.key);
    const label = v.name.length > 20 ? `${v.name.slice(0, 20)}…` : v.name;
    return (
      <button
        key={v.key}
        ref={withRef ? (el) => void (el ? tileRefs.current.set(v.key, el) : tileRefs.current.delete(v.key)) : undefined}
        type="button"
        role="tab"
        aria-selected={on}
        title={v.name}
        onClick={() => choose(v.key)}
        className={`group flex min-w-0 shrink-0 flex-col items-center gap-1 ${size}`}
      >
        <span
          className={`relative block aspect-square w-full overflow-hidden rounded-xl border-2 bg-[var(--color-surface)] transition-colors ${
            on ? "border-rouge" : "border-neutral-200 group-hover:border-neutral-400"
          }`}
        >
          {image(v)}
          {admin && <span className="absolute right-0.5 top-0.5 rounded bg-rouge px-1 py-px text-[8px] font-bold uppercase tracking-wide text-white shadow">Admin</span>}
        </span>
        <span className={`block w-full truncate text-center text-[11px] font-semibold sm:text-sm ${on ? "text-rouge" : "text-neutral-700"}`}>{label}</span>
      </button>
    );
  };

  // Petites pastilles de la barre fixe (images seules sur mobile)
  const leagueButtons = () =>
    props.views.map((v) => {
      const on = v.key === sel;
      return (
        <button
          key={v.key}
          type="button"
          role="tab"
          aria-selected={on}
          title={v.name}
          aria-label={v.name}
          onClick={() => choose(v.key)}
          className={`inline-flex shrink-0 items-center gap-2 rounded-md border-2 bg-[var(--color-surface)] p-0.5 text-sm font-semibold transition-colors sm:pr-3 ${
            on ? "border-rouge" : "border-neutral-300 hover:border-neutral-500"
          }`}
        >
          <span className="block h-7 w-7 overflow-hidden rounded">{image(v)}</span>
          <span className="hidden max-w-[10rem] truncate sm:inline">{v.name}</span>
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

  const panel = props.panels[sel] ?? { info: null, bonus: null, invite: null };
  // Bord haut des spécialités aligné sur le bord haut du tableau du classement (sa taille reste celle de son contenu)
  const rankCol = useRef<HTMLDivElement>(null);
  const [tableTop, setTableTop] = useState<number | null>(null);
  useEffect(() => {
    const col = rankCol.current;
    if (!col) return;
    const measure = () => {
      const table = col.querySelector("table");
      const box = table?.parentElement ?? table; // cadre arrondi qui entoure le tableau
      if (!box) return setTableTop(null);
      setTableTop(box.getBoundingClientRect().top - col.getBoundingClientRect().top);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(col);
    return () => ro.disconnect();
  }, [sel, stage]);

  const board = <StandingsBoard views={props.views} initial={sel} forcedKey={sel} hideSelector hideHeading me={props.me} logos={props.logos} />;
  const ordered = [...props.views].sort((a, b) => (a.key === sel ? -1 : b.key === sel ? 1 : 0));
  const appear = (visible: boolean) =>
    `transition-all ease-out ${visible ? "translate-x-0 opacity-100" : "pointer-events-none translate-x-4 opacity-0"}`;
  const n = props.views.length;
  const mobileCols = n <= 1 ? "grid-cols-1" : n === 2 ? "grid-cols-2" : n === 3 ? "grid-cols-3" : "grid-cols-4";

  return (
    <div className="space-y-4">
      <div ref={barMark}>
        {/* Mobile : tuiles compactes, toutes sur une ligne (jusqu'à 4) */}
        <div role="tablist" aria-label="Ligue affichée" className={`grid gap-2 lg:hidden ${mobileCols}`}>
          {props.views.map((v) => tile(v, "w-full max-w-[5.5rem] justify-self-center", false))}
        </div>

        {/* Ordinateur : la ligue choisie en premier, ses infos juste à droite (même hauteur que la tuile),
            puis les autres ligues */}
        <div role="tablist" aria-label="Ligue affichée" className="hidden items-stretch gap-3 lg:flex">
          {ordered.slice(0, 1).map((v) => (
            // Un seul bloc : la photo (sans nom dessous) et les infos à droite, contour rouge
            <div
              key={v.key}
              ref={(el) => void (el ? tileRefs.current.set(v.key, el) : tileRefs.current.delete(v.key))}
              role="tab"
              aria-selected
              className="flex h-[7.5rem] min-w-0 flex-1 overflow-hidden rounded-xl border-2 border-rouge bg-[var(--color-surface)]"
            >
              <span className="relative block aspect-square h-full shrink-0 overflow-hidden">
                {image(v)}
                {props.adminKeys?.includes(v.key) && (
                  <span className="absolute right-1 top-1 rounded bg-rouge px-1 py-px text-[9px] font-bold uppercase tracking-wide text-white shadow">Admin</span>
                )}
              </span>
              <div key={`info-${sel}`} className="hub-fade-in min-w-0 flex-1 [&>section]:h-full [&>section]:rounded-none [&>section]:border-0 [&>section]:bg-transparent [&>section]:shadow-none">
                {panel.info}
              </div>
            </div>
          ))}
          {ordered.slice(1).map((v) => tile(v, "w-24", true))}
        </div>
      </div>

      {/* Ordinateur : Classement (80 %) puis Mes spécialités maison (20 %), l'un après l'autre */}
      <div className="hidden items-start gap-4 lg:flex">
        <div ref={rankCol} className={`min-w-0 ${panel.bonus ? "w-4/5" : "w-full"} ${appear(stage >= 1)}`} style={{ transitionDuration: `${REVEAL_MS}ms` }}>
          <h2 className={T}>Classement</h2>
          {board}
        </div>
        {panel.bonus && (
          <div className={`w-1/5 min-w-0 ${appear(stage >= 2)}`} style={{ transitionDuration: `${REVEAL_MS}ms`, marginTop: tableTop ?? 0 }}>
            {panel.bonus}
          </div>
        )}
      </div>
      {/* Mobile : Général → infos puis classement ; ligue → Classement / Infos de ligue */}
      <div className="lg:hidden">
        {sel === "general" ? (
          <div className="space-y-4">
            {panel.info}
            {board}
          </div>
        ) : (
          <div className="space-y-3">
            <div ref={tabsMark} role="tablist" className="-mx-4 grid grid-cols-2 divide-x divide-neutral-200 border-y border-neutral-200">
              {tabButtons}
            </div>
            {mTab === "rank" ? (
              board
            ) : (
              <div className="space-y-4">
                {panel.info}
                {panel.bonus}
              </div>
            )}
          </div>
        )}
      </div>

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
                  {leagueButtons()}
                </div>
                <a
                  href="/ligues/nouvelle"
                  aria-label="Créer ou rejoindre une ligue"
                  title="Créer ou rejoindre une ligue"
                  tabIndex={showBar ? 0 : -1}
                  className="ml-auto grid h-9 w-9 shrink-0 place-items-center rounded-full bg-green-600 text-white shadow-sm transition-colors hover:bg-green-700"
                >
                  <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </a>
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
