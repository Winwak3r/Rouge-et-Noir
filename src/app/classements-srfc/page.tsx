import type { Metadata } from "next";
import { StandingsTabs } from "@/components/StandingsTabs";
import { TeamLabel } from "@/components/TeamLabel";
import { getLeagueLogos } from "@/lib/league-logos";
import { fetchScorerLeaders, fetchStandings, type ScorerRow, type StandingRow } from "@/lib/providers/espn-standings";

export const metadata: Metadata = { title: "Classements" };
export const revalidate = 600; // classements rafraîchis toutes les 10 minutes

const RENNES_ID = Number(process.env.ESPN_TEAM_ID ?? 169);
const SEASON = Number(process.env.SEASON_START_YEAR ?? 2026);

async function load<T>(fn: () => Promise<T[]>, fallback: string): Promise<{ rows: T[] } | { error: string }> {
  try {
    return { rows: await fn() };
  } catch (e) {
    return { error: e instanceof Error ? e.message : fallback };
  }
}

export default async function OfficialStandingsPage() {
  const [l1, uel, l1Scorers, uelScorers, logos] = await Promise.all([
    load(() => fetchStandings("fra.1", SEASON), "Classement indisponible pour le moment."),
    load(() => fetchStandings("uefa.europa", SEASON), "Classement indisponible pour le moment."),
    load(() => fetchScorerLeaders("fra.1", SEASON), "Classement des buteurs indisponible pour le moment."),
    load(() => fetchScorerLeaders("uefa.europa", SEASON), "Classement des buteurs indisponible pour le moment."),
    getLeagueLogos(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Classements</h1>
        <p className="mt-1 text-sm text-neutral-600">Classements officiels des compétitions du Stade Rennais, mis à jour automatiquement.</p>
      </div>
      <StandingsTabs
        competitions={[
          { code: "LIGUE_1", logo: logos.LIGUE_1 ?? null, table: <Table data={l1} />, scorers: <Scorers data={l1Scorers} /> },
          { code: "EUROPA_LEAGUE", logo: logos.EUROPA_LEAGUE ?? null, table: <Table data={uel} />, scorers: <Scorers data={uelScorers} /> },
        ]}
      />
      <p className="text-xs text-neutral-500">Source : ESPN. Les données peuvent avoir quelques minutes de décalage.</p>
    </div>
  );
}

function Table({ data }: { data: { rows: StandingRow[] } | { error: string } }) {
  if ("error" in data) return <p className="card text-sm text-neutral-600">{data.error}</p>;
  const zones = [...new Map(data.rows.filter((r) => r.zone).map((r) => [r.zone!.label, r.zone!.color])).entries()];
  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-surface shadow-sm">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-2 py-2 text-left">#</th>
              <th scope="col" className="px-2 py-2 text-left">Équipe</th>
              <th scope="col" className="px-2 py-2 text-right">Pts</th>
              <th scope="col" className="px-2 py-2 text-right" title="Matchs joués">J</th>
              <th scope="col" className="px-2 py-2 text-right" title="Gagnés">G</th>
              <th scope="col" className="px-2 py-2 text-right" title="Nuls">N</th>
              <th scope="col" className="px-2 py-2 text-right" title="Perdus">P</th>
              <th scope="col" className="px-2 py-2 text-right" title="Buts pour">BP</th>
              <th scope="col" className="px-2 py-2 text-right" title="Buts contre">BC</th>
              <th scope="col" className="px-2 py-2 text-right" title="Différence de buts">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {data.rows.map((r) => {
              const rennes = r.teamId === RENNES_ID;
              return (
                <tr key={r.teamId} className={rennes ? "bg-red-50 font-semibold" : undefined}>
                  <td className="px-2 py-2" style={r.zone ? { boxShadow: `inset 4px 0 0 ${r.zone.color}` } : undefined}>
                    <span className="pl-1.5 tabular-nums">{r.rank}</span>
                  </td>
                  <td className="px-2 py-2">
                    <span className="flex min-w-0 items-center gap-2">
                      {r.logo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={r.logo} alt="" width={20} height={20} loading="lazy" className="h-5 w-5 shrink-0 object-contain" />
                      )}
                      <TeamLabel name={r.name} rennes={rennes} className={`truncate ${rennes ? "text-rouge" : ""}`} />
                    </span>
                  </td>
                  <td className="px-2 py-2 text-right font-display text-base font-bold tabular-nums">{r.points}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.played}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.won}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.drawn}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.lost}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.goalsFor}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.goalsAgainst}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{r.goalDiff > 0 ? `+${r.goalDiff}` : r.goalDiff}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {zones.length > 0 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-neutral-600">
          {zones.map(([label, color]) => (
            <li key={label} className="flex items-center gap-1.5">
              <span aria-hidden className="h-3 w-1 rounded" style={{ backgroundColor: color }} />
              {label}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Scorers({ data }: { data: { rows: ScorerRow[] } | { error: string } }) {
  if ("error" in data) return <p className="card text-sm text-neutral-600">{data.error}</p>;
  const hasPlayed = data.rows.some((r) => r.played !== null);
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-surface shadow-sm">
      <table className="w-full min-w-[420px] text-sm">
        <thead className="bg-neutral-50 text-xs uppercase tracking-wide text-neutral-500">
          <tr>
            <th scope="col" className="px-2 py-2 text-left">#</th>
            <th scope="col" className="px-2 py-2 text-left">Joueur</th>
            <th scope="col" className="px-2 py-2 text-left">Équipe</th>
            {hasPlayed && <th scope="col" className="px-2 py-2 text-right" title="Matchs joués">J</th>}
            <th scope="col" className="px-2 py-2 text-right">Buts</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-neutral-100">
          {data.rows.map((r) => {
            const rennes = r.teamId === RENNES_ID;
            return (
              <tr key={r.athleteId} className={rennes ? "bg-red-50 font-semibold" : undefined}>
                <td className="px-2 py-2 tabular-nums">{r.rank}</td>
                <td className={`px-2 py-2 ${rennes ? "text-rouge" : ""}`}>{r.name}</td>
                <td className="px-2 py-2">
                  <span className="flex min-w-0 items-center gap-2">
                    {r.teamLogo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={r.teamLogo} alt="" width={18} height={18} loading="lazy" className="h-[18px] w-[18px] shrink-0 object-contain" />
                    )}
                    <TeamLabel name={r.teamName ?? "—"} rennes={rennes} className="truncate text-neutral-600" />
                  </span>
                </td>
                {hasPlayed && <td className="px-2 py-2 text-right tabular-nums">{r.played ?? "—"}</td>}
                <td className="px-2 py-2 text-right font-display text-base font-bold tabular-nums">{r.goals}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
