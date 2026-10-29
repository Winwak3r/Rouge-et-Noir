// Données de test FICTIVES.
import { describe, expect, it } from "vitest";
import { buildStandings, type ResultRow } from "../index";

const P = (id: string) => ({ userId: id, pseudo: id });
const row = (
  userId: string,
  category: ResultRow["category"],
  totalPoints: number,
  correctScorer = false,
): ResultRow => ({ userId, category, totalPoints, correctScorer });

describe("Classement général", () => {
  it("trie par points décroissants et compte les statistiques", () => {
    const st = buildStandings(
      [P("Alpha"), P("Bravo")],
      [row("Alpha", "EXACT", 4), row("Alpha", "MISSING", -1), row("Bravo", "GOAL_DIFF", 5, true)],
    );
    expect(st.map((x) => x.userId)).toEqual(["Bravo", "Alpha"]);
    expect(st[1]).toMatchObject({ totalPoints: 3, exactScores: 1, missing: 1, scoredMatches: 2 });
    expect(st[0]).toMatchObject({ goalDiffs: 1, scorers: 1 });
  });

  it("départage 1 : plus de scores exacts", () => {
    const st = buildStandings(
      [P("A"), P("B")],
      [row("A", "GOAL_DIFF", 2), row("A", "GOAL_DIFF", 2), row("B", "EXACT", 4)],
    );
    expect(st.map((x) => [x.userId, x.rank])).toEqual([["B", 1], ["A", 2]]);
  });

  it("départage 2 : plus de buteurs trouvés (avant les bons écarts)", () => {
    // 4 points chacun, 0 score exact. A : 1 buteur, 0 bon écart. B : 0 buteur, 2 bons écarts.
    const st = buildStandings(
      [P("A"), P("B")],
      [row("A", "OUTCOME", 4, true), row("B", "GOAL_DIFF", 2), row("B", "GOAL_DIFF", 2)],
    );
    expect(st[0]).toMatchObject({ userId: "A", rank: 1, tied: false });
    expect(st[1]).toMatchObject({ userId: "B", rank: 2, tied: false });
  });

  it("départage 3 : plus de bons écarts", () => {
    const st = buildStandings(
      [P("A"), P("B")],
      [row("A", "OUTCOME", 1), row("A", "OUTCOME", 1), row("B", "GOAL_DIFF", 2)],
    );
    expect(st[0].userId).toBe("B");
  });

  it("égalité persistante → ex æquo, pas de quatrième critère", () => {
    const st = buildStandings(
      [P("Zoé"), P("Alex"), P("Max"), P("Noa")],
      [row("Zoé", "EXACT", 4), row("Alex", "EXACT", 4), row("Max", "EXACT", 6, true), row("Noa", "MISSING", -1)],
    );
    expect(st.map((x) => [x.userId, x.rank, x.tied])).toEqual([
      ["Max", 1, false],
      ["Alex", 2, true],
      ["Zoé", 2, true],
      ["Noa", 4, false],
    ]);
  });

  it("un participant sans aucun match noté apparaît avec 0", () => {
    const st = buildStandings([P("A"), P("Nouveau")], [row("A", "WRONG", 0)]);
    expect(st.find((x) => x.userId === "Nouveau")).toMatchObject({ totalPoints: 0, scoredMatches: 0 });
  });
});
