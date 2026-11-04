"use client";

import { useActionState, useState } from "react";
import { setMatchOddsAction, type AdminState } from "@/app/actions/admin";
import { OutcomeIndices } from "./OutcomeIndices";

const PRESETS = [
  { label: "Gros favori à domicile", v: ["1,35", "5,00", "8,50"] },
  { label: "Léger favori à domicile", v: ["2,10", "3,40", "3,50"] },
  { label: "Match équilibré", v: ["2,70", "3,10", "2,70"] },
  { label: "Favori à l’extérieur", v: ["4,20", "3,60", "1,85"] },
] as const;

const parse = (s: string) => {
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) && n > 1 ? n : null;
};
const fmt = (n: number | null) => (n === null ? "" : n.toFixed(2).replace(".", ","));

/** Simulation des cotes du match : aperçu immédiat des indices, puis enregistrement facultatif. */
export function MatchOddsSimulator(props: {
  matchId: string;
  home: { name: string; rennes: boolean };
  away: { name: string; rennes: boolean };
  current: { home: number | null; draw: number | null; away: number | null };
}) {
  const [v, setV] = useState({ home: fmt(props.current.home), draw: fmt(props.current.draw), away: fmt(props.current.away) });
  const [state, action, pending] = useActionState<AdminState, FormData>(setMatchOddsAction, {});
  const odds = { home: parse(v.home), draw: parse(v.draw), away: parse(v.away) };
  const field = (k: "home" | "draw" | "away", label: string) => (
    <label className="min-w-0 text-sm">
      <span className="label truncate">{label}</span>
      <input
        name={k}
        inputMode="decimal"
        value={v[k]}
        onChange={(e) => setV((c) => ({ ...c, [k]: e.target.value }))}
        placeholder="ex. 2,10"
        className="input text-center font-display text-lg font-bold"
      />
    </label>
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="matchId" value={props.matchId} />
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button key={p.label} type="button" onClick={() => setV({ home: p.v[0], draw: p.v[1], away: p.v[2] })} className="btn-secondary px-2.5 py-1 text-xs">
            {p.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {field("home", `Victoire ${props.home.name}`)}
        {field("draw", "Match nul")}
        {field("away", `Victoire ${props.away.name}`)}
      </div>

      {/* Aperçu immédiat, tel qu'il s'affichera dans l'avant-match */}
      <div className="rounded-lg border border-dashed border-neutral-300 p-3">
        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Aperçu</p>
        <OutcomeIndices odds={odds} home={props.home} away={props.away} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button name="mode" value="save" disabled={pending || !odds.home || !odds.draw || !odds.away} className="btn-primary">
          Enregistrer sur le match
        </button>
        {(props.current.home || props.current.draw || props.current.away) && (
          <button name="mode" value="clear" disabled={pending} className="btn-secondary">
            Effacer les cotes du match
          </button>
        )}
        {state.message && <span className="text-sm text-green-700">{state.message}</span>}
        {state.error && <span role="alert" className="text-sm text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}
