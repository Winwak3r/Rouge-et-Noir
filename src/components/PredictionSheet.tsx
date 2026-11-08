"use client";

import { useRouter } from "next/navigation";
import { createContext, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { savePredictionAction, type PredictionState } from "@/app/actions/predictions";
import { BONUS_INFO, BONUS_KINDS, type BonusKind, type BonusQuotas } from "@/lib/scoring/bonus";
import { BonusIcon } from "./BonusIcon";
import { NO_SCORER, ScorerSelect, type ScorerOption } from "./ScorerSelect";
import { TeamLabel } from "./TeamLabel";
import { teamAbbr } from "@/lib/team-abbr";

/** Fermeture de la fiche, fournie par l'accordéon qui l'ouvre. */
export const SheetContext = createContext<{ close: () => void } | null>(null);

type Side = { name: string; logo: string | null; rennes: boolean };

/**
 * Mobile : fiche plein écran d'un match à pronostiquer. En-tête fixe avec le score à saisir,
 * puis trois onglets (Avant-match · La spécialité maison · Le buteur), et « Enregistrer » toujours en bas.
 */
export function PredictionSheet(props: {
  matchId: string;
  title: string; // « J.10 · dim. 8 nov. 15:00 »
  competitionLogo: string | null;
  home: Side;
  away: Side;
  rennesIsHome: boolean;
  maxGoals: number;
  noScorerBonus: number;
  scorers: ScorerOption[];
  lineupPublished: boolean;
  savedScorerOut: string | null;
  initial: { rennesGoals: number; opponentGoals: number; scorerId: string | null; noScorerPick: boolean } | null;
  bonus?: { leagueId: string; leagueName: string; stock: BonusQuotas; current: { kind: BonusKind; secondScorerId: string | null } | null };
  prematch: ReactNode;
}) {
  const sheet = useContext(SheetContext);
  const router = useRouter();
  const init = props.initial;
  const [state, action, pending] = useActionState<PredictionState, FormData>(savePredictionAction, {});
  const [home, setHome] = useState(init ? String(props.rennesIsHome ? init.rennesGoals : init.opponentGoals) : "");
  const [away, setAway] = useState(init ? String(props.rennesIsHome ? init.opponentGoals : init.rennesGoals) : "");
  const [scorer, setScorer] = useState(init?.scorerId ?? (init?.noScorerPick ? NO_SCORER : ""));
  const [bonusKind, setBonusKind] = useState<BonusKind | "">(props.bonus?.current?.kind ?? "");
  const [second, setSecond] = useState(props.bonus?.current?.secondScorerId ?? "");
  const [tab, setTab] = useState<"pre" | "bonus" | "scorer">("pre");
  // En-tête réduit dès qu'on fait défiler la fiche (logos, score et noms plus petits)
  const formRef = useRef<HTMLFormElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const scroller = formRef.current?.parentElement?.closest(".overflow-y-auto") ?? formRef.current?.parentElement;
    if (!scroller) return;
    const onScroll = () => setCompact((c) => (c ? scroller.scrollTop > 24 : scroller.scrollTop > 56)); // hystérésis : pas de clignotement
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => scroller.removeEventListener("scroll", onScroll);
  }, []);

  // Enregistré : la fiche se ferme et la page se met à jour
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (state.success) {
      router.refresh();
      sheet?.close();
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const goals = Array.from({ length: props.maxGoals + 1 }, (_, i) => i);
  const half = (home === "") !== (away === "");
  const chosen = props.scorers.find((p) => p.id === scorer);
  const rennesGoals = Number(props.rennesIsHome ? home : away);

  const scoreBox = (value: string, set: (v: string) => void, name: string, label: string) => (
    <label className="relative">
      <span className="sr-only">Buts {label}</span>
      <select
        name={name}
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`appearance-none rounded-2xl border-2 border-neutral-300 bg-neutral-50 text-center font-club font-semibold text-noir transition-all duration-300 focus:border-rouge focus:outline-none ${
          compact ? "h-11 w-11 rounded-xl text-2xl" : "h-16 w-16 text-4xl"
        }`}
        style={{ textAlignLast: "center" }}
      >
        <option value="">–</option>
        {goals.map((g) => (
          <option key={g} value={g}>
            {g}
          </option>
        ))}
      </select>
    </label>
  );
  const team = (t: Side, side: "home" | "away") => {
    const logo = t.logo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={t.logo} alt="" className={`shrink-0 object-contain transition-all duration-300 ${compact ? "h-8 w-8" : "h-14 w-14"}`} />
    ) : (
      <span className={compact ? "h-8 w-8" : "h-14 w-14"} />
    );
    const name = compact ? (
      <span className="font-display text-lg font-bold uppercase">{teamAbbr(t.name)}</span>
    ) : (
      <TeamLabel name={t.name} rennes={t.rennes} className="max-w-full truncate font-display text-lg font-bold uppercase" />
    );
    return (
      <div
        className={`flex min-w-0 items-center gap-1.5 transition-all duration-300 ${
          compact ? (side === "home" ? "flex-row justify-end" : "flex-row-reverse justify-end") : "flex-col"
        }`}
      >
        {compact ? (
          <>
            {name}
            {logo}
          </>
        ) : (
          <>
            {logo}
            {name}
          </>
        )}
      </div>
    );
  };

  const TABS = [
    ["pre", "Avant-match"],
    ["scorer", "Mon buteur"],
    ["bonus", "Les spécialités maison"],
  ] as const;

  return (
    <form ref={formRef} action={action} className="flex min-h-full flex-col">
      <input type="hidden" name="matchId" value={props.matchId} />
      {props.bonus && <input type="hidden" name="bonusLeagueId" value={props.bonus.leagueId} />}
      <input type="hidden" name="bonusKind" value={bonusKind} />
      <input type="hidden" name="scorerId" value={scorer} />
      {/* Toujours envoyé, même si l'onglet n'est pas affiché */}
      <input type="hidden" name="secondScorerId" value={bonusKind === "GALETTES_SAUCISSES" ? second : ""} />

      {/* En-tête fixe : retour, journée, équipes et score à saisir */}
      <div className="sticky top-0 z-10 bg-[var(--header-bg)]">
      <div className="border-b border-neutral-200 px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
        <div className="relative flex min-h-9 items-center justify-center">
          <button type="button" onClick={() => sheet?.close()} aria-label="Retour" className="absolute left-0 grid h-9 w-9 place-items-center rounded-full hover:bg-neutral-100">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <p
            className={`flex items-center gap-1.5 overflow-hidden text-sm font-semibold text-neutral-600 transition-all duration-300 ${
              compact ? "max-h-0 opacity-0" : "max-h-8 opacity-100"
            }`}
          >
            {props.competitionLogo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={props.competitionLogo} alt="" className="h-5 w-5 rounded bg-white object-contain p-px" />
            )}
            {props.title}
          </p>
        </div>
        <div className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 transition-all duration-300 ${compact ? "-mt-10 pl-9" : "mt-2"}`}>
          {team(props.home, "home")}
          <div className="flex items-center gap-2">
            {scoreBox(home, setHome, props.rennesIsHome ? "rennesGoals" : "opponentGoals", props.home.name)}
            <span className="font-display text-2xl font-bold text-neutral-400">–</span>
            {scoreBox(away, setAway, props.rennesIsHome ? "opponentGoals" : "rennesGoals", props.away.name)}
          </div>
          {team(props.away, "away")}
        </div>
        {half && <p className="mt-1 text-center text-xs text-orange-700">Choisis un score pour les deux équipes.</p>}
      </div>

      {/* Onglets */}
      {/* Largeur de chaque onglet selon son libellé, police ajustée à l'écran : marge minimale sur les bords */}
      <div role="tablist" className="flex border-b border-neutral-200">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            style={{ flexGrow: label.length, flexBasis: 0, fontSize: "clamp(11px, 3.45vw, 15px)" }}
            className={`whitespace-nowrap px-1.5 py-3 font-bold leading-tight transition-colors ${tab === k ? "bg-rouge text-white" : "text-neutral-600"}`}
          >
            {label}
          </button>
        ))}
      </div>
      </div>

      <div className="flex-1 px-3 py-4">
        {tab === "pre" && <div>{props.prematch}</div>}

        {tab === "bonus" &&
          (props.bonus ? (
            <div className="space-y-3">
              <p className="text-sm text-neutral-600">
                Facultatif · un seul par match · pour la ligue <strong className="text-noir">{props.bonus.leagueName}</strong>.
              </p>
              {BONUS_KINDS.map((k) => {
                const left = props.bonus!.stock[k];
                const on = bonusKind === k;
                const needsScorer = k !== "KOUIGN_AMANN" && (scorer === "" || scorer === NO_SCORER);
                const disabled = !on && (left <= 0 || needsScorer);
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    disabled={disabled}
                    onClick={() => setBonusKind(on ? "" : k)}
                    className={`flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left transition-colors disabled:opacity-40 ${
                      on ? "border-rouge bg-rouge/10" : "border-neutral-200"
                    }`}
                  >
                    <BonusIcon kind={k} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{BONUS_INFO[k].name}</span>
                      <span className="block text-xs text-neutral-600">{BONUS_INFO[k].effect}</span>
                      {needsScorer && <span className="block text-xs text-orange-700">Choisis d’abord un buteur (onglet « Mon buteur »)</span>}
                    </span>
                    <span className={`grid h-7 min-w-7 place-items-center rounded-full px-1.5 text-sm font-bold ${left > 0 ? "bg-green-100 text-green-800" : "bg-neutral-200 text-neutral-500"}`}>
                      {left}
                    </span>
                  </button>
                );
              })}
              {bonusKind === "GALETTES_SAUCISSES" && (
                <div>
                  <span id={`${props.matchId}-m-second`} className="label">
                    Second buteur rennais
                  </span>
                  <ScorerSelect
                    name="secondScorerView"
                    value={second}
                    onChange={setSecond}
                    scorers={props.scorers.filter((p) => p.id !== scorer)}
                    noScorerBonus={0}
                    labelledBy={`${props.matchId}-m-second`}
                    lineupPublished={props.lineupPublished}
                  />
                </div>
              )}
              {bonusKind && <p className="text-sm italic text-neutral-600">« {BONUS_INFO[bonusKind].tagline} »</p>}
            </div>
          ) : (
            <p className="text-sm text-neutral-600">Rejoins ou crée une ligue pour jouer les Spécialités Maison.</p>
          ))}

        {tab === "scorer" && (
          <div className="space-y-2">
            <span id={`${props.matchId}-m-scorer`} className="label">
              Buteur rennais
            </span>
            <ScorerSelect
              name="scorerIdView"
              value={scorer}
              onChange={setScorer}
              scorers={props.scorers}
              noScorerBonus={props.noScorerBonus}
              labelledBy={`${props.matchId}-m-scorer`}
              lineupPublished={props.lineupPublished}
            />
            <p className="text-xs text-neutral-500">
              {scorer === NO_SCORER
                ? `+${props.noScorerBonus} points si aucun joueur rennais ne marque.`
                : chosen
                  ? `+${chosen.bonus} point${chosen.bonus > 1 ? "s" : ""} s’il marque (points figés au coup d’envoi).`
                  : "Plus un buteur est improbable, plus il rapporte de points."}
            </p>
            {props.savedScorerOut && scorer === (init?.scorerId ?? "") && (
              <p role="alert" className="rounded-lg border border-red-300 bg-red-100 px-3 py-2 text-xs text-red-800">
                ⚠️ {props.savedScorerOut} ne figure pas sur la feuille de match. Choisis un autre buteur.
              </p>
            )}
            {scorer === NO_SCORER && rennesGoals >= 1 && (
              <p role="alert" className="rounded-lg border border-orange-300 bg-orange-100 px-3 py-2 text-xs text-orange-800">
                ⚠️ « Aucun buteur rennais » avec au moins un but rennais : ces buts seraient des buts contre leur camp adverses.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Barre d'enregistrement, toujours visible */}
      <div className="sticky bottom-0 border-t border-neutral-200 bg-[var(--header-bg)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        {state.error && (
          <p role="alert" className="mb-2 text-sm font-medium text-red-700">
            {state.error}
          </p>
        )}
        <div className="flex gap-2">
          {init && (
            <button
              type="submit"
              name="clearPrediction"
              value="1"
              disabled={pending}
              onClick={() => {
                setHome("");
                setAway("");
                setScorer("");
                setBonusKind("");
              }}
              className="rounded-xl border border-neutral-300 px-3 py-3 text-sm font-semibold"
            >
              Réinitialiser
            </button>
          )}
          <button
            type="submit"
            disabled={pending || half || (home === "" && !init)}
            className="flex-1 rounded-xl bg-rouge py-3 text-base font-bold text-white disabled:opacity-40"
          >
            {pending ? "Enregistrement…" : "Enregistrer mon pronostic"}
          </button>
        </div>
      </div>
    </form>
  );
}
