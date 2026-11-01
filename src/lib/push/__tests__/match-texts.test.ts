import { describe, expect, it } from "vitest";
import { eveText, fullTimeText, goalText, halftimeText, kickoffText, lineupText, oddsText, redCardText, scorerSubText } from "../match-texts";

const M = { id: "m1", home: "OGC Nice", away: "Stade Rennais" };

describe("Notifications de match", () => {
  it("titre = le match, clic = ouverture du match, une étiquette par événement", () => {
    const t = kickoffText(M);
    expect(t.title).toBe("OGC Nice – Stade Rennais");
    expect(t.url).toBe("/#match-m1");
    expect(t.tag).toBe("m1-kickoff");
  });
  it("but : joueur, minute et score", () => {
    const t = goalText(M, { key: "9", playerName: "Arnaud Nordin", team: "Stade Rennais", minute: 34, extra: null, ownGoal: false, penalty: false }, { home: 0, away: 1 });
    expect(t.body).toBe("⚽ But pour Stade Rennais de Arnaud Nordin (34') · 0-1");
    const pen = goalText(M, { key: "10", playerName: "Boulaye Dia", team: "Stade Rennais", minute: 45, extra: 2, ownGoal: false, penalty: true }, { home: 0, away: 2 });
    expect(pen.body).toContain("sur penalty (45+2')");
  });
  it("carton rouge et buteur remplacé / entré en jeu", () => {
    expect(redCardText(M, { key: "r", playerName: "X", team: "OGC Nice", minute: 67, extra: null }).body).toBe("🟥 Carton rouge pour X (OGC Nice) (67')");
    expect(scorerSubText(M, { key: "s", playerName: "Arnaud Nordin", goesIn: false, minute: 63, extra: null }).body).toBe("🔁 Ton buteur Arnaud Nordin est remplacé (63')");
    expect(scorerSubText(M, { key: "s", playerName: "Ludovic Blas", goesIn: true, minute: 70, extra: null }).body).toContain("entre en jeu (70')");
  });
  it("mi-temps et fin du match avec le score", () => {
    expect(halftimeText(M, 0, 1).body).toBe("☕ Mi-temps : OGC Nice 0-1 Stade Rennais");
    expect(fullTimeText(M, 1, 2).body).toBe("🏁 Fin du match : OGC Nice 1-2 Stade Rennais");
  });
  it("veille du match", () => {
    const t = eveText(M, "LIGUE_1", "19:00", false);
    expect(t.title).toBe("C’est déjà demain ! 👀");
    expect(t.body).toBe("Le match de Ligue 1 OGC Nice – Stade Rennais est prévu demain à 19:00. Saisis tes pronos ou vérifie-les maintenant.");
    expect(eveText(M, "EUROPA_LEAGUE", "21:00", true).title).toBe("C’est aujourd’hui ! 👀");
  });
  it("cotes et composition", () => {
    expect(oddsText(M).tag).toBe("m1-odds");
    expect(lineupText(M).body).toContain("remplaçants");
  });
});
