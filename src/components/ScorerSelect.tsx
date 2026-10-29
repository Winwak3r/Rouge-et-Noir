"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { PlayerPhoto } from "./PlayerPhoto";

export interface ScorerOption {
  id: string;
  name: string;
  position: string | null;
  odds: number | null;
  bonus: number;
  role?: "starter" | "sub" | null; // feuille de match publiée : titulaire ou remplaçant
  photo?: string | null; // photo officielle du joueur
}

export const NO_SCORER = "aucun"; // même valeur que côté serveur

const POS: Record<string, string> = { F: "ATT", FW: "ATT", M: "MIL", MF: "MIL", D: "DÉF", DF: "DÉF", G: "GB", GK: "GB" };
export const posLabel = (p: string | null) => (p ? (POS[p.toUpperCase()] ?? null) : null);

/** Niveau 1 à 5 selon le bonus, relatif aux joueurs du match : plus c'est haut, plus c'est rare… et rentable. */
function level(bonus: number, min: number, max: number): number {
  if (max <= min) return 1;
  return 1 + Math.round(((bonus - min) / (max - min)) * 4);
}
const LEVEL_COLOR = ["", "bg-neutral-400", "bg-sky-500", "bg-amber-500", "bg-orange-500", "bg-rouge"];
const LEVEL_TEXT = ["", "text-neutral-600", "text-sky-700", "text-amber-700", "text-orange-700", "text-rouge"];

function Gauge({ lvl }: { lvl: number }) {
  return (
    <span aria-hidden className="inline-flex items-end gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <span key={i} className={`w-1 rounded-sm ${i <= lvl ? LEVEL_COLOR[lvl] : "bg-neutral-200"}`} style={{ height: 4 + i * 2 }} />
      ))}
    </span>
  );
}

interface Item {
  value: string;
  label: string;
  photo?: string | null;
  isPlayer?: boolean;
  pos: string | null;
  role?: "starter" | "sub" | null;
  bonus: number | null;
  lvl: number;
}

/**
 * Choix du buteur : « Pas de pari buteur » d'abord, puis « Aucun buteur rennais », puis les joueurs AVEC une cote,
 * du plus probable (moins de points) au moins probable (plus de points), avec une jauge et une couleur par niveau.
 */
export function ScorerSelect(props: {
  name: string;
  value: string;
  onChange: (v: string) => void;
  scorers: ScorerOption[];
  noScorerBonus: number;
  labelledBy: string;
  lineupPublished: boolean;
}) {
  const withOdds = props.scorers.filter((s) => s.odds !== null || s.id === props.value);
  const sorted = [...withOdds].sort((a, b) => (a.odds ?? 999) - (b.odds ?? 999) || a.name.localeCompare(b.name, "fr"));
  const bonuses = sorted.map((s) => s.bonus);
  const min = Math.min(...bonuses);
  const max = Math.max(...bonuses);
  const items: Item[] = [
    { value: "", label: "Pas de pari buteur", pos: null, bonus: null, lvl: 0 },
    ...(props.noScorerBonus > 0
      ? [{ value: NO_SCORER, label: "Aucun buteur rennais", pos: null, bonus: props.noScorerBonus, lvl: 0 }]
      : []),
    ...sorted.map((s) => ({
      value: s.id,
      label: s.name,
      photo: s.photo ?? null,
      isPlayer: true,
      pos: posLabel(s.position),
      role: s.role,
      bonus: s.bonus,
      lvl: level(s.bonus, min, max),
    })),
  ];

  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const id = useId();
  const current = items.find((i) => i.value === props.value) ?? items[0];

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);
  useEffect(() => {
    if (open) listRef.current?.querySelector<HTMLElement>(`[data-i="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const choose = (i: number) => {
    props.onChange(items[i].value);
    setOpen(false);
  };
  const onKey = (e: KeyboardEvent) => {
    if (!open && ["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      setActive(Math.max(0, items.indexOf(current)));
      setOpen(true);
      return;
    }
    if (!open) return;
    if (e.key === "ArrowDown") setActive((a) => Math.min(items.length - 1, a + 1));
    else if (e.key === "ArrowUp") setActive((a) => Math.max(0, a - 1));
    else if (e.key === "Home") setActive(0);
    else if (e.key === "End") setActive(items.length - 1);
    else if (e.key === "Enter" || e.key === " ") choose(active);
    else if (e.key === "Escape") setOpen(false);
    else return;
    e.preventDefault();
  };

  // Fonction (et non composant) : les lignes ne sont pas recréées à chaque survol.
  const row = (it: Item) => (
    <span className="flex w-full min-w-0 items-center gap-2">
      {it.isPlayer && <PlayerPhoto name={it.label} url={it.photo ?? null} size={26} />}
      <span className="min-w-0 flex-1 truncate">
        {it.label}
        {it.pos && <span className="ml-1 text-xs text-neutral-500">({it.pos})</span>}
        {it.role === "sub" && <span className="ml-1.5 rounded bg-neutral-100 px-1 text-[10px] font-medium text-neutral-600">remplaçant</span>}
      </span>
      {it.bonus !== null && (
        <>
          {it.lvl > 0 && <Gauge lvl={it.lvl} />}
          <span className={`w-14 shrink-0 text-right text-sm font-bold tabular-nums ${it.lvl > 0 ? LEVEL_TEXT[it.lvl] : "text-green-700"}`}>
            +{it.bonus} pt{it.bonus > 1 ? "s" : ""}
          </span>
        </>
      )}
    </span>
  );

  return (
    <div ref={ref} className="relative">
      <input type="hidden" name={props.name} value={props.value} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={props.labelledBy}
        aria-controls={`${id}-list`}
        onClick={() => {
          setActive(Math.max(0, items.indexOf(current)));
          setOpen((o) => !o);
        }}
        onKeyDown={onKey}
        className="input flex items-center gap-2 text-left"
      >
        {row(current)}
        <span aria-hidden className={`text-neutral-400 transition-transform ${open ? "rotate-180" : ""}`}>▾</span>
      </button>
      {open && (
        <ul
          ref={listRef}
          id={`${id}-list`}
          role="listbox"
          aria-labelledby={props.labelledBy}
          aria-activedescendant={`${id}-${active}`}
          tabIndex={-1}
          className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-lg border border-neutral-200 bg-surface p-1 shadow-lg"
        >
          {items.map((it, i) => (
            <li
              key={it.value || "none"}
              id={`${id}-${i}`}
              data-i={i}
              role="option"
              aria-selected={it.value === props.value}
              onPointerEnter={() => setActive(i)}
              onClick={() => choose(i)}
              className={`flex cursor-pointer items-center rounded px-2 py-2 text-sm ${i === active ? "bg-neutral-100" : ""} ${
                it.value === props.value ? "font-semibold" : ""
              } ${i === 1 && props.noScorerBonus > 0 ? "border-b border-neutral-200" : ""}`}
            >
              {row(it)}
            </li>
          ))}
          {sorted.length === 0 ? (
            <li className="px-2 py-2 text-xs italic text-neutral-500">Les buteurs et leurs points apparaissent environ 48 h avant le match.</li>
          ) : (
            <li className="border-t border-neutral-200 px-2 pt-2 pb-1 text-[11px] text-neutral-500">
              {props.lineupPublished
                ? "Feuille de match publiée : seuls les joueurs convoqués sont proposés."
                : "La feuille de match est publiée environ 1 h avant le coup d’envoi : la liste sera alors limitée aux joueurs convoqués."}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
