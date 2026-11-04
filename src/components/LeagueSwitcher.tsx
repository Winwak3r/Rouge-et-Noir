"use client";

import { useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
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
export function LeagueSwitcher({
  leagues,
  activeId,
  variant = "header",
  className = "",
}: {
  leagues: L[];
  activeId: string | null;
  /** « bottom » : bouton de la barre du bas (mobile), la liste s'ouvre vers le haut */
  variant?: "header" | "bottom";
  className?: string;
}) {
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

  // Le nom complet tient-il à côté de la photo ? Sinon : photo seule (bloc réduit à la photo).
  const measure = useRef<HTMLSpanElement>(null);
  const [compact, setCompact] = useState(false);
  useLayoutEffect(() => {
    const wrap = ref.current;
    const row = wrap?.parentElement;
    if (!wrap || !row) return;
    const decide = () => {
      const gap = parseFloat(getComputedStyle(row).columnGap || "0") || 0;
      const others = [...row.children].filter((c) => c !== wrap && (c as HTMLElement).offsetParent !== null);
      const used = others.reduce((sum, c) => sum + (c as HTMLElement).getBoundingClientRect().width, 0) + gap * others.length;
      const available = row.clientWidth - used;
      // photo 28 + chevron 12 + 2 espaces de 8 + marges 2×10 + bordure 2 + le nom complet
      const needed = 28 + 12 + 16 + 20 + 2 + (measure.current?.offsetWidth ?? 0) + 2;
      setCompact(available < needed);
    };
    decide();
    const ro = new ResizeObserver(decide);
    ro.observe(row);
    return () => ro.disconnect();
  }, [sel.name]);
  const choose = (id: string) => {
    setOpen(false);
    if (id === current) return;
    setCurrent(id); // affichage immédiat
    window.dispatchEvent(new CustomEvent("league-view", { detail: id })); // la page Classements suit
    start(() => viewLeagueAction(id));
  };

  if (variant === "bottom") {
    return (
      <div ref={ref} data-tour="league" className={`relative flex justify-center ${className}`}>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className={`flex w-full flex-col items-center gap-0.5 pt-1.5 text-[10px] font-semibold ${open ? "text-rouge" : "text-neutral-600"}`}
        >
          <span className={`rounded-lg ${open ? "ring-2 ring-rouge" : ""} ${pending ? "opacity-60" : ""}`}>
            <Logo l={sel} size={26} />
          </span>
          <span className="max-w-[4.75rem] truncate">{sel.name}</span>
        </button>
        {open && (
          <ul role="listbox" aria-label="Choisir la ligue affichée" className="absolute bottom-full left-1 z-50 mb-3 w-max min-w-[13rem] max-w-[18rem] overflow-hidden rounded-xl border border-neutral-200 bg-surface p-1 shadow-xl">
            {leagues.map((l) => {
              const on = l.id === current;
              return (
                <li key={l.id} role="option" aria-selected={on} className={l.id === "general" ? "mt-1 border-t border-neutral-200 pt-1" : undefined}>
                  <button
                    type="button"
                    onClick={() => choose(l.id)}
                    className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2.5 text-left text-sm hover:bg-neutral-100 ${on ? "font-bold" : ""}`}
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
          </ul>
        )}
      </div>
    );
  }

  return (
    <div ref={ref} data-tour="league" className={`relative flex min-w-0 shrink ${className}`}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        title={sel.name}
        className={`hbox flex h-full min-w-0 items-center gap-2 rounded-[10px] border bg-neutral-50 py-1 text-left transition-colors hover:border-neutral-400 focus-visible:outline-2 focus-visible:outline-noir ${
          compact ? "px-1.5" : "px-2.5"
        } ${open ? "border-neutral-500" : "border-neutral-200"}`}
      >
        {/* Seule la photo quand le nom complet ne tient pas : le bloc se réduit alors à la photo */}
        <span className={`shrink-0 ${compact ? "[&>*]:!h-9 [&>*]:!w-9" : ""}`}>
          <Logo l={sel} size={28} />
        </span>
        {compact ? (
          <span className="sr-only">Ligue : {sel.name}</span>
        ) : (
          <span className="flex min-w-0 flex-col">
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500">Ligue</span>
            <span className={`whitespace-nowrap text-sm font-extrabold leading-tight ${pending ? "opacity-60" : ""}`}>{sel.name}</span>
          </span>
        )}
        <svg aria-hidden className={`shrink-0 text-rouge transition-transform ${open ? "rotate-180" : ""}`} viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {/* Mesure invisible du nom complet (même police) pour décider de l'affichage */}
      <span ref={measure} aria-hidden className="pointer-events-none invisible absolute left-0 top-0 whitespace-nowrap text-sm font-extrabold">
        {sel.name}
      </span>
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
