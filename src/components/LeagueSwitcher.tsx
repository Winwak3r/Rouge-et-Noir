"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { viewLeagueAction } from "@/app/actions/leagues";
import { LeagueAvatar } from "./LeagueAvatar";

interface L {
  id: string;
  name: string;
  imageAt: number | null;
}

/** Logo d'une ligue, ou favicon du site pour « Général R&N ». */
function Logo({ l, size }: { l: L; size: number }) {
  if (l.id === "general") {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src="/icon-192.png" alt="" width={size} height={size} className="shrink-0 rounded-lg ring-1 ring-neutral-300" style={{ width: size, height: size }} />;
  }
  return <LeagueAvatar leagueId={l.id} name={l.name} at={l.imageAt} size={size} />;
}

/** Liste des ligues de l'en-tête : la ligue choisie s'affiche aussitôt, la page se met à jour en arrière-plan. */
export function LeagueSwitcher({ leagues, activeId }: { leagues: L[]; activeId: string | null }) {
  const [current, setCurrent] = useState(activeId ?? leagues[0]?.id);
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  // Recalage sur le serveur seulement hors changement en cours (évite le retour en arrière)
  useEffect(() => {
    if (!pending) setCurrent(activeId ?? leagues[0]?.id);
  }, [activeId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    const onBoard = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (leagues.some((l) => l.id === id)) setCurrent(id);
    };
    window.addEventListener("league-board", onBoard);
    return () => window.removeEventListener("league-board", onBoard);
  }, [leagues]);

  const sel = leagues.find((l) => l.id === current) ?? leagues[0];
  const choose = (id: string) => {
    setOpen(false);
    if (id === current) return;
    setCurrent(id); // affichage immédiat
    window.dispatchEvent(new CustomEvent("league-view", { detail: id })); // la page Classements suit
    start(() => viewLeagueAction(id));
  };

  return (
    // @container : la largeur réellement disponible décide de l'affichage du texte
    <div ref={ref} className="@container relative min-w-[3.25rem] max-w-[11rem] flex-1 sm:max-w-[15rem]">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={sel.name}
        className={`flex w-full min-w-0 items-center justify-between gap-1 overflow-hidden rounded-[10px] border bg-neutral-50 px-1.5 py-1.5 @[8.5rem]:gap-2 @[8.5rem]:px-2.5 text-left transition-colors hover:border-neutral-400 focus-visible:outline-2 focus-visible:outline-noir ${
          open ? "border-neutral-500" : "border-neutral-200"
        }`}
      >
        {/* Image réduite quand la place manque : le chevron reste dans le bloc */}
        <span className="shrink-0 [&>*]:!h-6 [&>*]:!w-6 @[8.5rem]:[&>*]:!h-7 @[8.5rem]:[&>*]:!w-7">
          <Logo l={sel} size={28} />
        </span>
        {/* Pas la place pour « Ligue » : seul le logo s'affiche (le nom reste lu par les lecteurs d'écran) */}
        <span className="sr-only @[8.5rem]:hidden">{sel.name}</span>
        <span className="hidden min-w-0 flex-1 flex-col @[8.5rem]:flex">
          <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500">Ligue</span>
          <span className={`truncate text-sm font-extrabold leading-tight ${pending ? "opacity-60" : ""}`}>{sel.name}</span>
        </span>
        <svg aria-hidden className={`shrink-0 text-rouge transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <ul role="listbox" aria-label="Choisir la ligue affichée" className="absolute left-0 z-40 mt-1.5 w-max min-w-full max-w-[18rem] overflow-hidden rounded-xl border border-neutral-200 bg-surface p-1 shadow-lg">
          {leagues.map((l) => {
            const on = l.id === current;
            return (
              <li key={l.id} role="option" aria-selected={on} className={l.id === "general" ? "mt-1 border-t border-neutral-200 pt-1" : undefined}>
                <button
                  type="button"
                  onClick={() => choose(l.id)}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left text-sm transition-colors hover:bg-neutral-100 ${on ? "font-bold" : ""}`}
                >
                  <Logo l={l} size={28} />
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  {on && (
                    <svg aria-hidden className="shrink-0 text-rouge" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 12.5l5 5L20 6.5" />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
          <li className="mt-1 border-t border-neutral-200 pt-1">
            <a href="/ligues" className="block rounded-lg px-2 py-1.5 text-xs text-neutral-600 hover:bg-neutral-100">
              Gérer mes ligues ›
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}
