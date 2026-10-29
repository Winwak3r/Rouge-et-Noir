"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminState } from "@/app/actions/admin";

export interface SubmitDef {
  label: string;
  value?: string; // valeur du champ « mode »
  confirm?: string; // demande de confirmation avant l'envoi
  primary?: boolean;
}

/** Formulaire d'administration : boutons d'envoi, confirmation éventuelle, message de résultat. */
export function ActionForm(props: {
  action: (s: AdminState, f: FormData) => Promise<AdminState>;
  submits: SubmitDef[];
  children?: ReactNode;
  className?: string;
}) {
  const [state, action, pending] = useActionState<AdminState, FormData>(props.action, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        const value = (e.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ?? undefined;
        const def = props.submits.find((s) => (s.value ?? undefined) === value) ?? props.submits[0];
        if (def?.confirm && !window.confirm(def.confirm)) e.preventDefault();
      }}
      className={props.className ?? "space-y-3"}
    >
      {props.children}
      <div className="flex flex-wrap items-center gap-2">
        {props.submits.map((s) => (
          <button
            key={s.label}
            name={s.value ? "mode" : undefined}
            value={s.value}
            disabled={pending}
            className={s.primary === false ? "btn-secondary px-3 py-1.5" : "btn-primary px-3 py-1.5"}
          >
            {s.label}
          </button>
        ))}
        {pending && <span className="text-xs text-neutral-500">Un instant…</span>}
        {state.message && <span role="status" className="text-sm text-green-700">{state.message}</span>}
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}
