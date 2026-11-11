"use client";

import { useEffect, useState, type ReactNode } from "react";

/** Onglets de page, de même largeur, sans arrondi (comme sur la page d'un match). */
type Tab = {
  key: string;
  label: string;
  /** Libellé court (mobile) */
  shortLabel?: string;
  content: ReactNode;
  hidden?: boolean;
  /** Onglet-lien : ouvre une autre page (nouvel onglet si « external ») */
  href?: string;
  external?: boolean;
};

export function PageTabs({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
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
          .map((t) => {
            const label = t.shortLabel ? (
              <>
                <span className="sm:hidden">{t.shortLabel}</span>
                <span className="hidden sm:inline">{t.label}</span>
              </>
            ) : (
              t.label
            );
            const cls = `flex min-h-12 items-center justify-center px-2 py-1.5 text-center font-bold leading-tight transition-colors ${
              tab === t.key ? "bg-rouge text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`;
            if (t.href) {
              return (
                <a
                  key={t.key}
                  href={t.href}
                  {...(t.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                  style={{ fontSize: "clamp(10px, 2.9vw, 13px)" }}
                  className={cls}
                >
                  {label}
                  {t.external && (
                    <span aria-hidden className="ml-1 text-[0.8em] opacity-60">
                      ↗
                    </span>
                  )}
                </a>
              );
            }
            return (
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
                style={{ fontSize: "clamp(10px, 2.9vw, 13px)" }}
                className={cls}
              >
                {label}
              </button>
            );
          })}
      </div>
      {tabs.map((t) => (
        <div key={t.key} role="tabpanel" hidden={tab !== t.key}>
          {t.content}
        </div>
      ))}
    </div>
  );
}
