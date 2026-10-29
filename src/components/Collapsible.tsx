"use client";

import { useId, useState, type ReactNode } from "react";

/** Rubrique repliable (« Statistiques », « Pronostics et points »), fermée par défaut. */
export function Collapsible(props: { title: string; children: ReactNode; defaultOpen?: boolean; extra?: ReactNode }) {
  const [open, setOpen] = useState(props.defaultOpen ?? false);
  const id = useId();
  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-left transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-noir"
      >
        <span className="text-sm font-bold uppercase tracking-wide text-neutral-600">{props.title}</span>
        {props.extra && <span className="text-xs text-neutral-500">{props.extra}</span>}
        <span aria-hidden className={`ml-auto text-neutral-500 transition-transform duration-300 ${open ? "rotate-180" : ""}`}>
          ▾
        </span>
      </button>
      <div
        id={id}
        inert={!open}
        className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:transition-none ${
          open ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">{props.children}</div>
      </div>
    </div>
  );
}
