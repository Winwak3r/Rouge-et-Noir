"use client";

import { useRef, useState, type ReactNode } from "react";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import { CompetitionBadge } from "./CompetitionBadge";

type View = "table" | "scorers";

/**
 * Deux compétitions côte à côte ; sous chacune, « Classement » et « Classement buteurs »
 * se partagent la largeur du bouton. Le contenu glisse vers la gauche ou la droite selon le choix.
 */
export function StandingsTabs(props: {
  competitions: Array<{ code: CompetitionCode; logo: string | null; table: ReactNode; scorers: ReactNode }>;
}) {
  const [sel, setSel] = useState<{ code: CompetitionCode; view: View }>({ code: props.competitions[0].code, view: "table" });
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const changes = useRef(0);
  const order = (code: CompetitionCode, view: View) =>
    props.competitions.findIndex((c) => c.code === code) * 2 + (view === "scorers" ? 1 : 0);

  const choose = (code: CompetitionCode, view: View) => {
    if (code === sel.code && view === sel.view) return;
    setDirection(order(code, view) > order(sel.code, sel.view) ? "right" : "left");
    changes.current++;
    setSel({ code, view });
  };
  const active = props.competitions.find((c) => c.code === sel.code)!;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Choix du classement">
        {props.competitions.map((c) => {
          const comp = COMPETITIONS[c.code];
          const on = c.code === sel.code;
          const sub = (view: View, label: string) => {
            const subOn = on && sel.view === view;
            return (
              <button
                type="button"
                aria-pressed={subOn}
                onClick={() => choose(c.code, view)}
                className={`min-w-0 truncate rounded-md border px-1.5 py-1.5 text-[11px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-noir sm:text-xs ${
                  subOn
                    ? `${comp.bgClass} border-transparent text-white`
                    : on
                      ? `border-current bg-surface ${comp.textClass}`
                      : "border-neutral-300 bg-surface text-neutral-700 hover:border-neutral-500"
                }`}
              >
                {label}
              </button>
            );
          };
          return (
            <div key={c.code} className="space-y-1.5">
              <button
                type="button"
                aria-pressed={on}
                onClick={() => choose(c.code, on ? sel.view : "table")}
                className={`flex w-full min-w-0 items-center justify-center gap-2 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-noir sm:text-sm ${
                  on ? `${comp.bgClass} border-transparent text-white shadow-sm` : "border-neutral-300 bg-surface text-neutral-800 hover:border-neutral-500"
                }`}
              >
                <CompetitionBadge code={c.code} logo={c.logo} size="md" />
                <span className="truncate">{comp.label}</span>
              </button>
              <div className="grid grid-cols-2 gap-1.5">
                {sub("table", "Classement")}
                {sub("scorers", "Buteurs")}
              </div>
            </div>
          );
        })}
      </div>
      <div className="overflow-hidden">
        <div
          key={`${sel.code}-${sel.view}-${changes.current}`}
          className={direction === "right" ? "slide-from-right" : direction === "left" ? "slide-from-left" : ""}
        >
          {sel.view === "table" ? active.table : active.scorers}
        </div>
      </div>
    </div>
  );
}
