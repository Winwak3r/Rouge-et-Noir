"use client";

import { useRef, useState, type ReactNode, type TouchEvent } from "react";

export interface PreMatchPanel {
  key: string;
  label: string;
  shortLabel?: string; // libellé du bouton sur mobile
  icon: ReactNode;
  hint?: string; // petit résumé affiché dans le bouton sur ordinateur (ex. « 48 % »)
  content: ReactNode;
}

/**
 * Avant-match : trois boutons (Probabilités · Comparatif · Confrontations), un seul panneau affiché,
 * qui glisse dans le sens du bouton choisi. Sur mobile, on peut aussi balayer le panneau du doigt.
 */
export function PreMatchTabs({ panels, initial }: { panels: PreMatchPanel[]; initial?: string }) {
  const [active, setActive] = useState(initial ?? panels[0]?.key);
  const [dir, setDir] = useState<"left" | "right" | null>(null);
  const changes = useRef(0);
  const touch = useRef<{ x: number; y: number } | null>(null);
  const idx = (k: string | undefined) => panels.findIndex((p) => p.key === k);

  const go = (key: string) => {
    if (key === active) return;
    setDir(idx(key) > idx(active) ? "right" : "left");
    changes.current++;
    setActive(key);
  };

  // Balayage horizontal (mobile) : panneau suivant / précédent
  const onTouchStart = (e: TouchEvent) => {
    touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };
  const onTouchEnd = (e: TouchEvent) => {
    const t = touch.current;
    touch.current = null;
    if (!t) return;
    const dx = e.changedTouches[0].clientX - t.x;
    const dy = e.changedTouches[0].clientY - t.y;
    if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return; // geste trop court ou vertical (défilement)
    const next = panels[idx(active) + (dx < 0 ? 1 : -1)];
    if (next) go(next.key);
  };

  return (
    <div className="space-y-3">
      <div role="tablist" aria-label="Avant-match" className="grid gap-1.5 md:gap-2" style={{ gridTemplateColumns: `repeat(${panels.length}, minmax(0, 1fr))` }}>
        {panels.map((p) => {
          const on = p.key === active;
          return (
            <button
              key={p.key}
              type="button"
              role="tab"
              aria-selected={on}
              aria-label={p.label}
              onClick={() => go(p.key)}
              className={`flex min-w-0 flex-col items-center gap-1 rounded-xl border px-1 py-2 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-noir md:flex-row md:gap-3 md:px-3 md:py-2.5 md:text-left ${
                on ? "border-rouge bg-rouge text-white shadow-sm" : "border-neutral-200 bg-neutral-50 text-neutral-700 hover:border-neutral-400"
              }`}
            >
              <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full md:h-9 md:w-9 ${on ? "bg-white/20" : "bg-white text-rouge ring-1 ring-neutral-200"}`}>{p.icon}</span>
              <span className="min-w-0 max-w-full">
                <span className="block truncate text-[11px] font-bold md:hidden">{p.shortLabel ?? p.label}</span>
                <span className="hidden truncate text-sm font-bold md:block">{p.label}</span>
                {p.hint && <span className={`hidden truncate text-xs md:block ${on ? "text-white/85" : "text-neutral-500"}`}>{p.hint}</span>}
              </span>
            </button>
          );
        })}
      </div>

      <div className="overflow-hidden" data-swipe-ignore onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {panels.map((p) => {
          const on = p.key === active;
          return (
            <section key={p.key} role="tabpanel" aria-label={p.label} hidden={!on} className="rounded-xl border border-neutral-200 p-3">
              <div key={on ? `${p.key}-${changes.current}` : p.key} className={on && dir ? (dir === "right" ? "slide-from-right" : "slide-from-left") : undefined}>
                {p.content}
              </div>
            </section>
          );
        })}
      </div>

      {/* Mobile : points de position et indication du balayage */}
      <div className="flex items-center justify-center gap-1.5 md:hidden" aria-hidden>
        {panels.map((p) => (
          <span key={p.key} className={`h-1.5 rounded-full transition-all ${p.key === active ? "w-4 bg-rouge" : "w-1.5 bg-neutral-300"}`} />
        ))}
        <span className="ml-2 text-[10px] text-neutral-500">Balaye pour changer</span>
      </div>
    </div>
  );
}
