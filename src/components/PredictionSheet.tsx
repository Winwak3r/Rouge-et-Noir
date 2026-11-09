"use client";

import { useRouter } from "next/navigation";
import { createContext, useActionState, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { savePredictionAction, type PredictionState } from "@/app/actions/predictions";
import { BONUS_INFO, BONUS_KINDS, type BonusKind, type BonusQuotas } from "@/lib/scoring/bonus";
import { BonusIcon } from "./BonusIcon";
import { NO_SCORER, ScorerSelect, type ScorerOption } from "./ScorerSelect";
import { TeamLabel } from "./TeamLabel";
import { PlayerPhoto } from "./PlayerPhoto";
import { teamAbbr } from "@/lib/team-abbr";

/** Fermeture de la fiche, fournie par l'accordéon qui l'ouvre. */
export const SheetContext = createContext<{ close: () => void; done?: () => void } | null>(null);

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
  /** Mes ligues : un bonus peut s'appliquer à une ou plusieurs d'entre elles */
  leagues: Array<{ id: string; name: string; stock: BonusQuotas; current: { kind: BonusKind } | null }>;
  prematch: ReactNode;
}) {
  const sheet = useContext(SheetContext);
  const router = useRouter();
  const init = props.initial;
  const [state, action, pending] = useActionState<PredictionState, FormData>(savePredictionAction, {});
  const [home, setHome] = useState(init ? String(props.rennesIsHome ? init.rennesGoals : init.opponentGoals) : "");
  const [away, setAway] = useState(init ? String(props.rennesIsHome ? init.opponentGoals : init.rennesGoals) : "");
  const [scorer, setScorer] = useState(init?.scorerId ?? (init?.noScorerPick ? NO_SCORER : ""));
  // Bonus de chaque ligue sur ce match (une spécialité au plus par ligue)
  const [perLeague, setPerLeague] = useState<Record<string, BonusKind | "">>(() =>
    Object.fromEntries(props.leagues.map((l) => [l.id, l.current?.kind ?? ""])),
  );
  // Fenêtre « appliquer ce bonus à mes ligues »
  const [popup, setPopup] = useState<BonusKind | null>(null);
  const [draft, setDraft] = useState<Set<string>>(new Set());
  const openPopup = (k: BonusKind) => {
    setDraft(new Set(props.leagues.filter((l) => perLeague[l.id] === k).map((l) => l.id)));
    setPopup(k);
  };
  const applyPopup = () => {
    if (!popup) return;
    setPerLeague((cur) => {
      const next = { ...cur };
      for (const l of props.leagues) {
        if (draft.has(l.id)) next[l.id] = popup;
        else if (next[l.id] === popup) next[l.id] = "";
      }
      return next;
    });
    setPopup(null);
  };

  const [tab, setTab] = useState<"pre" | "bonus" | "scorer">("pre");
  // En-tête réduit dès qu'on fait défiler la fiche (logos, score et noms plus petits).
  // L'en-tête est en position fixe et une cale de hauteur constante réserve sa place : le réduire ne déplace pas
  // le contenu, donc le défilement ne « rebondit » pas entre les deux états.
  useEffect(() => {
    const onTab = (e: Event) => {
      const t = (e as CustomEvent<string>).detail;
      if (t === "pre" || t === "scorer" || t === "bonus") setTab(t);
    };
    window.addEventListener("sheet-tab", onTab);
    return () => window.removeEventListener("sheet-tab", onTab);
  }, []);
  // La zone de contenu défile seule, sous l'en-tête : réduire l'en-tête ne déplace pas le contenu (pas de va-et-vient)
  const bodyRef = useRef<HTMLDivElement>(null);
  const [compact, setCompact] = useState(false);
  useEffect(() => {
    const scroller = bodyRef.current;
    if (!scroller) return;
    scroller.style.overflowAnchor = "none";
    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = scroller.scrollTop;
        // hystérésis large : on réduit après 72 px, on ne redéplie qu'en revenant tout en haut
        setCompact((c) => (c ? y > 8 : y > 72));
      });
    };
    scroller.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      scroller.removeEventListener("scroll", onScroll);
    };
  }, []);

  // Enregistré : la fiche se ferme et la page se met à jour
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (state.success) {
      if (sheet?.done) sheet.done();
      else {
        router.refresh();
        sheet?.close();
      }
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const goals = Array.from({ length: props.maxGoals + 1 }, (_, i) => i);
  const half = (home === "") !== (away === "");
  const chosen = props.scorers.find((p) => p.id === scorer);
  const rennesGoals = Number(props.rennesIsHome ? home : away);
  // 0 but pour Rennes : aucun buteur rennais possible (seul « Aucun buteur rennais » reste proposé)
  const rennesZero = (props.rennesIsHome ? home : away) === "0";
  useEffect(() => {
    if (!rennesZero) return;
    if (scorer && scorer !== NO_SCORER) setScorer("");
    setPerLeague((cur) => Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, v === "GALETTE_SAUCISSE" ? "" : v])));
  }, [rennesZero]); // eslint-disable-line react-hooks/exhaustive-deps

  const scoreBox = (value: string, set: (v: string) => void, name: string, label: string) => (
    <label className="relative">
      <span className="sr-only">Buts {label}</span>
      <select
        name={name}
        value={value}
        onChange={(e) => set(e.target.value)}
        className={`cursor-pointer appearance-none rounded-2xl border-2 border-neutral-300 bg-neutral-50 text-center font-club font-semibold text-noir transition-all duration-300 hover:border-rouge hover:bg-neutral-100 focus:border-rouge focus:outline-none ${
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
    ["scorer", "Le buteur"],
    ["bonus", "Les spécialités maison"],
  ] as const;

  return (
    <form action={action} className="relative flex h-full min-h-0 flex-col">
      <input type="hidden" name="matchId" value={props.matchId} />
      <input type="hidden" name="bonusLeagues" value={props.leagues.map((l) => l.id).join(",")} />
      {props.leagues.map((l) => (
        <input key={l.id} type="hidden" name={`bonus_${l.id}`} value={perLeague[l.id] ?? ""} />
      ))}
      <input type="hidden" name="scorerId" value={scorer} />


      {/* En-tête fixe : retour, journée, équipes et score à saisir */}
      <div className="z-10 w-full shrink-0 bg-[var(--header-bg)] shadow-sm">
      <div className="mx-auto w-full max-w-5xl px-3 pb-3 pt-[calc(env(safe-area-inset-top)+0.5rem)]">
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
        <div data-tour="sheet-score" className={`grid grid-cols-[1fr_auto_1fr] items-center gap-2 transition-all duration-300 ${compact ? "-mt-10 pl-9" : "mt-2"}`}>
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

      </div>

      <div className="mx-auto w-full max-w-5xl shrink-0">
      {/* Onglets */}
      {/* Trois onglets de même largeur, sans arrondi, qui remplissent toute la bande ; police adaptée à l'écran */}
      <div role="tablist" className="grid grid-cols-3 divide-x divide-neutral-200 border-y border-neutral-200">
        {TABS.map(([k, label]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={tab === k}
            onClick={() => setTab(k)}
            style={{ fontSize: "clamp(11px, 3.3vw, 15px)" }}
            className={`flex min-h-12 items-center justify-center px-2 py-1.5 text-center font-bold leading-tight transition-colors ${
              tab === k ? "bg-rouge text-white" : "bg-neutral-100 text-neutral-600 hover:bg-neutral-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      </div>
      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto [overflow-anchor:none]">
        <div data-tour="sheet-body" className="mx-auto w-full max-w-5xl px-3 py-4">
        {tab === "pre" && <div>{props.prematch}</div>}

        {tab === "bonus" &&
          (props.leagues.length ? (
            <div className="space-y-3">
              <h4 className="font-display text-xl font-bold uppercase tracking-wide text-rouge sm:text-2xl">Les bonus</h4>
              <p className="text-sm text-neutral-600">Facultatif · une spécialité par match et par ligue.</p>
              <div className="grid gap-3 sm:grid-cols-2">
              {BONUS_KINDS.map((k) => {
                const applied = props.leagues.filter((l) => perLeague[l.id] === k);
                const needsScorer = k === "GALETTE_SAUCISSE" && (scorer === "" || scorer === NO_SCORER);
                return (
                  <button
                    key={k}
                    type="button"
                    disabled={needsScorer && applied.length === 0}
                    onClick={() => openPopup(k)}
                    className={`flex h-full w-full items-center gap-3 rounded-2xl border-2 bg-[#111111] p-3 text-left text-white transition-colors enabled:hover:border-rouge disabled:opacity-40 ${
                      applied.length ? "border-rouge" : "border-[#111111]"
                    }`}
                  >
                    <BonusIcon kind={k} size={48} />
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold">{BONUS_INFO[k].name}</span>
                      <span className="block text-xs text-neutral-300">{BONUS_INFO[k].effect}</span>
                      {needsScorer && <span className="block text-xs text-orange-300">Choisis d’abord un buteur (onglet « Le buteur »)</span>}
                      {applied.length > 0 && (
                        <span className="mt-1 flex flex-wrap gap-1">
                          {applied.map((l) => (
                            <span key={l.id} className="rounded-full bg-rouge px-2 py-0.5 text-[11px] font-semibold text-white">
                              ✓ {l.name}
                            </span>
                          ))}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })}
              </div>

            </div>
          ) : (
            <p className="text-sm text-neutral-600">Rejoins ou crée une ligue pour jouer les Spécialités Maison.</p>
          ))}

        {tab === "scorer" && (
          <div className="space-y-2">
            <h4 className="font-display text-xl font-bold uppercase tracking-wide text-rouge sm:text-2xl">Buteur rennais</h4>
            {scorer === NO_SCORER && (
              <div className="flex items-center gap-4 rounded-2xl bg-[var(--color-surface)] p-3 ring-1 ring-neutral-200">
                <PlayerPhoto name="Aucun buteur rennais" url="/brand/aucun-buteur.png" size={96} shape="card" number={null} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Mon pari</p>
                  <p className="font-display text-2xl font-bold leading-tight">Aucun buteur rennais</p>
                  <p className="font-bold text-green-700">+{props.noScorerBonus} pts si aucun Rennais ne marque</p>
                </div>
              </div>
            )}
            {chosen && (
              <div className="flex items-center gap-4 rounded-2xl bg-[var(--color-surface)] p-3 ring-1 ring-neutral-200">
                <PlayerPhoto name={chosen.name} url={chosen.photo ?? null} size={96} shape="card" number={chosen.number ?? null} />
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-neutral-500">Mon buteur</p>
                  <p className="font-display text-2xl font-bold leading-tight">{chosen.name}</p>
                  <p className="font-bold text-green-700">
                    +{chosen.bonus} pt{chosen.bonus > 1 ? "s" : ""} s’il marque
                  </p>
                </div>
              </div>
            )}
            <span id={`${props.matchId}-m-scorer`} className="label">
              Buteur rennais
            </span>
            {rennesZero && (
              <p role="alert" className="rounded-lg border border-orange-300 bg-orange-100 px-3 py-2 text-sm text-orange-800">
                ⚠️ Tu as pronostiqué <strong>0 but</strong> pour le Stade Rennais : aucun joueur rennais ne peut marquer, le choix d’un
                buteur est donc bloqué. Tu peux seulement parier « Aucun buteur rennais ».
              </p>
            )}
            <ScorerSelect
              name="scorerIdView"
              value={scorer}
              onChange={setScorer}
              scorers={rennesZero ? [] : props.scorers}
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

      </div>
      {popup && (
        <div className="absolute inset-0 z-30 flex items-end bg-black/50" onClick={() => setPopup(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-label={BONUS_INFO[popup].name}
            onClick={(e) => e.stopPropagation()}
            className="mx-auto w-full max-w-5xl space-y-3 rounded-t-3xl bg-surface p-4 pb-[calc(env(safe-area-inset-bottom)+1rem)] shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <BonusIcon kind={popup} size={48} />
              <div>
                <p className="font-bold">{BONUS_INFO[popup].name}</p>
                <p className="text-xs text-neutral-600">{BONUS_INFO[popup].effect}</p>
              </div>
            </div>
            <p className="text-xs italic text-neutral-500">« {BONUS_INFO[popup].tagline} »</p>
            <p className="text-sm font-semibold">Dans quelles ligues ?</p>
            <ul className="space-y-2">
              {props.leagues.map((l) => {
                const other = perLeague[l.id] && perLeague[l.id] !== popup ? (perLeague[l.id] as BonusKind) : null;
                const empty = l.stock[popup] <= 0 && perLeague[l.id] !== popup;
                const checked = draft.has(l.id);
                return (
                  <li key={l.id}>
                    <label
                      className={`flex items-center gap-3 rounded-xl border p-3 ${empty ? "cursor-not-allowed border-neutral-200 bg-neutral-100 opacity-60" : checked ? "border-rouge bg-rouge/10" : "border-neutral-200"}`}
                    >
                      <input
                        type="checkbox"
                        disabled={empty}
                        checked={checked}
                        onChange={(e) =>
                          setDraft((d) => {
                            const n = new Set(d);
                            if (e.target.checked) n.add(l.id);
                            else n.delete(l.id);
                            return n;
                          })
                        }
                        className="h-5 w-5 accent-[#e1001a]"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold">{l.name}</span>
                        {empty ? (
                          <span className="block text-xs font-semibold text-neutral-500">⛔ Plus de bonus disponible</span>
                        ) : other && checked ? (
                          <span className="block text-xs text-orange-700">Remplacera « {BONUS_INFO[other].name} »</span>
                        ) : other ? (
                          <span className="block text-xs text-neutral-500">Déjà : {BONUS_INFO[other].name}</span>
                        ) : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPopup(null)} className="rounded-xl border border-neutral-300 px-4 py-3 text-sm font-semibold">
                Annuler
              </button>
              <button type="button" onClick={applyPopup} className="flex-1 rounded-xl bg-rouge py-3 text-sm font-bold text-white">
                Appliquer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barre d'enregistrement, toujours visible */}
      <div className="mx-auto w-full max-w-5xl shrink-0 border-t border-neutral-200 bg-[var(--header-bg)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3">
        {state.error && (
          <p role="alert" className="mx-auto mb-2 max-w-5xl text-sm font-medium text-red-700">
            {state.error}
          </p>
        )}
        <div className="mx-auto flex max-w-5xl gap-2">
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
                setPerLeague({});
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
