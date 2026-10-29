import type { CompetitionCode } from "@/lib/competitions";
import { ESPN_LEAGUES } from "@/lib/providers/espn-parse";
import { fetchStandings } from "@/lib/providers/espn-standings";
import type { ReactNode } from "react";
import { fetchCompetitionResults, fetchMatchGoals } from "@/lib/stats/espn-results";
import { computeTable, formPoints, recentScorers, teamForm, type CompResult } from "@/lib/stats/match-stats";
import { ordinalFr } from "@/lib/match-view";
import { TeamLabel } from "./TeamLabel";

const SEASON = Number(process.env.SEASON_START_YEAR ?? 2026);

interface Side {
  id: number;
  name: string;
}

/** « STATISTIQUES » du prochain match : forme, buteurs récents, classements (général, domicile / extérieur). */
export async function MatchStats(props: { competition: CompetitionCode; home: Side; away: Side }) {
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

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 text-sm">
        {sides.map((s) => (
          <div key={s.team.id} className="min-w-0 space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
            <p className="truncate font-semibold">
              <TeamLabel name={s.team.name} rennes={s.team.id === Number(process.env.ESPN_TEAM_ID ?? 169)} />
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
                      <span className="truncate">{p.player}</span>
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
    </div>
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
