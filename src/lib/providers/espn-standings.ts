// Classements officiels (Ligue 1, phase de ligue de l'Europa League) via l'API non officielle d'ESPN.
/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

export interface StandingRow {
  rank: number;
  teamId: number;
  name: string;
  logo: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  zone: { color: string; label: string } | null;
}

const STAT_NAMES: Record<keyof Omit<StandingRow, "teamId" | "name" | "logo" | "zone">, string[]> = {
  rank: ["rank"],
  played: ["gamesPlayed"],
  won: ["wins"],
  drawn: ["ties", "draws"],
  lost: ["losses"],
  goalsFor: ["pointsFor", "goalsFor"],
  goalsAgainst: ["pointsAgainst", "goalsAgainst"],
  goalDiff: ["pointDifferential", "goalDifference"],
  points: ["points"],
};

const ZONES: Array<[RegExp, string]> = [
  [/champions league qualif|champions league play/i, "Qualification Ligue des champions"],
  [/champions league/i, "Ligue des champions"],
  [/europa league qualif|europa league play/i, "Qualification Ligue Europa"],
  [/europa league/i, "Ligue Europa"],
  [/conference league/i, "Ligue Conférence"],
  [/relegation play|promotion\/relegation|barrage/i, "Barrage de relégation"],
  [/relegation/i, "Relégation"],
  [/round of 16|knockout round$|last 16/i, "Huitièmes de finale"],
  [/knockout round play|play-?off/i, "Barrages"],
  [/eliminat/i, "Éliminé"],
];

export function translateZone(description: string): string {
  for (const [re, fr] of ZONES) if (re.test(description)) return fr;
  return description;
}

export function parseStandings(data: Json): StandingRow[] {
  const entries: Json[] = data?.children?.[0]?.standings?.entries ?? data?.standings?.entries ?? [];
  const rows = entries.map((e: Json): StandingRow => {
    const stat = (names: string[]) => {
      const s = (e?.stats ?? []).find((x: Json) => names.includes(x?.name) || names.includes(x?.type));
      const n = Number(s?.value ?? s?.displayValue);
      return Number.isFinite(n) ? n : 0;
    };
    const row = Object.fromEntries(Object.entries(STAT_NAMES).map(([k, names]) => [k, stat(names)])) as Record<string, number>;
    const color = e?.note?.color ? `#${String(e.note.color).replace(/^#/, "")}` : null;
    return {
      rank: row.rank,
      teamId: Number(e?.team?.id),
      name: String(e?.team?.displayName ?? e?.team?.name ?? "?"),
      logo: e?.team?.logos?.[0]?.href ?? e?.team?.logo ?? null,
      played: row.played,
      won: row.won,
      drawn: row.drawn,
      lost: row.lost,
      goalsFor: row.goalsFor,
      goalsAgainst: row.goalsAgainst,
      goalDiff: row.goalDiff || row.goalsFor - row.goalsAgainst,
      points: row.points,
      zone: color && e?.note?.description ? { color, label: translateZone(String(e.note.description)) } : null,
    };
  });
  rows.sort((a, b) => (a.rank || 999) - (b.rank || 999) || b.points - a.points);
  rows.forEach((r, i) => {
    if (!r.rank) r.rank = i + 1;
  });
  return rows;
}

/** Récupère un classement, mis en cache 10 minutes par Next.js (pas de requête à chaque visite). */
export async function fetchStandings(slug: string, seasonStartYear: number): Promise<StandingRow[]> {
  const base = `https://site.api.espn.com/apis/v2/sports/soccer/${slug}/standings`;
  for (const url of [`${base}?season=${seasonStartYear}`, base]) {
    const res = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) continue;
    const rows = parseStandings(await res.json());
    if (rows.length > 0) return rows;
  }
  throw new Error("Classement indisponible pour le moment.");
}

export function parseLeagueLogo(scoreboard: Json): string | null {
  const logos: Json[] = scoreboard?.leagues?.[0]?.logos ?? [];
  const light = logos.find((l) => !(l?.rel ?? []).includes("dark"));
  return light?.href ?? logos[0]?.href ?? null;
}

// ─── Classement des buteurs ─────────────────────────────────────────────────

export interface ScorerRow {
  rank: number;
  athleteId: number;
  name: string;
  teamId: number | null;
  teamName: string | null;
  teamLogo: string | null;
  goals: number;
  played: number | null;
}

const num = (re: RegExp, text: string): number | null => {
  const m = re.exec(text);
  return m ? Number(m[1]) : null;
};

/** Meilleurs buteurs d'une compétition (lecture tolérante de la réponse « statistics » d'ESPN). */
export function parseScorerLeaders(data: Json): ScorerRow[] {
  const categories: Json[] = data?.stats ?? data?.leaders ?? data?.categories ?? [];
  const cat = categories.find((c) => /goal/i.test(`${c?.name ?? ""} ${c?.displayName ?? ""}`) && !/against|conced|assist/i.test(`${c?.name ?? ""} ${c?.displayName ?? ""}`));
  const leaders: Json[] = cat?.leaders ?? cat?.athletes ?? [];
  const rows = leaders
    .map((l: Json): Omit<ScorerRow, "rank"> | null => {
      const a = l?.athlete ?? l;
      const team = a?.team ?? l?.team ?? null;
      const text = String(l?.displayValue ?? "");
      const goals = num(/goals?\s*:\s*(\d+)/i, text) ?? (Number.isFinite(Number(l?.value)) ? Number(l.value) : null);
      if (!a?.displayName || goals === null) return null;
      return {
        athleteId: Number(a.id),
        name: String(a.displayName),
        teamId: team?.id ? Number(team.id) : null,
        teamName: team?.displayName ?? team?.name ?? null,
        teamLogo: team?.logos?.[0]?.href ?? team?.logo ?? null,
        goals,
        played: num(/(?:matches|games|apps?)\s*:\s*(\d+)/i, text),
      };
    })
    .filter((r): r is Omit<ScorerRow, "rank"> => r !== null)
    .sort((a, b) => b.goals - a.goals || a.name.localeCompare(b.name, "fr"));
  // Ex æquo : même rang (1, 2, 2, 4)
  return rows.map((r, i) => ({ ...r, rank: i > 0 && rows[i - 1].goals === r.goals ? 0 : i + 1 })).map((r, i, all) => {
    if (r.rank === 0) {
      let j = i;
      while (j > 0 && all[j].rank === 0) j--;
      r.rank = all[j].rank;
    }
    return r;
  });
}

export async function fetchScorerLeaders(slug: string, seasonStartYear: number): Promise<ScorerRow[]> {
  const base = `https://site.api.espn.com/apis/site/v2/sports/soccer/${slug}/statistics`;
  for (const url of [`${base}?season=${seasonStartYear}`, base]) {
    const res = await fetch(url, { next: { revalidate: 600 }, signal: AbortSignal.timeout(15_000) });
    if (!res.ok) continue;
    const rows = parseScorerLeaders(await res.json());
    if (rows.length > 0) return rows;
  }
  throw new Error("Classement des buteurs indisponible pour le moment.");
}
