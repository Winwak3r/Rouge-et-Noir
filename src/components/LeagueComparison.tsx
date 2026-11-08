"use client";

import { useState, type ReactNode } from "react";
import type { CompRow } from "@/lib/match-view";
import { Comparison } from "./Comparison";

/**
 * « Pronostics et points » avec le choix de la ligue à droite du titre :
 * boutons sur ordinateur, liste déroulante sur mobile. Affiche les pronostics des joueurs de la ligue choisie.
 */
export function LeagueComparison(props: {
  title: ReactNode;
  views: Array<{ id: string; name: string; rows: CompRow[] }>;
  initial?: string;
  live: boolean;
  empty: ReactNode;
}) {
  const [sel, setSel] = useState(props.views.some((v) => v.id === props.initial) ? props.initial! : props.views[0]?.id);
  const view = props.views.find((v) => v.id === sel) ?? props.views[0];
  const many = props.views.length > 1;
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="[&>h3]:mb-0">{props.title}</div>
        {many && (
          <>
            {/* Ordinateur : un bouton par ligue */}
            <div role="tablist" aria-label="Ligue" className="hidden flex-wrap justify-end gap-1.5 sm:flex">
              {props.views.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  role="tab"
                  aria-selected={v.id === view?.id}
                  onClick={() => setSel(v.id)}
                  className={`rounded-full border px-3 py-1 text-sm font-semibold transition-colors ${
                    v.id === view?.id ? "border-rouge bg-rouge text-white" : "border-neutral-300 hover:border-neutral-500"
                  }`}
                >
                  {v.name}
                </button>
              ))}
            </div>
            {/* Mobile : liste déroulante */}
            <select aria-label="Ligue" value={view?.id} onChange={(e) => setSel(e.target.value)} className="input w-auto max-w-[60%] py-1.5 text-sm font-semibold sm:hidden">
              {props.views.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>
      {view && view.rows.length > 0 ? <Comparison rows={view.rows} live={props.live} /> : props.empty}
    </section>
  );
}
