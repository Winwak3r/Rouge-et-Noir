import type { CompetitionCode } from "@/lib/competitions";
import { ESPN_LEAGUES } from "@/lib/providers/espn-parse";
import { fetchStandings } from "@/lib/providers/espn-standings";
import type { ReactNode } from "react";
import { fetchCompetitionResults, fetchMatchGoals } from "@/lib/stats/espn-results";
import { computeTable, formPoints, recentScorers, teamForm, type CompResult } from "@/lib/stats/match-stats";
import { ordinalFr } from "@/lib/match-view";
import { TeamLabel } from "./TeamLabel";
import { OutcomeIndices } from "./OutcomeIndices";
import { PreMatchTabs } from "./PreMatchTabs";
import { outcomeIndices } from "@/lib/match-odds";
import { fetchHeadToHead } from "@/lib/stats/h2h";
import { formatShortNumeric } from "@/lib/dates";
import { PlayerName } from "./PlayerName";

const SEASON = Number(process.env.SEASON_START_YEAR ?? 2026);

interface Side {
  id: number;
  name: string;
  logo?: string | null;
}

/** « STATISTIQUES » du prochain match : forme, buteurs récents, classements (général, domicile / extérieur). */
export async function MatchStats(props: {
  competition: CompetitionCode;
  home: Side;
  away: Side;
  /** Cotes du match (victoire domicile / nul / victoire extérieur) */
  odds?: { home: number | null; draw: number | null; away: number | null };
}) {
  const slug = ESPN_LEAGUES[props.competition];
  const withTables = props.competition !== "COUPE_DE_FRANCE";
  // Classement officiel d'abord : il donne aussi la liste des équipes de la compétition.
  const official = withTables ? await fetchStandings(slug, SEASON).catch(() => null) : null;
  const teamIds = [...new Set([props.home.id, props.away.id, ...(official ?? []).map((r) => r.teamId)])];
  let results: CompResult[];
  try {
    results = await fetchCompetitionResults(slug, props.competition, teamIds, SEASON);
  } catch {
    return <Box>Statistiques indisponibles pour le moment.</Box>;
  }

  // Buteurs : si le détail n'est pas dans les résultats, on le complète avec le résumé des 5 derniers matchs (en cache).
  const last5 = (teamId: number) =>
    results.filter((r) => r.homeId === teamId || r.awayId === teamId).sort((a, b) => a.date.getTime() - b.date.getTime()).slice(-5);
  const missing = [...new Set([...last5(props.home.id), ...last5(props.away.id)])].filter((r) => r.goals === null);
  await Promise.all(missing.map(async (r) => (r.goals = await fetchMatchGoals(slug, r.id).catch(() => []))));

  const computed = withTables ? computeTable(results, "all") : [];
  const homeTable = withTables ? computeTable(results, "home") : [];
  const awayTable = withTables ? computeTable(results, "away") : [];

  const sides = [
    { team: props.home, venue: "home" as const, venueTable: homeTable },
    { team: props.away, venue: "away" as const, venueTable: awayTable },
  ].map(({ team, venue, venueTable }) => {
    const off = official?.find((r) => r.teamId === team.id);
    const comp = computed.find((r) => r.teamId === team.id);
    const v = venueTable.find((r) => r.teamId === team.id);
    const form = teamForm(team.id, results);
    return {
      team,
      venue,
      rank: off ? { rank: off.rank, points: off.points, of: official!.length } : comp ? { rank: comp.rank, points: comp.points, of: computed.length } : null,
      venueRank: v ? { rank: v.rank, points: v.points, played: v.played, of: venueTable.length } : null,
      form,
      formPts: formPoints(form),
      scorers: recentScorers(team.id, results).slice(0, 3),
    };
  });

  const RENNES = Number(process.env.ESPN_TEAM_ID ?? 169);
  const odds = props.odds;
  const indices = odds?.home && odds?.draw && odds?.away ? outcomeIndices({ home: odds.home, draw: odds.draw, away: odds.away }) : null;
  const pct = (x: number) => `${Math.round(x * 100)} %`;
  const icon = (d: ReactNode) => (
    <svg aria-hidden viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  );
  const h2h = <HeadToHead slug={slug} competition={props.competition} home={props.home} away={props.away} />;

  return (
    <PreMatchTabs
      initial={indices ? "proba" : "compare"}
      panels={[
        {
          key: "proba",
          label: "Probabilités de victoire",
          hint: indices
            ? `${pct(indices.home.probability)} · nul ${pct(indices.draw.probability)} · ${pct(indices.away.probability)}`
            : "Environ 48 h avant le match",
          icon: icon(
            <>
              <path d="M3 3v18h18" />
              <path d="M7 15l4-4 3 3 5-6" />
            </>,
          ),
          content: (
            <OutcomeIndices
              odds={odds ?? { home: null, draw: null, away: null }}
              home={{ name: props.home.name, rennes: props.home.id === RENNES, logo: props.home.logo }}
              away={{ name: props.away.name, rennes: props.away.id === RENNES, logo: props.away.logo }}
            />
          ),
        },
        {
          key: "compare",
          label: "Comparatif",
          hint: "Classement, forme, buteurs",
          icon: icon(
            <>
              <path d="M12 3v18" />
              <path d="M5 7h4M5 12h4M5 17h4M15 7h4M15 12h4M15 17h4" />
            </>,
          ),
          content: (
            <>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {sides.map((s) => (
          <div key={s.team.id} className="min-w-0 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <p className="flex min-w-0 items-center gap-2 font-semibold">
              {s.team.logo && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.team.logo} alt="" className="h-6 w-6 shrink-0 object-contain" />
              )}
              <TeamLabel name={s.team.name} rennes={s.team.id === Number(process.env.ESPN_TEAM_ID ?? 169)} className="truncate" />
            </p>
            {withTables && (
              <>
                <Stat label="Classement">
                  {s.rank ? (
                    <>
                      <strong>{ordinalFr(s.rank.rank)}</strong> <span className="text-neutral-500">· {s.rank.points} pts</span>
                    </>
                  ) : (
                    "—"
                  )}
                </Stat>
                <Stat label={s.venue === "home" ? "À domicile" : "À l’extérieur"}>
                  {s.venueRank ? (
                    <>
                      <strong>{ordinalFr(s.venueRank.rank)}</strong>{" "}
                      <span className="text-neutral-500">
                        · {s.venueRank.points} pts en {s.venueRank.played} m.
                      </span>
                    </>
                  ) : (
                    "—"
                  )}
                </Stat>
              </>
            )}
            <Stat label="Forme (5 dern. m.)">
              {s.form.length === 0 ? (
                "—"
              ) : (
                <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                  {/* Les 5 cases restent toujours sur une seule ligne (plus petites sur mobile) */}
                  <span className="flex flex-nowrap gap-0.5 sm:gap-1">
                  {s.form.map((f, i) => (
                    <span
                      key={i}
                      title={`${f.home ? "Dom." : "Ext."} contre ${f.opponent} : ${f.score}`}
                      className={`inline-grid h-4 w-4 shrink-0 place-items-center rounded text-[9px] font-bold text-white sm:h-5 sm:w-5 sm:text-[10px] ${
                        f.result === "V" ? "bg-[#00C853]" : f.result === "N" ? "bg-neutral-400" : "bg-[#E53935]"
                      }`}
                    >
                      {f.result}
                    </span>
                  ))}
                  </span>
                  <span className="whitespace-nowrap text-xs text-neutral-500">{s.formPts} pts</span>
                </span>
              )}
            </Stat>
            <Stat label="Buteurs (5 dern. m.)">
              {s.scorers.length === 0 ? (
                "—"
              ) : (
                <span className="block space-y-0.5">
                  {s.scorers.map((p) => (
                    <span key={p.player} className="flex justify-between gap-2">
                      <PlayerName name={p.player} className="truncate" />
                      <span className="shrink-0 font-semibold tabular-nums">{p.goals}</span>
                    </span>
                  ))}
                </span>
              )}
            </Stat>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-neutral-500">
        {withTables ? "Matchs de cette compétition uniquement. " : "Matchs de Coupe de France uniquement. "}Données ESPN, mises à jour toutes les 6 h.
      </p>
            </>
          ),
        },
        {
          key: "h2h",
          label: "Confrontations directes",
          hint: "Les 5 derniers face-à-face",
          icon: icon(
            <>
              <path d="M8 7h12l-3-3M16 17H4l3 3" />
            </>,
          ),
          content: h2h,
        },
      ]}
    />
  );
}

function Stat({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500">{label}</p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

function Box({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-neutral-600">{children}</p>
  );
}

/** Les 5 dernières confrontations directes, avec la même équipe à domicile. */
async function HeadToHead(props: { slug: string; competition: CompetitionCode; home: Side; away: Side }) {
  const list = await fetchHeadToHead({
    slug: props.slug,
    competition: props.competition,
    homeId: props.home.id,
    awayId: props.away.id,
    seasonStartYear: SEASON,
  }).catch(() => []);
  const RENNES = Number(process.env.ESPN_TEAM_ID ?? 169);
  const tone = { V: "bg-[#00C853]", N: "bg-neutral-400", D: "bg-[#E53935]" } as const;
  const Crest = ({ url }: { url?: string | null }) =>
    // eslint-disable-next-line @next/next/no-img-element
    url ? <img src={url} alt="" className="h-4 w-4 shrink-0 object-contain" /> : null;
  return (
    <div className="text-sm">
      {list.length === 0 ? (
        <p className="mt-1 text-neutral-600">Aucune confrontation récente dans cette configuration.</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {list.map((m, i) => (
            <li key={i} className="grid grid-cols-[auto_1fr_auto_1fr] items-center gap-2">
              <span className="text-xs tabular-nums text-neutral-500">{formatShortNumeric(m.date)}</span>
              <span className="flex min-w-0 items-center justify-end gap-1.5 text-right">
                <TeamLabel name={props.home.name} rennes={props.home.id === RENNES} className={`truncate ${m.result === "V" ? "font-bold" : ""}`} />
                <Crest url={props.home.logo} />
              </span>
              <span className="flex items-center gap-1.5">
                <span className="font-display text-base font-bold tabular-nums">
                  {m.homeGoals}-{m.awayGoals}
                </span>
                <span
                  className={`inline-grid h-4 w-4 place-items-center rounded text-[9px] font-bold text-white ${tone[m.result]}`}
                  title={`Résultat pour ${props.home.name}`}
                >
                  {m.result}
                </span>
              </span>
              <span className="flex min-w-0 items-center gap-1.5">
                <Crest url={props.away.logo} />
                <TeamLabel name={props.away.name} rennes={props.away.id === RENNES} className={`truncate ${m.result === "D" ? "font-bold" : ""}`} />
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
