// Données FICTIVES.
import { describe, expect, it } from "vitest";
import { rankHistory } from "../rank-history";

const P = [
  { userId: "moi", pseudo: "Moi" },
  { userId: "a", pseudo: "A" },
  { userId: "b", pseudo: "B" },
];
const r = (userId: string, matchId: string, totalPoints: number) => ({
  userId,
  matchId,
  totalPoints,
  category: totalPoints >= 4 ? ("EXACT" as const) : ("WRONG" as const),
  correctScorer: false,
});

describe("Historique de position", () => {
  it("position cumulée après chaque match, limitée aux n derniers", () => {
    const matches = ["m1", "m2", "m3"].map((id, i) => ({ id, label: `J${i + 1}` }));
    const results = [r("moi", "m1", 0), r("a", "m1", 4), r("b", "m1", 1), r("moi", "m2", 4), r("moi", "m3", 4), r("b", "m3", 0)];
    const h = rankHistory("moi", P, results, matches);
    expect(h.map((x) => [x.label, x.rank])).toEqual([
      ["J1", 3], // 0 pt, derrière A (4) et B (1)
      ["J2", 1], // 4 pts et 1 exact, à égalité parfaite avec A : ex æquo 1er
      ["J3", 1], // 8 pts : seul en tête
    ]);
    expect(rankHistory("moi", P, results, matches, 2).map((x) => x.label)).toEqual(["J2", "J3"]);
  });
});
