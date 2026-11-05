"use client";

import { useActionState, useState } from "react";
import { saveClubColorsAction, type AdminState } from "@/app/actions/admin";
import { genericClubLogo } from "@/lib/club-logo";

/** Un club : écusson officiel, logo factice (aperçu en direct) et ses deux couleurs. */
export function ClubColorsForm(props: { teamId: string; name: string; official: string | null; colors: [string, string] }) {
  const toHex = (c: string) => (/^#[0-9a-f]{6}$/i.test(c) ? c : "#888888");
  const [c1, setC1] = useState(toHex(props.colors[0]));
  const [c2, setC2] = useState(toHex(props.colors[1]));
  const [state, action, pending] = useActionState<AdminState, FormData>(saveClubColorsAction, {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-3 py-2">
      <input type="hidden" name="teamId" value={props.teamId} />
      <span className="w-40 min-w-0 truncate text-sm font-semibold">{props.name}</span>
      <span className="grid h-8 w-8 place-items-center rounded bg-white ring-1 ring-neutral-200" title="Logo officiel">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {props.official ? <img src={props.official} alt="" className="h-6 w-6 object-contain" /> : <span className="text-[10px] text-neutral-400">—</span>}
      </span>
      <span aria-hidden className="text-neutral-400">→</span>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={genericClubLogo([c1, c2])} alt="Logo factice" className="h-8 w-8" />
      <label className="flex items-center gap-1 text-xs text-neutral-600">
        Gauche
        <input type="color" name="color1" value={c1} onChange={(e) => setC1(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-neutral-300 bg-transparent" />
      </label>
      <label className="flex items-center gap-1 text-xs text-neutral-600">
        Droite
        <input type="color" name="color2" value={c2} onChange={(e) => setC2(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-neutral-300 bg-transparent" />
      </label>
      <button disabled={pending} className="btn-secondary px-2.5 py-1 text-xs">
        Enregistrer
      </button>
      {state.message && <span className="text-xs text-green-700">{state.message}</span>}
      {state.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}
