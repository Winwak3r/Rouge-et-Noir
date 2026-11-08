"use client";

import { useState, type ReactNode } from "react";

/** Onglets de page, de même largeur, sans arrondi (comme sur la page d'un match). */
export function PageTabs({ tabs, initial }: { tabs: Array<{ key: string; label: string; content: ReactNode }>; initial?: string }) {
  const [tab, setTab] = useState(tabs.some((t) => t.key === initial) ? initial! : tabs[0].key);
  return (
    <div className="space-y-4">
      <div role="tablist" className="grid divide-x divide-neutral-200 border-y border-neutral-200" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => {
              setTab(t.key);
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
