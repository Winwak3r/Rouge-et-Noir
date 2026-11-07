"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { savePredictionAction, type PredictionState } from "@/app/actions/predictions";
import { NO_SCORER, ScorerSelect, type ScorerOption } from "./ScorerSelect";
import { BonusIcon } from "./BonusIcon";
import { BONUS_INFO, BONUS_KINDS, type BonusKind, type BonusQuotas } from "@/lib/scoring/bonus";
import { TeamLabel } from "./TeamLabel";

export type { ScorerOption };

/**
 * Mon prono : l'encart « Score / Buteur » et le bouton « Saisir » (rouge) ou « Modifier » (blanc).
 * Au clic, l'encart laisse place au formulaire ; après « Enregistrer » ou « Réinitialiser », le formulaire se replie.
 */
export function MyPrediction(props: {
  matchId: string;
  open: boolean; // saisie encore possible
  deadline: string;
  homeName: string;
  awayName: string;
  rennesIsHome: boolean;
  maxGoals: number;
  noScorerBonus: number;
  scorers: ScorerOption[];
  lineupPublished: boolean;
  /** Buteur enregistré absent de la feuille de match (il ne peut pas marquer). */
  savedScorerOut: string | null;
  initial: { rennesGoals: number; opponentGoals: number; scorerId: string | null; noScorerPick: boolean } | null;
  /** Encart « Score / Buteur » affiché quand le formulaire est replié. */
  summary?: ReactNode;
  /** « Les Spécialités Maison » : bonus jouable dans la ligue affichée (absent pour le Général R&N ou sans ligue) */
  bonus?: {
    leagueId: string;
    leagueName: string;
    stock: BonusQuotas; // restant dans la ligue, sans compter le bonus déjà posé sur ce match
    current: { kind: BonusKind; secondScorerId: string | null } | null;
  };
}) {
  const [state, action, pending] = useActionState<PredictionState, FormData>(savePredictionAction, {});
  const [expanded, setExpanded] = useState(false);
  const init = props.initial;
  const fromProps = () => ({
    home: init ? String(props.rennesIsHome ? init.rennesGoals : init.opponentGoals) : "",
    away: init ? String(props.rennesIsHome ? init.opponentGoals : init.rennesGoals) : "",
    scorer: init?.scorerId ?? (init?.noScorerPick ? NO_SCORER : ""),
  });
  const [v, setV] = useState(fromProps);
  const [bonusKind, setBonusKind] = useState<BonusKind | "">(props.bonus?.current?.kind ?? "");
  const [second, setSecond] = useState(props.bonus?.current?.secondScorerId ?? "");
  const initKey = JSON.stringify(init);
  useEffect(() => setV(fromProps()), [initKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Enregistrement réussi (ou réinitialisation) : le formulaire se replie.
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (state.success) setExpanded(false);
  }, [state]);

  if (!props.open) {
    return (
      <div className="space-y-3">
        {props.summary}
        <p className="text-sm text-neutral-600">Saisie terminée pour ce match.</p>
      </div>
    );
  }

  const chosen = props.scorers.find((p) => p.id === v.scorer);
  const goals = Array.from({ length: props.maxGoals + 1 }, (_, i) => i);
  const id = (s: string) => `${props.matchId}-${s}`;
  const rennesGoals = Number(props.rennesIsHome ? v.home : v.away);
  const half = (v.home === "") !== (v.away === "");

  const scoreSelect = (field: "home" | "away", name: string, label: string) => (
    <div className="min-w-0">
      <label htmlFor={id(field)} className="label truncate">
        <TeamLabel name={label} rennes={name === "rennesGoals"} />
      </label>
      <select
        id={id(field)}
        name={name}
        value={v[field]}
        onChange={(e) => setV((c) => ({ ...c, [field]: e.target.value }))}
        className="input text-center font-display text-xl font-bold"
      >
        <option value="">–</option>
        {goals.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
    </div>
  );

  // Aucun pronostic : le formulaire est affiché directement.
  if (!expanded && init) {
    return (
      <div className="space-y-3">
        {init && props.summary}
        {props.savedScorerOut && (
          <p role="alert" className="rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-xs text-red-800">
            ⚠️ {props.savedScorerOut} ne figure pas sur la feuille de match : il ne pourra pas marquer. Modifie ton pronostic pour choisir un autre buteur.
          </p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className={`rounded px-3 py-1.5 text-sm font-semibold transition-colors ${
              init ? "border border-neutral-300 bg-surface text-noir hover:bg-neutral-100" : "bg-rouge text-white hover:bg-rouge-fonce"
            }`}
          >
            {init ? "Modifier mon pronostic" : "Saisir mon pronostic"}
          </button>
          {state.success && <span role="status" className="text-xs font-medium text-green-700">✓ {state.success}</span>}
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="matchId" value={props.matchId} />
      {half && (
        <p className="text-xs text-orange-700">Choisis un score pour les deux équipes, ou « – » pour les deux.</p>
      )}
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        {scoreSelect("home", props.rennesIsHome ? "rennesGoals" : "opponentGoals", props.homeName)}
        <span className="pb-2 font-display text-xl font-bold text-neutral-400" aria-hidden>
          –
        </span>
        {scoreSelect("away", props.rennesIsHome ? "opponentGoals" : "rennesGoals", props.awayName)}
      </div>

      <div>
        <span id={id("scorer-label")} className="label">
          Buteur rennais
        </span>
        <ScorerSelect
          name="scorerId"
          value={v.scorer}
          onChange={(scorer) => setV((c) => ({ ...c, scorer }))}
          scorers={props.scorers}
          noScorerBonus={props.noScorerBonus}
          labelledBy={id("scorer-label")}
          lineupPublished={props.lineupPublished}
        />
        <p className="mt-1 text-xs text-neutral-500">
          {v.scorer === NO_SCORER
            ? `+${props.noScorerBonus} points si aucun joueur rennais ne marque.`
            : chosen
              ? `+${chosen.bonus} point${chosen.bonus > 1 ? "s" : ""} s’il marque (points figés au coup d’envoi).`
              : "Plus un buteur est improbable, plus il rapporte de points."}
        </p>
        {props.savedScorerOut && v.scorer === (init?.scorerId ?? "") && (
          <p role="alert" className="mt-2 rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-xs text-red-800">
            ⚠️ {props.savedScorerOut} ne figure pas sur la feuille de match : il ne pourra pas marquer. Choisis un autre buteur.
          </p>
        )}
        {v.scorer === NO_SCORER && rennesGoals >= 1 && (
          <p role="alert" className="mt-2 rounded-lg border border-orange-300 bg-orange-100 px-3 py-2 text-xs text-orange-800">
            ⚠️ Tu prévois au moins un but du Stade Rennais avec « Aucun buteur rennais » : cela signifie que le ou les buts rennais
            seraient des buts contre leur camp de l’équipe adverse.
          </p>
        )}
      </div>

      {props.bonus && (
        <fieldset className="space-y-2 rounded-xl border border-neutral-200 p-3">
          <legend className="px-1 text-xs font-bold uppercase tracking-wide text-neutral-500">Les Spécialités Maison</legend>
          <input type="hidden" name="bonusLeagueId" value={props.bonus.leagueId} />
          <input type="hidden" name="bonusKind" value={bonusKind} />
          <p className="text-xs text-neutral-600">
            Bonus pour la ligue <strong>{props.bonus.leagueName}</strong> (un seul par match). Pour tes autres ligues, change de ligue
            et joue-le aussi là-bas.
          </p>
          <div className="grid gap-2 sm:grid-cols-3">
            {BONUS_KINDS.map((k) => {
              const left = props.bonus!.stock[k];
              const on = bonusKind === k;
              const needsScorer = k !== "KOUIGN_AMANN" && (v.scorer === "" || v.scorer === NO_SCORER);
              const disabled = !on && (left <= 0 || needsScorer);
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  disabled={disabled}
                  onClick={() => setBonusKind(on ? "" : k)}
                  title={needsScorer ? "Choisis d’abord un buteur rennais" : left <= 0 ? "Plus aucun dans cette ligue cette saison" : BONUS_INFO[k].tagline}
                  className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                    on ? "border-rouge bg-rouge/10 ring-1 ring-rouge" : "border-neutral-200 hover:border-neutral-400"
                  }`}
                >
                  <BonusIcon kind={k} size={38} />
                  <span className="min-w-0">
                    <span className="block text-sm font-bold leading-tight">{BONUS_INFO[k].name}</span>
                    <span className="block text-[11px] leading-tight text-neutral-600">{BONUS_INFO[k].effect}</span>
                    <span className={`block text-[11px] font-semibold ${left > 0 ? "text-green-700" : "text-neutral-400"}`}>
                      {left} restant{left > 1 ? "s" : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {bonusKind === "GALETTES_SAUCISSES" && (
            <div>
              <span id={id("second-label")} className="label">
                Second buteur rennais
              </span>
              <ScorerSelect
                name="secondScorerId"
                value={second}
                onChange={setSecond}
                scorers={props.scorers.filter((p) => p.id !== v.scorer)}
                noScorerBonus={0}
                labelledBy={id("second-label")}
                lineupPublished={props.lineupPublished}
              />
            </div>
          )}
          {bonusKind && <p className="text-xs italic text-neutral-600">« {BONUS_INFO[bonusKind].tagline} »</p>}
        </fieldset>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={pending || half || (v.home === "" && !init)}
          className="rounded bg-rouge px-3 py-1.5 text-sm font-semibold text-white hover:bg-rouge-fonce disabled:opacity-40"
        >
          {pending ? "Enregistrement…" : "Enregistrer mon pronostic"}
        </button>
        <button
          type="submit"
          name="clearPrediction"
          value="1"
          disabled={pending}
          onClick={() => {
            setV({ home: "", away: "", scorer: "" });
            setBonusKind("");
            setSecond("");
          }}
          className="rounded border border-neutral-300 bg-surface px-3 py-1.5 text-sm font-semibold text-noir hover:bg-neutral-100 disabled:opacity-40"
        >
          Réinitialiser
        </button>
        {state.error && <span role="alert" className="text-xs font-medium text-red-700">{state.error}</span>}
      </div>
    </form>
  );
}
