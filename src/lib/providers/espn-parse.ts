// Lecture des réponses de l'API (non officielle) d'ESPN. Fonctions pures, testées sur un vrai match.
import type { CompetitionCode } from "@/lib/competitions";
import { fractionalToDecimal, type MatchStatus } from "@/lib/scoring/engine";
import type {
  ProviderCard,
  ProviderGoal,
  ProviderLineupPlayer,
  ProviderMatch,
  ProviderMatchDetail,
  ProviderOdds,
  ProviderPlayer,
  ProviderMatchOdds,
  ProviderPhases,
  ProviderSubstitution,
  ProviderTeam,
  ProviderYellowCard,
} from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Json = any;

export const ESPN_LEAGUES: Record<CompetitionCode, string> = {
  LIGUE_1: "fra.1",
  EUROPA_LEAGUE: "uefa.europa",
  COUPE_DE_FRANCE: "fra.coupe_de_france",
};

const int = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.trunc(n) : null;
};

export function parseScore(v: Json): number | null {
  if (v && typeof v === "object") return int(v.value ?? v.displayValue);
  return int(v);
}

export function mapStatus(type: Json): MatchStatus {
  const name = String(type?.name ?? "").toUpperCase();
  const state = String(type?.state ?? "").toLowerCase();
  if (name.includes("POSTPONED")) return "POSTPONED";
  if (name.includes("CANCEL")) return "CANCELLED";
  if (name.includes("ABANDON") || name.includes("SUSPEND")) return "INTERRUPTED";
  if (state === "in") return "LIVE";
  if (state === "post") return type?.completed === false ? "INTERRUPTED" : "FINISHED";
  return "SCHEDULED";
}

export function parseTeam(t: Json): ProviderTeam {
  return {
    externalId: Number(t?.id),
    name: String(t?.displayName ?? t?.name ?? "?"),
    shortName: t?.shortDisplayName ?? t?.abbreviation ?? null,
    logoUrl: t?.logo ?? t?.logos?.[0]?.href ?? null,
    color: t?.color ? String(t.color) : null,
    altColor: t?.alternateColor ? String(t.alternateColor) : null,
  };
}

const STAGES: Array<[RegExp, string]> = [
  [/round of 64|64th/i, "32e de finale"],
  [/round of 32|32nd/i, "16e de finale"],
  [/round of 16|16th/i, "8e de finale"],
  [/quarter/i, "Quart de finale"],
  [/semi/i, "Demi-finale"],
  [/play-?off/i, "Barrage"],
  [/^final$|\bfinal\b/i, "Finale"],
  [/league phase|league stage|matchday/i, "Phase de ligue"],
  [/round\s*(\d+)/i, "Tour"],
];

/** Libellé de la phase en français, d'après les notes ESPN (null si inconnu). */
export function stageFrom(ev: Json, competition: CompetitionCode): string | null {
  if (competition === "LIGUE_1") return null;
  const texts: string[] = [
    ...(ev?.competitions?.[0]?.notes ?? []).map((n: Json) => String(n?.headline ?? "")),
    String(ev?.week?.text ?? ""),
    String(ev?.seasonType?.name ?? ev?.season?.slug ?? ""),
  ].filter(Boolean);
  for (const text of texts) {
    for (const [re, label] of STAGES) {
      const m = re.exec(text);
      if (m) return label === "Tour" ? `${m[1]}e tour` : label;
    }
  }
  return competition === "EUROPA_LEAGUE" ? "Phase de ligue" : null;
}

export function parseScheduleEvent(ev: Json, competition: CompetitionCode): ProviderMatch | null {
  const comp = ev?.competitions?.[0];
  const home = comp?.competitors?.find((c: Json) => c.homeAway === "home");
  const away = comp?.competitors?.find((c: Json) => c.homeAway === "away");
  const id = int(ev?.id);
  if (!comp || !home || !away || id === null || !ev?.date) return null;
  const stage = stageFrom(ev, competition);
  const status = mapStatus(comp.status?.type ?? ev.status?.type);
  const started = status !== "SCHEDULED" && status !== "POSTPONED" && status !== "CANCELLED";
  return {
    externalId: id,
    competition,
    matchday: int(ev?.week?.number),
    stage,
    isKnockout: competition === "COUPE_DE_FRANCE" || (stage !== null && stage !== "Phase de ligue"),
    kickoffAt: new Date(ev.date),
    status,
    home: parseTeam(home.team),
    away: parseTeam(away.team),
    homeScore: started ? parseScore(home.score) : null,
    awayScore: started ? parseScore(away.score) : null,
  };
}

/** Complète les numéros de journée absents par l'ordre chronologique (Ligue 1, phase de ligue UEL). */
export function fillMatchdays(matches: ProviderMatch[]): ProviderMatch[] {
  for (const comp of ["LIGUE_1", "EUROPA_LEAGUE"] as const) {
    const list = matches
      .filter((m) => m.competition === comp && (comp === "LIGUE_1" || m.stage === "Phase de ligue"))
      .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime());
    list.forEach((m, i) => {
      if (m.matchday === null) m.matchday = i + 1;
    });
  }
  return matches;
}

/** « 45'+2' » → { minute: 45, extra: 2 }. */
export function parseClock(v: unknown): { minute: number | null; extra: number | null } {
  const m = /(\d+)'?\s*(?:\+\s*(\d+))?/.exec(String(v ?? ""));
  return m ? { minute: Number(m[1]), extra: m[2] ? Number(m[2]) : null } : { minute: null, extra: null };
}

export function parseGoals(summary: Json): ProviderGoal[] {
  const goals: ProviderGoal[] = [];
  for (const k of summary?.keyEvents ?? []) {
    const typeText = `${k?.type?.type ?? ""} ${k?.type?.text ?? ""}`.toLowerCase();
    // ESPN indique scoringPlay ; le type ne sert que si ce champ est absent.
    const isGoal =
      typeof k?.scoringPlay === "boolean"
        ? k.scoringPlay
        : /goal|penalty.*scored/.test(typeText) && !/missed|saved|disallow|cancel/.test(typeText);
    if (!isGoal) continue;
    const scorer = k?.participants?.[0]?.athlete;
    const clock = parseClock(k?.clock?.displayValue);
    goals.push({
      key: String(k?.id ?? `${clock.minute}-${scorer?.id ?? "?"}`),
      teamExternalId: int(k?.team?.id),
      playerExternalId: int(scorer?.id),
      playerName: String(scorer?.displayName ?? "?"),
      minute: clock.minute,
      extraMinute: clock.extra,
      period: int(k?.period?.number),
      isOwnGoal: /own/.test(typeText) || /own goal/i.test(String(k?.text ?? "")),
      isPenalty: /penalty/.test(typeText),
      isShootout: k?.shootout === true || int(k?.period?.number) === 5,
    });
  }
  return goals;
}

/** Cartons rouges : rouge direct ou deuxième jaune (« Yellow Card - Red », « Second Yellow »…). */
export function parseRedCards(summary: Json): ProviderCard[] {
  const cards: ProviderCard[] = [];
  for (const k of summary?.keyEvents ?? []) {
    const typeText = `${k?.type?.type ?? ""} ${k?.type?.text ?? ""}`.toLowerCase();
    const second = /second.?yellow|yellow.?red|yellow card.*red|2nd yellow/.test(typeText);
    if (!second && !/red.?card/.test(typeText)) continue;
    const player = k?.participants?.[0]?.athlete;
    const clock = parseClock(k?.clock?.displayValue);
    cards.push({
      key: String(k?.id ?? `${clock.minute}-${player?.id ?? "?"}`),
      teamExternalId: int(k?.team?.id),
      playerName: String(player?.displayName ?? "?"),
      minute: clock.minute,
      extraMinute: clock.extra,
      secondYellow: second,
    });
  }
  return cards;
}

/** Cartons jaunes simples (le deuxième jaune est compté comme carton rouge). */
export function parseYellowCards(summary: Json): ProviderYellowCard[] {
  const out: ProviderYellowCard[] = [];
  for (const k of summary?.keyEvents ?? []) {
    const typeText = `${k?.type?.type ?? ""} ${k?.type?.text ?? ""}`.toLowerCase();
    if (!/yellow/.test(typeText) || /red|second|2nd/.test(typeText)) continue;
    const player = k?.participants?.[0]?.athlete;
    const clock = parseClock(k?.clock?.displayValue);
    out.push({
      key: String(k?.id ?? `y-${clock.minute}-${player?.id ?? "?"}`),
      teamExternalId: int(k?.team?.id),
      playerName: String(player?.displayName ?? "?"),
      minute: clock.minute,
      extraMinute: clock.extra,
    });
  }
  return out;
}

/** Remplacements : « Substitution, Équipe. Entrant replaces Sortant. » (participants : entrant puis sortant). */
export function parseSubstitutions(summary: Json): ProviderSubstitution[] {
  const out: ProviderSubstitution[] = [];
  for (const k of summary?.keyEvents ?? []) {
    const typeText = `${k?.type?.type ?? ""} ${k?.type?.text ?? ""}`.toLowerCase();
    if (!/substitution/.test(typeText)) continue;
    const [pin, pout] = (k?.participants ?? []).map((p: Json) => p?.athlete);
    const m = /([^.,]+?)\s+replaces\s+([^.]+?)\s*\.?\s*$/i.exec(String(k?.text ?? ""));
    const clock = parseClock(k?.clock?.displayValue);
    const inName = String(pin?.displayName ?? m?.[1]?.trim() ?? "?");
    const outName = String(pout?.displayName ?? m?.[2]?.trim() ?? "?");
    out.push({
      key: String(k?.id ?? `s-${clock.minute}-${inName}`),
      teamExternalId: int(k?.team?.id),
      inName,
      inExternalId: int(pin?.id),
      outName,
      outExternalId: int(pout?.id),
      minute: clock.minute,
      extraMinute: clock.extra,
    });
  }
  return out;
}

export function parsePhases(summary: Json): ProviderPhases {
  const types = new Set<string>((summary?.keyEvents ?? []).map((k: Json) => String(k?.type?.type ?? "").toLowerCase()));
  return {
    kickoff: types.has("kickoff"),
    halftime: types.has("halftime"),
    secondHalf: types.has("start-2nd-half"),
  };
}

/** Cote américaine (+150, -120) → décimale (2,50 ; 1,83). */
export function americanToDecimal(raw: unknown): number | null {
  const n = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(/^\+/, ""));
  if (!Number.isFinite(n) || n === 0) return null;
  return n > 0 ? 1 + n / 100 : 1 + 100 / Math.abs(n);
}

const decimalFrom = (v: unknown): number | null => {
  const s = String(v ?? "").trim();
  if (!s) return null;
  if (s.includes("/")) return fractionalToDecimal(s); // « 13/10 »
  if (/^[+-]\d+$/.test(s)) return americanToDecimal(s); // « +150 »
  const d = Number(s.replace(",", "."));
  return Number.isFinite(d) && d > 1 ? d : null;
};

/**
 * Cotes 1-N-2 du match, quel que soit le format fourni par ESPN :
 * Bet365 (bettingOdds.teamOdds, fractionnaires), moneyLine américaines, ou moneyline.{home,draw,away}.
 */
export function parseMatchOdds(summary: Json): ProviderMatchOdds | null {
  for (const o of summary?.odds ?? []) {
    // 1) Bet365 : bettingOdds.teamOdds.{preMatchMoneyLineHome, …Draw, …Away}
    const team = o?.bettingOdds?.teamOdds;
    if (team && typeof team === "object") {
      const pick = (re: RegExp) => {
        const k = Object.keys(team).find((x) => re.test(x.toLowerCase()));
        return k ? decimalFrom(team[k]?.value ?? team[k]) : null;
      };
      const r = { home: pick(/moneyline.*home|home.*moneyline/), draw: pick(/moneyline.*draw|draw/), away: pick(/moneyline.*away|away.*moneyline/) };
      if (r.home && r.draw && r.away) return r as ProviderMatchOdds;
    }
    // 2) homeTeamOdds.moneyLine / drawOdds.moneyLine / awayTeamOdds.moneyLine (américaines)
    const h = americanToDecimal(o?.homeTeamOdds?.moneyLine);
    const d = americanToDecimal(o?.drawOdds?.moneyLine);
    const a = americanToDecimal(o?.awayTeamOdds?.moneyLine);
    if (h && d && a) return { home: h, draw: d, away: a };
    // 3) moneyline.{home,draw,away}.close|open.odds
    const ml = o?.moneyline;
    if (ml) {
      const v = (side: string) => decimalFrom(ml?.[side]?.close?.odds ?? ml?.[side]?.open?.odds);
      const r = { home: v("home"), draw: v("draw"), away: v("away") };
      if (r.home && r.draw && r.away) return r as ProviderMatchOdds;
    }
  }
  return null;
}

export function parseScorerOdds(summary: Json): ProviderOdds[] {
  for (const o of summary?.odds ?? []) {
    const list = o?.bettingOdds?.playerOdds?.preMatchAnyTimeGoalScorer;
    if (!Array.isArray(list) || list.length === 0) continue;
    const out: ProviderOdds[] = [];
    for (const x of list) {
      const name = String(x?.player ?? "");
      const decimal = fractionalToDecimal(String(x?.value ?? ""));
      if (name && !/no goal ?scorer/i.test(name) && decimal !== null && decimal > 1) {
        out.push({ playerName: name, decimal });
      }
    }
    return out;
  }
  return [];
}

/** Postes ESPN détaillés (« CD-L », « AM »…) ramenés à G / D / M / F. */
export function simplePosition(abbr: unknown): string | null {
  const a = String(abbr ?? "").toUpperCase();
  if (!a) return null;
  if (a === "G" || a === "GK") return "G";
  if (/^(F|CF|ST|LW|RW|FW)/.test(a)) return "F";
  if (/^(CD|D|LB|RB|SW|WB|LWB|RWB|DF)/.test(a)) return "D";
  if (/^(M|CM|AM|DM|LM|RM|MF)/.test(a)) return "M";
  return null;
}

/** Feuilles de match (titulaires + remplaçants) de chaque équipe, si ESPN les a publiées. */
export function parseLineups(summary: Json): Record<number, ProviderLineupPlayer[]> {
  const out: Record<number, ProviderLineupPlayer[]> = {};
  for (const r of summary?.rosters ?? []) {
    const teamId = int(r?.team?.id);
    const players: ProviderLineupPlayer[] = (r?.roster ?? [])
      .filter((x: Json) => x?.athlete?.id)
      .map((x: Json) => ({
        externalId: Number(x.athlete.id),
        name: String(x.athlete.displayName ?? "?"),
        starter: x.starter === true,
        position: simplePosition(x.position?.abbreviation),
        shirtNumber: int(x.jersey),
      }));
    if (teamId !== null && players.length > 0) out[teamId] = players;
  }
  return out;
}

export function parseSummary(summary: Json): ProviderMatchDetail {
  const comp = summary?.header?.competitions?.[0];
  const home = comp?.competitors?.find((c: Json) => c.homeAway === "home");
  const away = comp?.competitors?.find((c: Json) => c.homeAway === "away");
  const status = mapStatus(comp?.status?.type);
  const homeScore = parseScore(home?.score);
  const awayScore = parseScore(away?.score);
  const goals = parseGoals(summary);

  const statusName = String(comp?.status?.type?.name ?? "").toUpperCase();
  const hadExtraTime =
    /AET|PEN|EXTRA|OVERTIME/.test(statusName) || goals.some((g) => (g.period ?? 0) >= 3) ||
    (summary?.keyEvents ?? []).some((k: Json) => (int(k?.period?.number) ?? 0) >= 3);

  let regulation: ProviderMatchDetail["regulation"] = null;
  let afterExtraTime: ProviderMatchDetail["afterExtraTime"] = null;
  if (status === "FINISHED" && homeScore !== null && awayScore !== null) {
    if (hadExtraTime) {
      afterExtraTime = { home: homeScore, away: awayScore };
      const etGoals = goals.filter((g) => !g.isShootout && (g.period === 3 || g.period === 4));
      const homeId = int(home?.team?.id ?? home?.id);
      const etHome = etGoals.filter((g) => g.teamExternalId === homeId).length;
      regulation = { home: homeScore - etHome, away: awayScore - (etGoals.length - etHome) };
    } else {
      regulation = { home: homeScore, away: awayScore };
    }
  }

  const hs = parseScore(home?.shootoutScore);
  const as = parseScore(away?.shootoutScore);

  return {
    status,
    minute: status === "LIVE" ? parseClock(comp?.status?.displayClock).minute : null,
    homeScore,
    awayScore,
    regulation,
    afterExtraTime,
    penalties: hs !== null && as !== null ? { home: hs, away: as } : null,
    goals,
    redCards: parseRedCards(summary),
    yellowCards: parseYellowCards(summary),
    substitutions: parseSubstitutions(summary),
    phases: parsePhases(summary),
    matchOdds: parseMatchOdds(summary),
    scorerOdds: parseScorerOdds(summary),
    lineups: parseLineups(summary),
  };
}

export function parseRoster(data: Json): ProviderPlayer[] {
  const raw: Json[] = Array.isArray(data?.athletes)
    ? data.athletes.flatMap((a: Json) => (Array.isArray(a?.items) ? a.items : [a]))
    : [];
  return raw
    .filter((a) => a?.id)
    .map((a) => ({
      externalId: Number(a.id),
      name: String(a.displayName ?? a.fullName ?? "?"),
      position: a.position?.abbreviation ?? a.position?.displayName ?? null,
      shirtNumber: int(a.jersey),
      photoUrl: a.headshot?.href ?? null,
    }));
}
