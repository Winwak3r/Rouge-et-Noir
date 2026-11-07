import { describe, expect, it } from "vitest";
import { DEFAULT_BONUS_QUOTAS, bonusChoiceError, bonusPoints, remainingBonuses, withBonuses } from "../bonus";

const goals = ["dia", "blas", "dia", "dia"]; // triplé de Dia, un but de Blas

describe("Les Spécialités Maison : points", () => {
  it("Kouign-Amann : le total du match est doublé (0 reste 0)", () => {
    expect(bonusPoints({ kind: "KOUIGN_AMANN", matchTotal: 7, scorerId: null, scorerPoints: 0, rennesGoalScorerIds: [] })).toBe(7);
    expect(bonusPoints({ kind: "KOUIGN_AMANN", matchTotal: 0, scorerId: null, scorerPoints: 0, rennesGoalScorerIds: [] })).toBe(0);
  });
  it("Galettes Saucisses : le second buteur rapporte ses points s'il marque", () => {
    const base = { kind: "GALETTES_SAUCISSES" as const, matchTotal: 4, scorerId: "dia", scorerPoints: 2, secondScorerBonus: 3, rennesGoalScorerIds: goals };
    expect(bonusPoints({ ...base, secondScorerId: "blas" })).toBe(3);
    expect(bonusPoints({ ...base, secondScorerId: "nordin" })).toBe(0);
  });
  it("Pile de Crêpes : les points du buteur à chaque but (triplé : 2 crêpes de plus), sans plafond", () => {
    expect(bonusPoints({ kind: "PILE_CREPES", matchTotal: 5, scorerId: "dia", scorerPoints: 3, rennesGoalScorerIds: goals })).toBe(6);
    expect(bonusPoints({ kind: "PILE_CREPES", matchTotal: 3, scorerId: "blas", scorerPoints: 3, rennesGoalScorerIds: goals })).toBe(0); // un seul but
    expect(bonusPoints({ kind: "PILE_CREPES", matchTotal: 1, scorerId: "nordin", scorerPoints: 0, rennesGoalScorerIds: goals })).toBe(0);
  });
});

describe("Les Spécialités Maison : stock et règles", () => {
  it("stock restant dans la ligue : saison + ajouts de l'admin − bonus joués", () => {
    expect(remainingBonuses(DEFAULT_BONUS_QUOTAS, [{ kind: "PILE_CREPES" }], [{ kind: "KOUIGN_AMANN", delta: 1 }])).toEqual({
      KOUIGN_AMANN: 2,
      GALETTES_SAUCISSES: 2,
      PILE_CREPES: 1,
    });
    expect(remainingBonuses(DEFAULT_BONUS_QUOTAS, [{ kind: "KOUIGN_AMANN" }, { kind: "KOUIGN_AMANN" }]).KOUIGN_AMANN).toBe(0);
  });
  it("conditions : un score, un buteur pour les crêpes et les galettes, deux buteurs différents", () => {
    expect(bonusChoiceError({ kind: "KOUIGN_AMANN", hasScore: false, scorerId: null, noScorerPick: false })).toContain("score");
    expect(bonusChoiceError({ kind: "KOUIGN_AMANN", hasScore: true, scorerId: null, noScorerPick: true })).toBeNull();
    expect(bonusChoiceError({ kind: "PILE_CREPES", hasScore: true, scorerId: null, noScorerPick: true })).toContain("buteur");
    expect(bonusChoiceError({ kind: "GALETTES_SAUCISSES", hasScore: true, scorerId: "dia", noScorerPick: false, secondScorerId: "dia" })).toContain("différent");
    expect(bonusChoiceError({ kind: "GALETTES_SAUCISSES", hasScore: true, scorerId: "dia", noScorerPick: false, secondScorerId: "blas" })).toBeNull();
  });
  it("classement d'une ligue : les points des bonus s'ajoutent au bon match", () => {
    const r = withBonuses(
      [
        { userId: "a", matchId: "m1", totalPoints: 4 },
        { userId: "a", matchId: "m2", totalPoints: 1 },
      ],
      [{ userId: "a", matchId: "m1", points: 4 }],
    );
    expect(r.map((x) => x.totalPoints)).toEqual([8, 1]);
  });
});
