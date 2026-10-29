"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import { buildStandings } from "@/lib/scoring/ranking";
import { Avatar } from "./Avatar";
import { CompetitionBadge } from "./CompetitionBadge";
import { LeagueAvatar } from "./LeagueAvatar";

export interface BoardRow {
  rank: number;
  tied: boolean;
  userId: string;
  pseudo: string;
  avatarAt: number | null;
  totalPoints: number;
  exactScores: number;
  goalDiffs: number;
  outcomes: number;
  scorers: number;
  missing: number;
  played: number; // matchs avec un pronostic saisi (score et/ou buteur)
}

export interface BoardResult {
  userId: string;
  category: "EXACT" | "GOAL_DIFF" | "OUTCOME" | "WRONG" | "MISSING";
  totalPoints: number;
  correctScorer: boolean;
  competition: CompetitionCode;
}

export interface BoardView {
  key: string; // identifiant de ligue, ou « general »
  name: string;
  imageAt: number | null;
  note: string;
  competitions: CompetitionCode[]; // compétitions jouées dans la vue
  players: Array<{ userId: string; pseudo: string; avatarAt: number | null }>;
  results: BoardResult[]; // résultats comptant dans la vue (déjà limités à sa période)
}

/** Classement recalculé dans le navigateur selon les compétitions cochées (même règle que partout). */
function computeRows(view: BoardView, selected: CompetitionCode[]): BoardRow[] {
  const avatar = new Map(view.players.map((p) => [p.userId, p.avatarAt]));
  return buildStandings(
    view.players.map((p) => ({ userId: p.userId, pseudo: p.pseudo })),
    view.results.filter((r) => selected.includes(r.competition)),
  ).map((s) => ({ ...s, avatarAt: avatar.get(s.userId) ?? null, played: s.scoredMatches - s.missing }));
}

const td = "px-2 py-2 sm:px-3 sm:py-3";

/** Classements des ligues et général : changement instantané (tout est déjà chargé), avec glissement. */
export function StandingsBoard({
  views,
  initial,
  me,
  logos,
}: {
  views: BoardView[];
  initial: string;
  me: string | null;
  logos: Partial<Record<CompetitionCode, string>>;
}) {
  const [key, setKey] = useState(initial);
  // Compétitions cochées, par vue (toutes celles de la vue au départ)
  const [picked, setPicked] = useState<Record<string, CompetitionCode[]>>({});
  const [direction, setDirection] = useState<"left" | "right" | null>(null);
  const changes = useRef(0);
  // Le choix affiché est piloté ICI, jamais par les nouvelles données du serveur : une réponse arrivée
  // en retard (ligue précédente) ne peut plus faire revenir le classement en arrière.
  // Seul un choix fait dans la liste de l'en-tête est suivi (événement envoyé par LeagueSwitcher).
  const keyRef = useRef(key);
  keyRef.current = key;
  useEffect(() => {
    const onHeader = (e: Event) => {
      const id = (e as CustomEvent<string>).detail;
      if (id && id !== keyRef.current && views.some((v) => v.key === id)) {
        setDirection(views.findIndex((v) => v.key === id) > views.findIndex((v) => v.key === keyRef.current) ? "right" : "left");
        changes.current++;
        setKey(id);
      }
    };
    window.addEventListener("league-view", onHeader);
    return () => window.removeEventListener("league-view", onHeader);
  }, [views]);
  const view = views.find((v) => v.key === key) ?? views[0];
  const selected = picked[view.key] ?? view.competitions;
  const rows = useMemo(() => computeRows(view, selected), [view, selected]);
  const toggle = (c: CompetitionCode) =>
    setPicked((p) => {
      const cur = p[view.key] ?? view.competitions;
      const next = cur.includes(c) ? cur.filter((x) => x !== c) : view.competitions.filter((x) => x === c || cur.includes(x));
      return next.length === 0 ? p : { ...p, [view.key]: next }; // au moins une compétition
    });

  const icon = (v: BoardView, size: number) =>
    v.key === "general" ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src="/icon-192.png" alt="" width={size} height={size} className="shrink-0 rounded" style={{ width: size, height: size }} />
    ) : (
      <LeagueAvatar leagueId={v.key} name={v.name} at={v.imageAt} size={size} />
    );

  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">Change de classement avec la liste « Ligue » de l’en-tête.</p>
      <div className="overflow-hidden">
        <div key={`${view.key}-${changes.current}`} className={`space-y-3 ${direction === "right" ? "slide-from-right" : direction === "left" ? "slide-from-left" : ""}`}>
          <h2 className="flex items-center gap-3 font-display text-2xl font-bold uppercase tracking-wide">
            {icon(view, 36)}
            {view.name}
          </h2>
          <p className="text-xs text-neutral-500">{view.note}</p>
          {/* Compétitions jouées : cocher / décocher pour recalculer le classement */}
          {/* Mobile : les cases sous l'intitulé ; ordinateur : sur la même ligne */}
          <fieldset className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
            <legend className="sr-only">Compétitions prises en compte</legend>
            <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">Compétitions</span>
            <span className="flex flex-wrap items-center gap-2">
            {view.competitions.map((c) => {
              const on = selected.includes(c);
              const last = on && selected.length === 1;
              return (
                <label
                  key={c}
                  title={last ? "Au moins une compétition doit rester cochée" : undefined}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2 py-1 text-xs transition-colors ${
                    on ? "border-noir bg-neutral-50 font-semibold text-noir" : "border-neutral-300 text-neutral-400"
                  } ${last ? "cursor-not-allowed" : ""}`}
                >
                  <input type="checkbox" checked={on} disabled={last} onChange={() => toggle(c)} className="sr-only" />
                  <span className={on ? "" : "opacity-40 grayscale"}>
                    <CompetitionBadge code={c} logo={logos[c]} />
                  </span>
                  <span className="hidden sm:inline">{COMPETITIONS[c].label}</span>
                  <span className="sm:hidden">{({ LIGUE_1: "L1", EUROPA_LEAGUE: "EL", COUPE_DE_FRANCE: "CDF" } as const)[c]}</span>
                  <span aria-hidden className={on ? "text-rouge" : "text-transparent"}>✓</span>
                </label>
              );
            })}
            </span>
          </fieldset>
          {rows.length === 0 ? (
            <p className="card text-sm text-neutral-600">Aucun participant pour le moment.</p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-surface shadow-sm">
              <table className="w-full text-sm sm:min-w-[640px]">
                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                  <tr>
                    <th scope="col" className={td}>Rang</th>
                    <th scope="col" className={td}>Pseudo</th>
                    <th scope="col" className={`${td} text-right`}>Points</th>
                    <th scope="col" className={`${td} text-right`}>Exacts</th>
                    <th scope="col" className={`${td} hidden text-right sm:table-cell`}>Bons écarts</th>
                    <th scope="col" className={`${td} hidden text-right sm:table-cell`}>Bons résultats</th>
                    <th scope="col" className={`${td} hidden text-right sm:table-cell`}>Buteurs</th>
                    <th scope="col" className={`${td} hidden text-right sm:table-cell`} title="Matchs avec un pronostic saisi">Matchs joués</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {rows.map((s) => (
                    <tr key={s.userId} className={s.userId === me ? "bg-red-50/60" : undefined}>
                      <td className={`${td} font-display text-lg font-bold`}>
                        {s.rank}
                        {s.tied && <span className="ml-1 text-xs font-normal text-neutral-500">ex æquo</span>}
                      </td>
                      <td className={`${td} font-medium`}>
                        <Link href={`/joueur/${s.userId}`} className="flex items-center gap-2 hover:underline" title={`Voir le profil de ${s.pseudo}`}>
                          <Avatar userId={s.userId} pseudo={s.pseudo} at={s.avatarAt} size={26} />
                          {s.pseudo}
                        </Link>
                      </td>
                      <td className={`${td} text-right font-display text-lg font-bold`}>{s.totalPoints}</td>
                      <td className={`${td} text-right`}>{s.exactScores}</td>
                      <td className={`${td} hidden text-right sm:table-cell`}>{s.goalDiffs}</td>
                      <td className={`${td} hidden text-right sm:table-cell`}>{s.outcomes}</td>
                      <td className={`${td} hidden text-right sm:table-cell`}>{s.scorers}</td>
                      <td className={`${td} hidden text-right sm:table-cell`}>{s.played}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

