import type { CompetitionCode } from "@/lib/competitions";
import {
  ESPN_LEAGUES,
  fillMatchdays,
  parseRoster,
  parseScheduleEvent,
  parseSummary,
} from "./espn-parse";
import { parseLeagueLogo } from "./espn-standings";
import type { FootballProvider, ProviderMatch } from "./types";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";

export function createEspnProvider(teamId = Number(process.env.ESPN_TEAM_ID ?? 169)): FootballProvider {
  let requests = 0;
  let warnings: string[] = [];

  async function get(path: string): Promise<unknown> {
    requests++;
    const res = await fetch(BASE + path, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`ESPN ${path} → HTTP ${res.status}`);
    return res.json();
  }

  return {
    name: "ESPN",
    teamExternalId: teamId,
    requestCount: () => requests,
    warnings: () => warnings,

    async listMatches(seasonStartYear) {
      warnings = [];
      const byId = new Map<number, ProviderMatch>();
      let failures = 0;
      for (const [competition, slug] of Object.entries(ESPN_LEAGUES) as [CompetitionCode, string][]) {
        for (const suffix of ["", "&fixture=true"]) {
          try {
            const data = (await get(`/${slug}/teams/${teamId}/schedule?season=${seasonStartYear}${suffix}`)) as {
              events?: unknown[];
            };
            for (const ev of data.events ?? []) {
              const m = parseScheduleEvent(ev, competition);
              if (m) byId.set(m.externalId, m);
            }
          } catch (e) {
            failures++;
            warnings.push(e instanceof Error ? e.message : String(e));
          }
        }
      }
      if (failures === 6) throw new Error(`ESPN injoignable : ${warnings[0]}`);
      return fillMatchdays([...byId.values()]);
    },

    async getMatchDetail({ externalId, competition }) {
      return parseSummary(await get(`/${ESPN_LEAGUES[competition]}/summary?event=${externalId}`));
    },

    async getLeagueLogos() {
      const out: Partial<Record<CompetitionCode, string>> = {};
      for (const [code, slug] of Object.entries(ESPN_LEAGUES) as [CompetitionCode, string][]) {
        try {
          const logo = parseLeagueLogo(await get(`/${slug}/scoreboard`));
          if (logo) out[code] = logo;
        } catch {
          // logo facultatif : on garde la pastille de couleur
        }
      }
      return out;
    },

    async getSquad() {
      return parseRoster(await get(`/${ESPN_LEAGUES.LIGUE_1}/teams/${teamId}/roster`));
    },
  };
}
