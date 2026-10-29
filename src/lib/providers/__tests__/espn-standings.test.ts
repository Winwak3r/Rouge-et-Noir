// Données FICTIVES au format ESPN.
import { describe, expect, it } from "vitest";
import { parseLeagueLogo, parseStandings, translateZone } from "../espn-standings";

const entry = (id: string, name: string, rank: number, pts: number, note?: object) => ({
  team: { id, displayName: name, logos: [{ href: `${id}.png` }] },
  note,
  stats: [
    { name: "rank", value: rank },
    { name: "points", value: pts },
    { name: "gamesPlayed", value: 9 },
    { name: "wins", value: 5 },
    { name: "ties", value: 2 },
    { name: "losses", value: 2 },
    { name: "pointsFor", value: 15 },
    { name: "pointsAgainst", value: 9 },
    { name: "pointDifferential", value: 6 },
  ],
});

describe("Classements ESPN", () => {
  it("lit et trie le tableau, avec les zones traduites", () => {
    const rows = parseStandings({
      children: [
        {
          standings: {
            entries: [
              entry("169", "Stade Rennais", 2, 17, { color: "81D6AC", description: "Champions League" }),
              entry("160", "Équipe A", 1, 20),
            ],
          },
        },
      ],
    });
    expect(rows.map((r) => r.name)).toEqual(["Équipe A", "Stade Rennais"]);
    expect(rows[1]).toMatchObject({ teamId: 169, points: 17, played: 9, won: 5, drawn: 2, lost: 2, goalDiff: 6, logo: "169.png" });
    expect(rows[1].zone).toEqual({ color: "#81D6AC", label: "Ligue des champions" });
  });
  it("traduit les zones courantes", () => {
    expect(translateZone("Relegation")).toBe("Relégation");
    expect(translateZone("Relegation playoff")).toBe("Barrage de relégation");
    expect(translateZone("Knockout Round Playoffs")).toBe("Barrages");
  });
  it("logo de compétition", () => {
    expect(parseLeagueLogo({ leagues: [{ logos: [{ href: "dark.png", rel: ["full", "dark"] }, { href: "clair.png", rel: ["full", "default"] }] }] })).toBe("clair.png");
  });
});

describe("Classement des buteurs (format ESPN, données fictives)", () => {
  it("lit les buts dans « displayValue », trie et gère les ex æquo", async () => {
    const { parseScorerLeaders } = await import("../espn-standings");
    const rows = parseScorerLeaders({
      stats: [
        { name: "assistsLeaders", leaders: [{ displayValue: "Matches: 9, Assists: 5", athlete: { id: "1", displayName: "Passeur" } }] },
        {
          name: "goalsLeaders",
          displayName: "Top Scorers",
          leaders: [
            { displayValue: "Matches: 9, Goals: 5", value: 5, athlete: { id: "2", displayName: "B", team: { id: "160", displayName: "Équipe B" } } },
            { displayValue: "Matches: 9, Goals: 7", value: 7, athlete: { id: "3", displayName: "Boulaye Dia", team: { id: "169", displayName: "Stade Rennais", logos: [{ href: "r.png" }] } } },
            { displayValue: "Matches: 8, Goals: 5", value: 5, athlete: { id: "4", displayName: "A", team: { id: "161", displayName: "Équipe A" } } },
          ],
        },
      ],
    });
    expect(rows.map((r) => [r.rank, r.name, r.goals])).toEqual([
      [1, "Boulaye Dia", 7],
      [2, "A", 5],
      [2, "B", 5],
    ]);
    expect(rows[0]).toMatchObject({ teamId: 169, teamLogo: "r.png", played: 9 });
  });
});
