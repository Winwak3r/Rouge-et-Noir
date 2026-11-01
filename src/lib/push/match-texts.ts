// Textes des notifications de match (fonctions pures, testées).

export interface MatchLabel {
  id: string;
  home: string;
  away: string;
}

export interface MatchText {
  title: string;
  body: string;
  url: string;
  tag: string;
}

const min = (m: number | null, extra: number | null) => (m === null ? "" : ` (${m}${extra ? `+${extra}` : ""}')`);
const base = (m: MatchLabel, tag: string, body: string, title = `${m.home} – ${m.away}`): MatchText => ({
  title,
  body,
  url: `/#match-${m.id}`, // la notification ouvre ce match
  tag: `${m.id}-${tag}`, // une notification par événement (elles ne s'écrasent pas entre elles)
});

export function goalText(
  m: MatchLabel,
  g: { key: string; playerName: string; team: string; minute: number | null; extra: number | null; ownGoal: boolean; penalty: boolean },
  score: { home: number | null; away: number | null },
): MatchText {
  const who = g.ownGoal ? `contre son camp de ${g.playerName}` : `de ${g.playerName}${g.penalty ? " sur penalty" : ""}`;
  const sc = score.home !== null && score.away !== null ? ` · ${score.home}-${score.away}` : "";
  return base(m, `goal-${g.key}`, `⚽ But pour ${g.team} ${who}${min(g.minute, g.extra)}${sc}`);
}

export function redCardText(m: MatchLabel, c: { key: string; playerName: string; team: string; minute: number | null; extra: number | null }): MatchText {
  return base(m, `red-${c.key}`, `🟥 Carton rouge pour ${c.playerName} (${c.team})${min(c.minute, c.extra)}`);
}

export function scorerSubText(m: MatchLabel, s: { key: string; playerName: string; goesIn: boolean; minute: number | null; extra: number | null }): MatchText {
  return base(m, `sub-${s.key}`, `🔁 Ton buteur ${s.playerName} ${s.goesIn ? "entre en jeu" : "est remplacé"}${min(s.minute, s.extra)}`);
}

const scoreLine = (m: MatchLabel, h: number | null, a: number | null) => `${m.home} ${h ?? 0}-${a ?? 0} ${m.away}`;

export const kickoffText = (m: MatchLabel) => base(m, "kickoff", `⏱️ Coup d’envoi ! C’est parti pour ${m.home} – ${m.away}.`);
export const halftimeText = (m: MatchLabel, h: number | null, a: number | null) => base(m, "halftime", `☕ Mi-temps : ${scoreLine(m, h, a)}`);
export const secondHalfText = (m: MatchLabel, h: number | null, a: number | null) =>
  base(m, "second-half", `▶️ Début de la seconde période (${h ?? 0}-${a ?? 0})`);
export const fullTimeText = (m: MatchLabel, h: number | null, a: number | null) => base(m, "full-time", `🏁 Fin du match : ${scoreLine(m, h, a)}`);

const COMP: Record<string, string> = { LIGUE_1: "de Ligue 1", EUROPA_LEAGUE: "d’Europa League", COUPE_DE_FRANCE: "de Coupe de France" };

/** Veille du match : « C'est déjà demain ! 👀 » (ou « aujourd'hui » si l'envoi a pris du retard). */
export function eveText(m: MatchLabel, competition: string, time: string, today: boolean): MatchText {
  const when = today ? "aujourd’hui" : "demain";
  return base(
    m,
    "eve",
    `Le match ${COMP[competition] ?? ""} ${m.home} – ${m.away} est prévu ${when} à ${time}. Saisis tes pronos ou vérifie-les maintenant.`.replace(/\s+/g, " "),
    today ? "C’est aujourd’hui ! 👀" : "C’est déjà demain ! 👀",
  );
}

export const oddsText = (m: MatchLabel) => base(m, "odds", "📊 Les cotes des buteurs sont disponibles : choisis ton buteur !");
export const lineupText = (m: MatchLabel) =>
  base(m, "lineup", "📋 La composition est tombée ! Les remplaçants sont indiqués dans la liste des joueurs.");
