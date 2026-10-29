// Résultats d'une compétition depuis ESPN (une requête « scoreboard » sur la saison, mise en cache 6 h).
import type { CompetitionCode } from "@/lib/competitions";
import { parseGoals, parseScheduleEvent } from "@/lib/providers/espn-parse";
import type { CompResult, ResultGoal } from "./match-stats";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;
const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const CACHE = { next: { revalidate: 6 * 3600 } };


export function parseScoreboardResults(data: Json): CompResult[] {
  const out: CompResult[] = [];
  for (const ev of data?.events ?? []) {
    const c = ev?.competitions?.[0];
    if (!c?.status?.type?.completed) continue;
    const home = c.competitors?.find((x: Json) => x.homeAway === "home");
    const away = c.competitors?.find((x: Json) => x.homeAway === "away");
    if (!home || !away) continue;
    const details: Json[] | undefined = c.details;
    const goals: ResultGoal[] | null = Array.isArray(details)
      ? details
          .filter((d) => d?.scoringPlay && !d?.shootout)
          .map((d) => ({
            teamId: Number(d?.team?.id),
            player: String(d?.athletesInvolved?.[0]?.displayName ?? "?"),
            ownGoal: d?.ownGoal === true || /own/i.test(String(d?.type?.text ?? "")),
          }))
      : null;
    out.push({
      id: Number(ev.id),
      date: new Date(ev.date),
      homeId: Number(home.team?.id),
      awayId: Number(away.team?.id),
      homeName: String(home.team?.displayName ?? "?"),
      awayName: String(away.team?.displayName ?? "?"),
      homeGoals: Number(home.score ?? 0),
      awayGoals: Number(away.score ?? 0),
      goals,
    });
  }
  return out;
}

/** Matchs terminés d'une équipe dans la compétition (calendrier de l'équipe, mis en cache 6 h). */
async function fetchTeamResults(slug: string, competition: CompetitionCode, teamId: number, seasonStartYear: number): Promise<CompResult[]> {
  const res = await fetch(`${BASE}/${slug}/teams/${teamId}/schedule?season=${seasonStartYear}`, { ...CACHE, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return [];
  const data = await res.json();
  const out: CompResult[] = [];
  for (const ev of data?.events ?? []) {
    const m = parseScheduleEvent(ev, competition);
    if (!m || m.status !== "FINISHED" || m.homeScore === null || m.awayScore === null) continue;
    out.push({
      id: m.externalId,
      date: m.kickoffAt,
      homeId: m.home.externalId,
      awayId: m.away.externalId,
      homeName: m.home.name,
      awayName: m.away.name,
      homeGoals: m.homeScore,
      awayGoals: m.awayScore,
      goals: null, // complétés au besoin par le résumé du match
    });
  }
  return out;
}

/**
 * Matchs terminés de la compétition depuis le début de la saison, réunis à partir du calendrier
 * de chaque équipe (une requête par équipe, en parallèle, mises en cache 6 h). Doublons retirés.
 */
export async function fetchCompetitionResults(
  slug: string,
  competition: CompetitionCode,
  teamIds: number[],
  seasonStartYear: number,
): Promise<CompResult[]> {
  const lists = await Promise.all(teamIds.map((id) => fetchTeamResults(slug, competition, id, seasonStartYear).catch(() => [])));
  const byId = new Map<number, CompResult>();
  for (const r of lists.flat()) byId.set(r.id, r);
  if (byId.size === 0) throw new Error("Résultats indisponibles pour le moment.");
  return [...byId.values()];
}

/** Buts d'un match (si le « scoreboard » ne les détaille pas), via le résumé du match, mis en cache. */
export async function fetchMatchGoals(slug: string, eventId: number): Promise<ResultGoal[]> {
  const res = await fetch(`${BASE}/${slug}/summary?event=${eventId}`, { ...CACHE, signal: AbortSignal.timeout(15_000) });
  if (!res.ok) return [];
  return parseGoals(await res.json())
    .filter((g) => !g.isShootout && g.teamExternalId !== null)
    .map((g) => ({ teamId: g.teamExternalId!, player: g.playerName, ownGoal: g.isOwnGoal }));
}
