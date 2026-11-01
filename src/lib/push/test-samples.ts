// Exemples de chaque notification, pour les tests depuis l'administration (fonction pure, testée).
import { reminderText, type PushText } from "./messages";
import {
  eveText,
  fullTimeText,
  goalText,
  halftimeText,
  kickoffText,
  lineupText,
  oddsText,
  redCardText,
  scorerSubText,
  secondHalfText,
  type MatchLabel,
} from "./match-texts";

export const TEST_KINDS = [
  ["kickoff", "Coup d’envoi"],
  ["goal", "But"],
  ["red", "Carton rouge"],
  ["sub-out", "Ton buteur est remplacé"],
  ["sub-in", "Ton buteur entre en jeu"],
  ["halftime", "Mi-temps"],
  ["second-half", "Seconde période"],
  ["full-time", "Fin du match"],
  ["eve", "Veille du match"],
  ["odds", "Cotes disponibles"],
  ["lineup", "Composition publiée"],
  ["reminder", "Rappel 1 h avant (pronostic manquant)"],
] as const;

export type TestKind = (typeof TEST_KINDS)[number][0];

/** Notification d'exemple, bâtie sur un vrai match (ou un match fictif). Étiquette unique : les tests s'empilent. */
export function sampleNotification(
  kind: TestKind,
  m: MatchLabel & { rennesIsHome: boolean; competition: string; kickoffAt: Date },
  scorer: string,
  now = new Date(),
): PushText {
  const rennes = m.rennesIsHome ? m.home : m.away;
  const other = m.rennesIsHome ? m.away : m.home;
  const [h, a] = m.rennesIsHome ? [1, 0] : [0, 1];
  const time = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(m.kickoffAt);
  const t = (() => {
    switch (kind) {
      case "kickoff":
        return kickoffText(m);
      case "goal":
        return goalText(m, { key: "test", playerName: scorer, team: rennes, minute: 34, extra: null, ownGoal: false, penalty: false }, { home: h, away: a });
      case "red":
        return redCardText(m, { key: "test", playerName: "Un défenseur adverse", team: other, minute: 67, extra: null });
      case "sub-out":
        return scorerSubText(m, { key: "test", playerName: scorer, goesIn: false, minute: 63, extra: null });
      case "sub-in":
        return scorerSubText(m, { key: "test", playerName: scorer, goesIn: true, minute: 58, extra: null });
      case "halftime":
        return halftimeText(m, h, a);
      case "second-half":
        return secondHalfText(m, h, a);
      case "full-time":
        return fullTimeText(m, h, a);
      case "eve":
        return eveText(m, m.competition, time, false);
      case "odds":
        return oddsText(m);
      case "lineup":
        return lineupText(m);
      case "reminder":
        return reminderText({ home: m.home, away: m.away, lockAt: new Date(now.getTime() + 55 * 60_000), now, matchId: m.id });
    }
  })();
  return { ...t, title: `[Test] ${t.title}`, tag: `test-${kind}-${now.getTime()}` };
}
