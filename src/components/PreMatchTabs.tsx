"use client";

import { useRef, useState, type ReactNode } from "react";

export interface PreMatchPanel {
  key: string;
  label: string;
  icon: ReactNode;
  hint?: string; // petit résumé affiché dans le bouton (ex. « 48 % »)
  content: ReactNode;
}

/**
 * Avant-match. Ordinateur : trois boutons (Probabilités · Comparatif · Confrontations), un seul panneau affiché,
 * qui glisse dans le sens du bouton choisi. Mobile : les trois panneaux à la suite, avec leur titre.
 */
export function PreMatchTabs({ panels, initial }: { panels: PreMatchPanel[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? panels[0]?.key);
  const [dir, setDir] = useState<"left" | "right" | null>(null);
  const changes = useRef(0);
  const idx = (k: string | undefined) => panels.findIndex((p) => p.key === k);

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Avant-match" className="hidden gap-2 md:grid" style={{ gridTemplateColumns: `repeat(${panels.length}, minmax(0, 1fr))` }}>
        {panels.map((p) => {
          const on = p.key === active;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                if (on) return;
                setDir(idx(p.key) > idx(active) ? "right" : "left");
                changes.current++;
                setActive(p.key);
              }}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-noir ${
                on ? "border-rouge bg-rouge text-white shadow-sm" : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400"
              }`}
            >
              <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full ${on ? "bg-white/20" : "bg-white text-rouge ring-1 ring-neutral-200"}`}>{p.icon}</span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold">{p.label}</span>
                {p.hint && <span className={`block truncate text-xs ${on ? "text-white/85" : "text-neutral-500"}`}>{p.hint}</span>}
              </span>
            </button>
          );
        })}
      </div>

      {panels.map((p) => {
        const on = p.key === active;
        return (
          <section
            key={p.key}
            role="tabpanel"
            aria-label={p.label}
            className={`rounded-xl border border-neutral-200 p-3 ${on ? "" : "md:hidden"}`}
          >
            {/* Titre visible sur mobile (sur ordinateur, le bouton sert de titre) */}
            <h4 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500 md:hidden">{p.label}</h4>
            <div
              key={on ? `${p.key}-${changes.current}` : p.key}
              className={on && dir ? (dir === "right" ? "slide-from-right" : "slide-from-left") : undefined}
            >
              {p.content}
            </div>
          </section>
        );
      })}
    </div>
  );
}
