"use client";

import { useRef, useState, type ReactNode } from "react";

/** Boutons d'onglets sur une ligne ; le contenu choisi glisse vers la gauche ou la droite. */
export function PanelTabs(props: { tabs: Array<{ key: string; label: string; content: ReactNode }>; label: string }) {
  const [sel, setSel] = useState(props.tabs[0]?.key);
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const changes = useRef(0);
  const idx = (k: string | undefined) => props.tabs.findIndex((t) => t.key === k);
  const active = props.tabs.find((t) => t.key === sel) ?? props.tabs[0];

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label={props.label} className="grid gap-2" style={{ gridTemplateColumns: `repeat(${props.tabs.length}, minmax(0, 1fr))` }}>
        {props.tabs.map((t) => {
          const on = t.key === active.key;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => {
                if (on) return;
                setDirection(idx(t.key) > idx(sel) ? "right" : "left");
                changes.current++;
                setSel(t.key);
              }}
              className={`min-w-0 truncate rounded-lg border px-2 py-2 text-xs font-bold uppercase tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-noir sm:text-sm ${
                on ? "border-transparent bg-noir text-page" : "border-neutral-300 bg-surface text-neutral-600 hover:border-neutral-500"
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
      <div className="overflow-hidden" role="tabpanel">
        <div key={`${active.key}-${changes.current}`} className={direction === "right" ? "slide-from-right" : direction === "left" ? "slide-from-left" : ""}>
          {active.content}
        </div>
      </div>
    </div>
  );
}
