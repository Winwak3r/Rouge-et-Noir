import { describe, expect, it } from "vitest";
import { DEFAULT_BONUS_QUOTAS, bonusChoiceError, bonusPoints, normalizeQuotas, remainingBonuses, withBonuses } from "../bonus";

describe("Les Spécialités Maison : points", () => {
  it("Kouign-Amann : tout le match doublé (score et buteur), 0 reste 0", () => {
    expect(bonusPoints({ kind: "KOUIGN_AMANN", matchTotal: 7, scorerPoints: 3 })).toBe(7);
    expect(bonusPoints({ kind: "KOUIGN_AMANN", matchTotal: 0, scorerPoints: 0 })).toBe(0);
  });
  it("Galette-Saucisse : les points du buteur doublés (rien s'il ne marque pas)", () => {
    expect(bonusPoints({ kind: "GALETTE_SAUCISSE", matchTotal: 7, scorerPoints: 3 })).toBe(3);
    expect(bonusPoints({ kind: "GALETTE_SAUCISSE", matchTotal: 4, scorerPoints: 0 })).toBe(0);
  });
});

describe("Les Spécialités Maison : stock et règles", () => {
  it("2 Kouign-Amann et 3 Galettes-Saucisses par ligue ; anciens réglages remplacés", () => {
    expect(DEFAULT_BONUS_QUOTAS).toEqual({ KOUIGN_AMANN: 2, GALETTE_SAUCISSE: 3 });
    expect(normalizeQuotas({ KOUIGN_AMANN: 1, GALETTES_SAUCISSES: 2, PILE_CREPES: 2 })).toEqual({ KOUIGN_AMANN: 2, GALETTE_SAUCISSE: 3 });
    expect(normalizeQuotas({ KOUIGN_AMANN: 1, GALETTE_SAUCISSE: 4 })).toEqual({ KOUIGN_AMANN: 1, GALETTE_SAUCISSE: 4 });
  });
  it("stock restant : saison + ajouts de l'admin − bonus joués", () => {
    expect(remainingBonuses(DEFAULT_BONUS_QUOTAS, [{ kind: "GALETTE_SAUCISSE" }], [{ kind: "KOUIGN_AMANN", delta: 1 }])).toEqual({
      KOUIGN_AMANN: 3,
      GALETTE_SAUCISSE: 2,
    });
  });
  it("conditions : un score ; un buteur pour la Galette-Saucisse", () => {
    expect(bonusChoiceError({ kind: "KOUIGN_AMANN", hasScore: false, scorerId: null, noScorerPick: false })).toContain("score");
    expect(bonusChoiceError({ kind: "KOUIGN_AMANN", hasScore: true, scorerId: null, noScorerPick: true })).toBeNull();
    expect(bonusChoiceError({ kind: "GALETTE_SAUCISSE", hasScore: true, scorerId: null, noScorerPick: true })).toContain("buteur");
    expect(bonusChoiceError({ kind: "GALETTE_SAUCISSE", hasScore: true, scorerId: "dia", noScorerPick: false })).toBeNull();
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
