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
    current: { kind: BonusKind } | null;
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
  // 0 but pour Rennes : aucun buteur rennais possible (seul « Aucun buteur rennais » reste proposé)
  const rennesZero = rennesGoals === 0 && (props.rennesIsHome ? v.home : v.away) === "0";
  useEffect(() => {
    if (!rennesZero) return;
    if (v.scorer && v.scorer !== NO_SCORER) setV((c) => ({ ...c, scorer: "" }));
    if (bonusKind === "GALETTE_SAUCISSE") setBonusKind("");
  }, [rennesZero]); // eslint-disable-line react-hooks/exhaustive-deps
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

  // Pastille d'étape (1 · Score, 2 · Buteur, 3 · Bonus) : le parcours se lit d'un coup d'œil
  const step = (n: number, label: string, extra?: ReactNode) => (
    <p className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-neutral-500">
      <span className="grid h-5 w-5 place-items-center rounded-full bg-rouge text-[11px] text-white">{n}</span>
      {label}
      {extra}
    </p>
  );
  const SHORT: Record<BonusKind, string> = { KOUIGN_AMANN: "Kouign-Amann", GALETTE_SAUCISSE: "Galette-Saucisse" };

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="matchId" value={props.matchId} />
      {half && <p className="text-xs text-orange-700">Choisis un score pour les deux équipes, ou « – » pour les deux.</p>}

      {/* Ordinateur : score et buteur sur une même ligne */}
      <div className="grid gap-3 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:items-start md:gap-5">
        <div>
          {step(1, "Score")}
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            {scoreSelect("home", props.rennesIsHome ? "rennesGoals" : "opponentGoals", props.homeName)}
            <span className="pb-2 font-display text-xl font-bold text-neutral-400" aria-hidden>
              –
            </span>
            {scoreSelect("away", props.rennesIsHome ? "opponentGoals" : "rennesGoals", props.awayName)}
          </div>
        </div>

        <div>
          {step(2, "Buteur rennais")}
          <span id={id("scorer-label")} className="sr-only">
            Buteur rennais
          </span>
          {rennesZero && (
            <p role="alert" className="mb-2 rounded-lg border border-orange-300 bg-orange-100 px-3 py-2 text-xs text-orange-800">
              ⚠️ 0 but pronostiqué pour le Stade Rennais : le choix d’un buteur est bloqué (seul « Aucun buteur rennais » reste possible).
            </p>
          )}
          <ScorerSelect
            name="scorerId"
            value={v.scorer}
            onChange={(scorer) => setV((c) => ({ ...c, scorer }))}
            scorers={rennesZero ? [] : props.scorers}
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
      </div>

      {props.bonus && (
        <div>
          {step(
            3,
            "Spécialité maison",
            <span
              className="font-normal normal-case tracking-normal text-neutral-500"
              title="Un seul bonus par match. Il ne vaut que pour cette ligue : pour tes autres ligues, change de ligue et joue-le aussi là-bas."
            >
              · facultatif · ligue <strong className="text-neutral-700">{props.bonus.leagueName}</strong> ⓘ
            </span>,
          )}
          <input type="hidden" name="bonusLeagueId" value={props.bonus.leagueId} />
          <input type="hidden" name="bonusKind" value={bonusKind} />
          {/* Les trois bonus en pastilles compactes ; le second buteur apparaît à côté si besoin */}
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div role="radiogroup" aria-label="Spécialité maison" className="flex flex-wrap gap-2">
              {BONUS_KINDS.map((k) => {
                const left = props.bonus!.stock[k];
                const on = bonusKind === k;
                const needsScorer = k === "GALETTE_SAUCISSE" && (v.scorer === "" || v.scorer === NO_SCORER);
                const disabled = !on && (left <= 0 || needsScorer);
                return (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    disabled={disabled}
                    onClick={() => setBonusKind(on ? "" : k)}
                    title={
                      needsScorer
                        ? `${BONUS_INFO[k].name} : choisis d’abord un buteur rennais`
                        : left <= 0
                          ? `${BONUS_INFO[k].name} : plus aucun dans cette ligue cette saison`
                          : `${BONUS_INFO[k].name} : ${BONUS_INFO[k].effect}`
                    }
                    className={`inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                      on ? "border-rouge bg-rouge text-white" : "border-neutral-300 hover:border-neutral-500"
                    }`}
                  >
                    <BonusIcon kind={k} size={26} />
                    {SHORT[k]}
                    <span
                      aria-label={`${left} restant${left > 1 ? "s" : ""}`}
                      className={`grid h-5 min-w-5 place-items-center rounded-full px-1 text-[11px] font-bold ${
                        on ? "bg-white text-rouge" : left > 0 ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-500"
                      }`}
                    >
                      {left}
                    </span>
                  </button>
                );
              })}
            </div>

          </div>
          <p className="mt-1.5 text-xs text-neutral-500">
            {bonusKind ? (
              <>
                <strong className="text-neutral-700">{BONUS_INFO[bonusKind].effect}.</strong>{" "}
                <em>« {BONUS_INFO[bonusKind].tagline} »</em>
              </>
            ) : (
              "Touche une spécialité pour la jouer sur ce match (le chiffre indique combien il t’en reste)."
            )}
          </p>
        </div>
      )}

      {/* Actions, alignées à droite */}
      <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-200 pt-3">
        {state.error && (
          <span role="alert" className="mr-auto text-xs font-medium text-red-700">
            {state.error}
          </span>
        )}
        <button
          type="submit"
          name="clearPrediction"
          value="1"
          disabled={pending}
          onClick={() => {
            setV({ home: "", away: "", scorer: "" });
            setBonusKind("");
          }}
          className="rounded border border-neutral-300 bg-surface px-3 py-1.5 text-sm font-semibold text-noir hover:bg-neutral-100 disabled:opacity-40"
        >
          Réinitialiser
        </button>
        <button
          type="submit"
          disabled={pending || half || (v.home === "" && !init)}
          className="rounded bg-rouge px-4 py-1.5 text-sm font-semibold text-white hover:bg-rouge-fonce disabled:opacity-40"
        >
          {pending ? "Enregistrement…" : "Enregistrer mon pronostic"}
        </button>
      </div>
    </form>
  );
}
