import { describe, expect, it } from "vitest";
import { DEFAULT_BONUS_QUOTAS, bonusChoiceError, bonusPoints, normalizeQuotas, remainingBonuses, withBonuses } from "../bonus";

describe("Les Trésors du Terroir : points", () => {
  it("Menhirs bretons : +2 si le SRFC n'encaisse pas de but, sinon rien", () => {
    expect(bonusPoints({ kind: "MENHIRS", scorePoints: 1, scorerPoints: 0, cleanSheet: true })).toBe(2);
    expect(bonusPoints({ kind: "MENHIRS", scorePoints: 4, scorerPoints: 3, cleanSheet: false })).toBe(0);
  });
  it("Crêpe flambée : les points du buteur doublés (rien s'il ne marque pas)", () => {
    expect(bonusPoints({ kind: "CREPE_FLAMBEE", scorePoints: 4, scorerPoints: 3, cleanSheet: false })).toBe(3);
    expect(bonusPoints({ kind: "CREPE_FLAMBEE", scorePoints: 4, scorerPoints: 0, cleanSheet: false })).toBe(0);
  });
  it("Bigouden : les points du score doublés (le −1 n'est pas doublé)", () => {
    expect(bonusPoints({ kind: "BIGOUDEN", scorePoints: 4, scorerPoints: 3, cleanSheet: false })).toBe(4);
    expect(bonusPoints({ kind: "BIGOUDEN", scorePoints: -1, scorerPoints: 0, cleanSheet: false })).toBe(0);
  });
});

describe("Les Trésors du Terroir : stock et règles", () => {
  it("3 Menhirs, 3 Crêpes flambées et 2 Bigoudens par ligue ; anciens réglages remplacés", () => {
    expect(DEFAULT_BONUS_QUOTAS).toEqual({ MENHIRS: 3, CREPE_FLAMBEE: 3, BIGOUDEN: 2 });
    expect(normalizeQuotas({ KOUIGN_AMANN: 1, GALETTE_SAUCISSE: 4 })).toEqual({ MENHIRS: 3, CREPE_FLAMBEE: 3, BIGOUDEN: 2 });
    expect(normalizeQuotas({ MENHIRS: 1, CREPE_FLAMBEE: 4, BIGOUDEN: 5 })).toEqual({ MENHIRS: 1, CREPE_FLAMBEE: 4, BIGOUDEN: 5 });
  });
  it("stock restant : saison + ajouts de l'admin − bonus joués", () => {
    expect(remainingBonuses(DEFAULT_BONUS_QUOTAS, [{ kind: "CREPE_FLAMBEE" }], [{ kind: "BIGOUDEN", delta: 1 }])).toEqual({
      MENHIRS: 3,
      CREPE_FLAMBEE: 2,
      BIGOUDEN: 3,
    });
  });
  it("conditions : un score ; un buteur pour la Crêpe flambée", () => {
    expect(bonusChoiceError({ kind: "MENHIRS", hasScore: false, scorerId: null, noScorerPick: false })).toContain("score");
    expect(bonusChoiceError({ kind: "BIGOUDEN", hasScore: true, scorerId: null, noScorerPick: true })).toBeNull();
    expect(bonusChoiceError({ kind: "CREPE_FLAMBEE", hasScore: true, scorerId: null, noScorerPick: true })).toContain("buteur");
    expect(bonusChoiceError({ kind: "CREPE_FLAMBEE", hasScore: true, scorerId: "dia", noScorerPick: false })).toBeNull();
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
