// Données de test FICTIVES : identifiants, dates et cotes inventés.
import { describe, expect, it } from "vitest";
import {
  DEFAULT_RULES,
  arePredictionsPublic,
  canEditPrediction,
  evaluateScore,
  evaluateScorer,
  fractionalToDecimal,
  oddsToBonus,
  scoreParticipantForMatch,
  type ParticipantMatchInput,
  type ScoringRules,
} from "../index";

const R = DEFAULT_RULES;
const s = (rennes: number, opponent: number) => ({ rennes, opponent });

describe("Score : exemples du cahier des charges (réel Rennes 2-1)", () => {
  const real = s(2, 1);
  it("3-2 → bon résultat + bon écart = 2", () => {
    expect(evaluateScore(s(3, 2), real, R)).toEqual({ category: "GOAL_DIFF", points: 2 });
  });
  it("1-0 → 2", () => {
    expect(evaluateScore(s(1, 0), real, R)).toEqual({ category: "GOAL_DIFF", points: 2 });
  });
  it("1-1 → mauvais résultat = 0", () => {
    expect(evaluateScore(s(1, 1), real, R)).toEqual({ category: "WRONG", points: 0 });
  });
  it("2-1 → score exact = 4 (et pas 4 + 2)", () => {
    expect(evaluateScore(s(2, 1), real, R)).toEqual({ category: "EXACT", points: 4 });
  });
  it("aucun pronostic → -1", () => {
    expect(evaluateScore(null, real, R)).toEqual({ category: "MISSING", points: -1 });
  });
  it("3-0 → bon résultat, mauvais écart = 1", () => {
    expect(evaluateScore(s(3, 0), real, R)).toEqual({ category: "OUTCOME", points: 1 });
  });
});

describe("Score : nuls et défaites", () => {
  it("nul 1-1 pronostiqué 0-0 → bon écart (0) = 2", () => {
    expect(evaluateScore(s(0, 0), s(1, 1), R).points).toBe(2);
  });
  it("défaite 0-2 pronostiquée 1-2 → bon résultat seul = 1", () => {
    expect(evaluateScore(s(1, 2), s(0, 2), R).points).toBe(1);
  });
  it("défaite 0-2 pronostiquée 1-3 → bon écart = 2", () => {
    expect(evaluateScore(s(1, 3), s(0, 2), R).points).toBe(2);
  });
  it("refuse un score négatif ou décimal", () => {
    expect(() => evaluateScore(s(-1, 0), s(1, 0), R)).toThrow();
    expect(() => evaluateScore(s(1.5, 0), s(1, 0), R)).toThrow();
  });
});

describe("Bonus buteur", () => {
  it("cote ÷ 2 arrondie à l'entier le plus proche, entre 1 et 6", () => {
    expect(oddsToBonus(4.6, R)).toBe(2); // 2,30 → plus proche de 2
    expect(oddsToBonus(5.76, R)).toBe(3); // 2,88 → plus proche de 3
    expect(oddsToBonus(5.0, R)).toBe(3); // 2,50 → moitié : vers le haut
    expect(oddsToBonus(4.98, R)).toBe(2); // 2,49
    expect(oddsToBonus(1.4, R)).toBe(1); // 0,70 → 1 (minimum)
    expect(oddsToBonus(2.0, R)).toBe(1);
    expect(oddsToBonus(3.75, R)).toBe(2); // 1,875
    expect(oddsToBonus(15, R)).toBe(6); // 7,5 → plafonné à 6
    expect(oddsToBonus(41, R)).toBe(6);
  });
  it("diviseur et minimum réglables", () => {
    const rules: ScoringRules = { ...R, scorerBonus: { oddsDivisor: 1, minBonus: 2, maxBonus: 10 } };
    expect(oddsToBonus(1.4, rules)).toBe(2);
    expect(oddsToBonus(3.25, rules)).toBe(3);
    expect(oddsToBonus(12, rules)).toBe(10);
  });
  it("refuse une cote non décimale (≤ 1)", () => {
    expect(() => oddsToBonus(1, R)).toThrow();
    expect(() => oddsToBonus(0.45, R)).toThrow();
  });
  it("convertit les cotes fractionnaires de Bet365", () => {
    expect(fractionalToDecimal("11/4")).toBe(3.75);
    expect(fractionalToDecimal("15/4")).toBe(4.75);
    expect(fractionalToDecimal("14/1")).toBe(15);
    expect(fractionalToDecimal("1/3")).toBe(1.33);
    expect(fractionalToDecimal("SP")).toBeNull();
  });
  it("buteur correct avec cote figée", () => {
    const r = evaluateScorer(
      { predictedPlayerId: "p9", oddsSnapshot: 3.25, rennesScorerIds: ["p9", "p10"] },
      R,
    );
    expect(r).toEqual({ correct: true, points: 2, oddsUsed: 3.25, usedFallback: false, noScorerHit: false });
  });
  it("buteur qui ne marque pas → 0", () => {
    const r = evaluateScorer(
      { predictedPlayerId: "p7", oddsSnapshot: 2.5, rennesScorerIds: ["p9"] },
      R,
    );
    expect(r.points).toBe(0);
    expect(r.correct).toBe(false);
  });
  it("pas de pari buteur → 0, même si aucun Rennais ne marque", () => {
    expect(evaluateScorer({ predictedPlayerId: null, oddsSnapshot: null, rennesScorerIds: [] }, R).points).toBe(0);
  });
  it("« Aucun buteur » mais un Rennais marque → 0", () => {
    expect(
      evaluateScorer({ predictedPlayerId: null, noScorerPick: true, oddsSnapshot: null, rennesScorerIds: ["p9"] }, R)
        .points,
    ).toBe(0);
  });
  it("« Aucun buteur » et aucun Rennais ne marque → +2, sans compter comme buteur trouvé", () => {
    const r = evaluateScorer({ predictedPlayerId: null, noScorerPick: true, oddsSnapshot: null, rennesScorerIds: [] }, R);
    expect(r).toMatchObject({ points: 2, correct: false, noScorerHit: true });
  });
  it("« Aucun buteur » : un but contre son camp adverse ne compte pas → +2", () => {
    const r = evaluateScorer(
      { predictedPlayerId: null, noScorerPick: true, oddsSnapshot: null, rennesScorerIds: [], rennesPlayerScored: false },
      R,
    );
    expect(r.points).toBe(2);
  });
  it("« Aucun buteur » : but rennais d'un joueur non identifié → 0 (prudence)", () => {
    const r = evaluateScorer(
      { predictedPlayerId: null, noScorerPick: true, oddsSnapshot: null, rennesScorerIds: [], rennesPlayerScored: true },
      R,
    );
    expect(r.points).toBe(0);
  });
  it("« Aucun buteur » désactivable dans le barème", () => {
    const rules: ScoringRules = { ...R, noScorerBonus: 0 };
    expect(
      evaluateScorer({ predictedPlayerId: null, noScorerPick: true, oddsSnapshot: null, rennesScorerIds: [] }, rules).points,
    ).toBe(0);
  });
  it("buteur correct sans cote → secours fixe de 1", () => {
    const r = evaluateScorer(
      { predictedPlayerId: "p9", oddsSnapshot: null, rennesScorerIds: ["p9"] },
      R,
    );
    expect(r).toEqual({ correct: true, points: 1, oddsUsed: null, usedFallback: true, noScorerHit: false });
  });
  it("secours désactivé par l'admin → 0 mais buteur compté comme trouvé", () => {
    const rules: ScoringRules = { ...R, scorerFallback: { mode: "NONE", fixedBonus: 0 } };
    const r = evaluateScorer(
      { predictedPlayerId: "p9", oddsSnapshot: null, rennesScorerIds: ["p9"] },
      rules,
    );
    expect(r.points).toBe(0);
    expect(r.correct).toBe(true);
  });
});

// ─── Match complet ──────────────────────────────────────────────────────────

const KICKOFF = new Date("2030-01-10T20:00:00Z"); // date fictive
const before = (min: number) => new Date(KICKOFF.getTime() - min * 60_000);
const after = (min: number) => new Date(KICKOFF.getTime() + min * 60_000);

function base(over: Partial<ParticipantMatchInput> = {}): ParticipantMatchInput {
  return {
    kickoffAt: KICKOFF,
    status: "FINISHED",
    resultConfirmed: true,
    isKnockout: false,
    result: { regulation: s(2, 1), afterExtraTime: null, penalties: null },
    rennesScorerIds: ["p9"],
    userRegisteredAt: new Date("2029-08-01T00:00:00Z"),
    prediction: { score: s(2, 1), scorerId: "p9", scorerOdds: 5.7, savedAt: before(60) },
    ...over,
  };
}

describe("Match complet", () => {
  it("total = points du score + bonus buteur", () => {
    const r = scoreParticipantForMatch(base(), R);
    expect(r).toMatchObject({ category: "EXACT", scorePoints: 4, scorerPoints: 3, totalPoints: 7 });
  });
  it("défaite 0-1 pronostiquée 0-1 avec « Aucun buteur » → 4 + 2 = 6", () => {
    const r = scoreParticipantForMatch(
      base({
        result: { regulation: s(0, 1), afterExtraTime: null, penalties: null },
        rennesScorerIds: [],
        rennesPlayerScored: false,
        prediction: { score: s(0, 1), scorerId: null, noScorerPick: true, scorerOdds: null, savedAt: before(30) },
      }),
      R,
    );
    expect(r).toMatchObject({ category: "EXACT", scorePoints: 4, scorerPoints: 2, totalPoints: 6, correctScorer: false });
  });
  it("sans pronostic : jamais de bonus « Aucun buteur »", () => {
    const r = scoreParticipantForMatch(
      base({ prediction: null, rennesScorerIds: [], rennesPlayerScored: false, result: { regulation: s(0, 0), afterExtraTime: null, penalties: null } }),
      R,
    );
    expect(r).toMatchObject({ category: "MISSING", totalPoints: -1 });
  });
  it("sans pronostic, inscrit avant le match → -1", () => {
    const r = scoreParticipantForMatch(base({ prediction: null }), R);
    expect(r).toMatchObject({ category: "MISSING", totalPoints: -1 });
  });
  it("sans pronostic, inscrit après le coup d'envoi → aucune ligne", () => {
    expect(
      scoreParticipantForMatch(base({ prediction: null, userRegisteredAt: after(5) }), R),
    ).toBeNull();
  });
  it("pronostic enregistré après le coup d'envoi → ignoré (-1)", () => {
    const late = { score: s(2, 1), scorerId: null, scorerOdds: null, savedAt: after(1) };
    expect(scoreParticipantForMatch(base({ prediction: late }), R)).toMatchObject({
      category: "MISSING",
      totalPoints: -1,
    });
  });
  it("match annulé → aucune ligne, pas de pénalité", () => {
    expect(scoreParticipantForMatch(base({ status: "CANCELLED", prediction: null }), R)).toBeNull();
  });
  it("résultat non confirmé → aucun point", () => {
    expect(scoreParticipantForMatch(base({ resultConfirmed: false }), R)).toBeNull();
  });
  it("match en cours → aucun point", () => {
    expect(scoreParticipantForMatch(base({ status: "LIVE" }), R)).toBeNull();
  });
  it("élimination directe : score après prolongation, tirs au but ignorés", () => {
    const r = scoreParticipantForMatch(
      base({
        isKnockout: true,
        result: { regulation: s(1, 1), afterExtraTime: s(2, 2), penalties: s(4, 3) },
        prediction: { score: s(2, 2), scorerId: null, scorerOdds: null, savedAt: before(10) },
      }),
      R,
    );
    expect(r).toMatchObject({ category: "EXACT", totalPoints: 4 });
  });
  it("élimination directe en mode temps réglementaire", () => {
    const rules: ScoringRules = { ...R, knockoutScoreBasis: "REGULATION" };
    const r = scoreParticipantForMatch(
      base({
        isKnockout: true,
        result: { regulation: s(1, 1), afterExtraTime: s(2, 1), penalties: null },
        prediction: { score: s(1, 1), scorerId: null, scorerOdds: null, savedAt: before(10) },
      }),
      rules,
    );
    expect(r).toMatchObject({ category: "EXACT", totalPoints: 4 });
  });
  it("barème modifié : la version appliquée est enregistrée", () => {
    const rules: ScoringRules = { ...R, version: 3, points: { ...R.points, exact: 5 } };
    expect(scoreParticipantForMatch(base(), rules)).toMatchObject({ scorePoints: 5, rulesVersion: 3 });
  });
  it("recalculer deux fois donne exactement le même résultat (idempotence)", () => {
    expect(scoreParticipantForMatch(base(), R)).toEqual(scoreParticipantForMatch(base(), R));
  });
});

describe("Verrouillage et confidentialité", () => {
  const m = { kickoffAt: KICKOFF, status: "SCHEDULED" as const };
  it("modifiable jusqu'à la dernière seconde avant le coup d'envoi", () => {
    expect(canEditPrediction(m, before(0.01))).toBe(true);
  });
  it("bloqué pile au coup d'envoi et après", () => {
    expect(canEditPrediction(m, KICKOFF)).toBe(false);
    expect(canEditPrediction(m, after(30))).toBe(false);
  });
  it("bloqué si le fournisseur dit que le match a commencé, même avant l'heure prévue", () => {
    expect(canEditPrediction({ ...m, status: "LIVE" }, before(5))).toBe(false);
  });
  it("match reporté : reste modifiable et confidentiel même si l'ancienne date est passée", () => {
    const p = { ...m, status: "POSTPONED" as const };
    expect(canEditPrediction(p, after(60))).toBe(true);
    expect(arePredictionsPublic(p, after(60))).toBe(false);
  });
  it("match reprogrammé : la nouvelle heure fait foi", () => {
    const moved = { kickoffAt: after(7 * 24 * 60), status: "SCHEDULED" as const };
    expect(canEditPrediction(moved, after(60))).toBe(true);
  });
  it("pronostics des autres masqués avant, visibles après le coup d'envoi", () => {
    expect(arePredictionsPublic(m, before(1))).toBe(false);
    expect(arePredictionsPublic(m, KICKOFF)).toBe(true);
    expect(arePredictionsPublic({ ...m, status: "LIVE" }, before(1))).toBe(true);
  });
  it("date limite de l'admin plus tôt que le coup d'envoi : verrouillage anticipé", () => {
    const early = { ...m, deadlineAt: before(60) };
    expect(canEditPrediction(early, before(61))).toBe(true);
    expect(canEditPrediction(early, before(30))).toBe(false);
  });
  it("date limite plus tardive que le coup d'envoi : ignorée (jamais après le coup d'envoi)", () => {
    expect(canEditPrediction({ ...m, deadlineAt: after(30) }, after(1))).toBe(false);
  });
  it("pronostic enregistré après la date limite de l'admin → ignoré", () => {
    const r = scoreParticipantForMatch(
      base({
        deadlineAt: before(60),
        prediction: { score: s(2, 1), scorerId: null, scorerOdds: null, savedAt: before(30) },
      }),
      R,
    );
    expect(r).toMatchObject({ category: "MISSING" });
  });
  it("match annulé : jamais modifiable", () => {
    expect(canEditPrediction({ ...m, status: "CANCELLED" }, before(60))).toBe(false);
  });
});
