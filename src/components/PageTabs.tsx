"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Onglets de page, de même largeur, sans arrondi (comme sur la page d'un match). */
export function PageTabs({ tabs, initial }: { tabs: Array<{ key: string; label: string; content: ReactNode; hidden?: boolean }>; initial?: string }) {
  const [tab, setTab] = useState(tabs.some((t) => t.key === initial) ? initial! : tabs[0].key);
  // Barre d'onglets figée juste sous l'en-tête du site (dont la hauteur varie selon l'écran)
  const [top, setTop] = useState(0);
  useEffect(() => {
    const head = document.querySelector("header");
    if (!head) return;
    const measure = () => setTop(head.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);
  return (
    <div className="space-y-4">
      <div
        role="tablist"
        className="sticky z-20 grid divide-x divide-neutral-200 border-y border-neutral-200 shadow-sm"
        style={{ top: `calc(${top}px + var(--page-bar-h, 0px))`, transition: "top 300ms", gridTemplateColumns: `repeat(${tabs.filter((t) => !t.hidden).length}, minmax(0, 1fr))` }}
      >
        {tabs
          .filter((t) => !t.hidden)
          .map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => {
              setTab(t.key);
              window.scrollTo({ top: 0, behavior: "smooth" });
              window.history.replaceState(window.history.state, "", `?onglet=${t.key}`);
            }}
            style={{ fontSize: "clamp(11px, 3.3vw, 15px)" }}
            className={`flex min-h-12 items-center justify-center px-2 py-1.5 text-center font-bold leading-tight transition-colors ${
              tab === t.key ? "bg-rouge text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" hidden={tab !== t.key}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
