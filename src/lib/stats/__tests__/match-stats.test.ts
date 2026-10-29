// Données FICTIVES.
import { describe, expect, it } from "vitest";
import { computeTable, formPoints, recentScorers, teamForm, type CompResult } from "../match-stats";

let id = 0;
const m = (day: number, h: number, a: number, hg: number, ag: number, goals: Array<[number, string, boolean?]> = []): CompResult => ({
  id: ++id,
  date: new Date(Date.UTC(2030, 8, day)),
  homeId: h,
  awayId: a,
  homeName: `E${h}`,
  awayName: `E${a}`,
  homeGoals: hg,
  awayGoals: ag,
  goals: goals.map(([teamId, player, ownGoal]) => ({ teamId, player, ownGoal: ownGoal ?? false })),
});

const R = 169;
const results = [
  m(1, R, 2, 2, 0, [[R, "Dia"], [R, "Blas"]]),
  m(8, 3, R, 1, 1, [[3, "X"], [R, "Dia"]]),
  m(15, R, 4, 0, 1, [[4, "Y"]]),
  m(22, 5, R, 0, 3, [[R, "Dia"], [R, "Al-Tamari"], [R, "Adverse", true]]),
  m(29, R, 6, 1, 0, [[R, "Blas"]]),
  m(30, 2, 3, 2, 2),
  m(31, 4, 5, 1, 0),
];

describe("Statistiques d'avant-match", () => {
  it("forme sur les 5 derniers matchs, du plus ancien au plus récent", () => {
    const f = teamForm(R, results);
    expect(f.map((e) => e.result).join("")).toBe("VNDVV");
    expect(f[3]).toMatchObject({ home: false, score: "3-0", opponent: "E5" });
    expect(formPoints(f)).toBe(10);
  });
  it("buteurs de l'équipe sur ses 5 derniers matchs, sans les csc", () => {
    expect(recentScorers(R, results)).toEqual([
      { player: "Dia", goals: 3 },
      { player: "Blas", goals: 2 },
      { player: "Al-Tamari", goals: 1 },
    ]);
  });
  it("classements général, domicile et extérieur", () => {
    expect(computeTable(results, "all")[0]).toMatchObject({ teamId: R, points: 10, rank: 1 });
    const home = computeTable(results, "home");
    expect(home.find((r) => r.teamId === R)).toMatchObject({ played: 3, points: 6 });
    const away = computeTable(results, "away");
    expect(away.find((r) => r.teamId === R)).toMatchObject({ played: 2, points: 4, rank: 1 });
  });
});

describe("Lecture des résultats ESPN (format scoreboard, données fictives)", () => {
  it("garde les matchs terminés et lit les buteurs", async () => {
    const { parseScoreboardResults } = await import("../espn-results");
    const rows = parseScoreboardResults({
      events: [
        {
          id: "1",
          date: "2030-09-01T15:00Z",
          competitions: [
            {
              status: { type: { completed: true } },
              competitors: [
                { homeAway: "home", score: "2", team: { id: "169", displayName: "Stade Rennais" } },
                { homeAway: "away", score: "1", team: { id: "174", displayName: "Strasbourg" } },
              ],
              details: [
                { scoringPlay: true, team: { id: "169" }, athletesInvolved: [{ displayName: "Dia" }], type: { text: "Goal" } },
                { scoringPlay: true, team: { id: "174" }, athletesInvolved: [{ displayName: "Lorient Défenseur" }], ownGoal: true, type: { text: "Own Goal" } },
                { scoringPlay: false, team: { id: "169" }, type: { text: "Yellow Card" } },
              ],
            },
          ],
        },
        { id: "2", date: "2030-09-08T15:00Z", competitions: [{ status: { type: { completed: false } }, competitors: [] }] },
      ],
    });
    expect(rows.length).toBe(1);
    expect(rows[0]).toMatchObject({ homeId: 169, awayGoals: 1 });
    expect(rows[0].goals).toEqual([
      { teamId: 169, player: "Dia", ownGoal: false },
      { teamId: 174, player: "Lorient Défenseur", ownGoal: true },
    ]);
  });
});
