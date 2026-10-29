"use client";

import Link from "next/link";
import { useState } from "react";
import type { ChipTone, CompRow, RowStatus } from "@/lib/match-view";
import { Avatar } from "./Avatar";

// Vert : exact · vert clair : bon écart · jaune : bon vainqueur · rouge : faux
// Pastille avant le score / le buteur — vert éclatant : exact · vert normal : bon écart · vert clair : bon vainqueur · rouge : faux
const DOT: Record<ChipTone, string | null> = {
  exact: "#00C853",
  diff: "#66BB6A",
  outcome: "#B9E4BB",
  wrong: "#E53935",
  neutral: null,
};
const DOT_TITLE: Record<ChipTone, string> = {
  exact: "Exact",
  diff: "Bon écart",
  outcome: "Bon vainqueur",
  wrong: "Faux",
  neutral: "",
};
const STATUS: Record<RowStatus, { text: string; cls: string; title: string }> = {
  ok: { text: "OK", cls: "text-green-700", title: "Pronostic saisi" },
  todo: { text: "AC", cls: "text-amber-700", title: "À compléter" },
  missing: { text: "—", cls: "text-neutral-400", title: "Non saisi" },
};

function Status({ label, s }: { label: string; s: RowStatus }) {
  const st = STATUS[s];
  return (
    <span>
      <span className="text-neutral-500">{label} : </span>
      <span className={`font-semibold ${st.cls}`} title={st.title}>
        {st.text}
      </span>
    </span>
  );
}

const pts = (n: number | null) => (n === null ? "—" : `${n > 0 ? "+" : ""}${n}`);

/** « Pronostics et points » (repris de F1 Pronos) : une ligne par joueur, « Détails » déplie son pronostic. */
export function Comparison({ rows, live = false }: { rows: CompRow[]; live?: boolean }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const allOpen = rows.length > 0 && rows.every((r) => open.has(r.userId));
  const toggleAll = () => setOpen(allOpen ? new Set() : new Set(rows.map((r) => r.userId)));
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <ul className="divide-y divide-neutral-200 overflow-hidden rounded-lg border border-neutral-200 bg-surface">
      <li className="flex items-stretch bg-neutral-50">
        <span className="flex-1" />
        <button
          type="button"
          onClick={toggleAll}
          aria-label={allOpen ? "Tout replier" : "Tout déplier"}
          className="flex w-11 shrink-0 items-center justify-center gap-1 border-l border-neutral-200 py-1 text-[10px] leading-none text-neutral-600 hover:bg-neutral-100 sm:w-[5.25rem] sm:text-[11px]"
        >
          <svg aria-hidden viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            {allOpen ? (
              <>
                <path d="M7 14l5-5 5 5" />
                <path d="M7 20l5-5 5 5" />
              </>
            ) : (
              <>
                <path d="M7 4l5 5 5-5" />
                <path d="M7 10l5 5 5-5" />
              </>
            )}
          </svg>
          <span className="hidden sm:inline">{allOpen ? "Tout replier" : "Tout déplier"}</span>
        </button>
      </li>
      {rows.map((r) => {
        const isOpen = open.has(r.userId);
        return (
          <li key={r.userId}>
            <div className="flex items-stretch">
              <div className="grid min-w-0 flex-1 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-0.5 px-3 py-1.5 text-sm sm:grid-cols-[12rem_1fr_auto] sm:gap-x-4">
                <Link
                  href={`/joueur/${r.userId}`}
                  className="flex min-w-0 items-center gap-2 rounded font-semibold hover:underline focus-visible:outline-2 focus-visible:outline-noir"
                  title={`Voir le profil de ${r.pseudo}`}
                >
                  <Avatar userId={r.userId} pseudo={r.pseudo} at={r.avatarAt} size={24} />
                  <span className="truncate">{r.pseudo}</span>
                  {r.mine && <span className="text-xs font-normal text-rouge">(moi)</span>}
                </Link>
                {/* Sur mobile : Score et Buteur sur une ligne sous le pseudo */}
                <span className="col-start-1 row-start-2 flex gap-3 text-xs sm:col-start-2 sm:row-start-1">
                  <Status label="Score" s={r.status} />
                  <Status label="Buteur" s={r.scorerStatus} />
                </span>
                <span className="col-start-2 row-span-2 row-start-1 shrink-0 text-right text-xs text-neutral-500 sm:col-start-3 sm:row-span-1">
                  Total{" "}
                  <strong className="ml-1 text-sm tabular-nums text-green-700">{r.total === null ? "—" : `${r.total} pts`}</strong>
                  {live && r.provisional && r.total !== null && (
                    <span className="ml-1.5 rounded bg-rouge px-1 py-px text-[10px] font-semibold uppercase text-white" title="Points calculés sur le score actuel">
                      live
                    </span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => toggle(r.userId)}
                aria-expanded={isOpen}
                className="flex w-11 shrink-0 flex-col items-center justify-center gap-0.5 border-l border-neutral-200 text-[10px] leading-none text-neutral-600 hover:bg-neutral-100 sm:w-[5.25rem] sm:flex-row sm:gap-1 sm:text-xs"
              >
                Détails
                <span aria-hidden className={`transition-transform duration-300 motion-reduce:transition-none ${isOpen ? "rotate-180" : ""}`}>
                  ▾
                </span>
              </button>
            </div>
            <div
              className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}
              aria-hidden={!isOpen}
              inert={!isOpen}
            >
              <div className="overflow-hidden">
                <div className="space-y-1 border-t border-neutral-200 bg-neutral-50 px-3 py-2">
                  {[
                    { key: "score", label: "Score", chip: r.score, short: null as string | null, points: r.scorePoints, empty: r.status === "ok" ? "À venir" : "—" },
                    { key: "scorer", label: "Buteur", chip: r.scorer, short: r.scorer?.shortLabel ?? null, points: r.scorerPoints, empty: r.visible ? "Pas de pari" : r.status === "ok" ? "À venir" : "—" },
                  ].map((line) => (
                    <div key={line.key} className="flex items-center gap-2">
                      <span className="w-14 shrink-0 text-xs text-neutral-500 sm:w-16">{line.label}</span>
                      <div className="min-w-0 flex-1">
                        {line.chip ? (
                          <span className="inline-flex items-center gap-1.5 rounded border border-neutral-300 px-1.5 py-0.5 text-xs font-semibold">
                            {DOT[line.chip.tone] && (
                              <span
                                role="img"
                                aria-label={DOT_TITLE[line.chip.tone]}
                                title={DOT_TITLE[line.chip.tone]}
                                className="inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-1 ring-black/10"
                                style={{ backgroundColor: DOT[line.chip.tone]! }}
                              />
                            )}
                            {line.short ? (
                              <>
                                {/* Mobile : initiale du prénom (« M. Al-Tamari ») */}
                                <span className="whitespace-nowrap sm:hidden">{line.short}</span>
                                <span className="hidden sm:inline">{line.chip.label}</span>
                              </>
                            ) : (
                              line.chip.label
                            )}
                          </span>
                        ) : (
                          <span className="text-xs italic text-neutral-400">{line.empty}</span>
                        )}
                      </div>
                      <span className="w-10 shrink-0 text-right text-sm font-semibold tabular-nums">{pts(line.points)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
