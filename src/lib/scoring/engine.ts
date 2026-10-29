import type { Outcome, ScoreCategory, ScoreLine, ScoringRules } from "./rules";

// ─── Pronostic du score ─────────────────────────────────────────────────────

function assertScoreLine(s: ScoreLine, label: string): void {
  for (const v of [s.rennes, s.opponent]) {
    if (!Number.isInteger(v) || v < 0) {
      throw new Error(`${label} invalide : ${JSON.stringify(s)}`);
    }
  }
}

export function outcomeOf(s: ScoreLine): Outcome {
  if (s.rennes > s.opponent) return "WIN";
  if (s.rennes < s.opponent) return "LOSS";
  return "DRAW";
}

/** Catégories exclusives : le score exact est toujours prioritaire (4 au total, pas 4 + 2). */
export function evaluateScore(
  prediction: ScoreLine | null,
  result: ScoreLine,
  rules: ScoringRules,
): { category: ScoreCategory; points: number } {
  assertScoreLine(result, "Résultat");
  if (prediction === null) return { category: "MISSING", points: rules.points.missing };
  assertScoreLine(prediction, "Pronostic");

  if (prediction.rennes === result.rennes && prediction.opponent === result.opponent) {
    return { category: "EXACT", points: rules.points.exact };
  }
  if (outcomeOf(prediction) !== outcomeOf(result)) {
    return { category: "WRONG", points: rules.points.wrong };
  }
  if (prediction.rennes - prediction.opponent === result.rennes - result.opponent) {
    return { category: "GOAL_DIFF", points: rules.points.goalDiff };
  }
  return { category: "OUTCOME", points: rules.points.outcome };
}

// ─── Bonus buteur ───────────────────────────────────────────────────────────

/**
 * Cote décimale ÷ diviseur, arrondie à l'entier LE PLUS PROCHE (2,30 → 2 ; 2,88 → 3 ; 2,50 → 3),
 * puis ramenée entre le minimum et le maximum (6 par défaut).
 * Calcul en centièmes entiers : aucune erreur d'arrondi des nombres à virgule.
 */
export function oddsToBonus(odds: number, rules: ScoringRules): number {
  if (!isValidOdds(odds)) throw new Error(`Cote décimale invalide : ${odds}`);
  const { oddsDivisor, minBonus, maxBonus } = rules.scorerBonus;
  if (!(oddsDivisor > 0)) throw new Error(`Diviseur de cote invalide : ${oddsDivisor}`);
  const cents = Math.round(odds * 100);
  const divisorCents = Math.round(oddsDivisor * 100);
  const nearest = Math.floor((2 * cents + divisorCents) / (2 * divisorCents)); // arrondi au plus proche (moitié vers le haut)
  return Math.min(Math.max(nearest, minBonus), maxBonus ?? Infinity);
}

/** Cote fractionnaire britannique (« 11/4 ») → cote décimale (3,75). */
export function fractionalToDecimal(value: string): number | null {
  const m = /^\s*(\d+)\s*\/\s*(\d+)\s*$/.exec(value);
  if (!m) return null;
  const num = Number(m[1]);
  const den = Number(m[2]);
  if (den === 0) return null;
  return Math.round((1 + num / den) * 100) / 100;
}

export function isValidOdds(odds: number | null | undefined): odds is number {
  return typeof odds === "number" && Number.isFinite(odds) && odds > 1;
}

export interface ScorerInput {
  predictedPlayerId: string | null;
  /** Pari volontaire « Aucun buteur rennais ». */
  noScorerPick?: boolean;
  /** Cote figée au verrouillage (null si aucune cote fiable). */
  oddsSnapshot: number | null;
  /** Joueurs rennais ayant marqué pour Rennes, hors buts contre son camp et tirs au but. */
  rennesScorerIds: readonly string[];
  /**
   * Un joueur rennais a-t-il marqué ? (un but contre son camp adverse ne compte pas).
   * Par défaut : au moins un buteur identifié.
   */
  rennesPlayerScored?: boolean;
}

export function evaluateScorer(
  input: ScorerInput,
  rules: ScoringRules,
): { correct: boolean; points: number; oddsUsed: number | null; usedFallback: boolean; noScorerHit: boolean } {
  const none = { correct: false, points: 0, oddsUsed: null, usedFallback: false, noScorerHit: false };
  if (input.predictedPlayerId === null) {
    // Pas de pari buteur : rien. « Aucun buteur » choisi : bonus si aucun joueur rennais n'a marqué.
    if (!input.noScorerPick) return none;
    const scored = input.rennesPlayerScored ?? input.rennesScorerIds.length > 0;
    return !scored && rules.noScorerBonus > 0 ? { ...none, points: rules.noScorerBonus, noScorerHit: true } : none;
  }
  if (!input.rennesScorerIds.includes(input.predictedPlayerId)) return none;

  if (isValidOdds(input.oddsSnapshot)) {
    return {
      correct: true,
      points: oddsToBonus(input.oddsSnapshot, rules),
      oddsUsed: input.oddsSnapshot,
      usedFallback: false,
      noScorerHit: false,
    };
  }
  const fb = rules.scorerFallback;
  return {
    correct: true,
    points: fb.mode === "FIXED" ? fb.fixedBonus : 0,
    oddsUsed: null,
    usedFallback: true,
    noScorerHit: false,
  };
}

// ─── Match complet pour un participant ──────────────────────────────────────

export type MatchStatus =
  | "SCHEDULED"
  | "POSTPONED"
  | "LIVE"
  | "INTERRUPTED"
  | "FINISHED"
  | "CANCELLED";

export interface OfficialResult {
  regulation: ScoreLine; // fin du temps réglementaire
  afterExtraTime: ScoreLine | null; // cumulé, null sans prolongation
  penalties: ScoreLine | null; // jamais utilisé pour le score pronostiqué
}

export function scoreLineForPredictions(
  result: OfficialResult,
  isKnockout: boolean,
  rules: ScoringRules,
): ScoreLine {
  if (isKnockout && rules.knockoutScoreBasis === "AFTER_EXTRA_TIME" && result.afterExtraTime) {
    return result.afterExtraTime;
  }
  return result.regulation;
}

export interface ParticipantMatchInput {
  kickoffAt: Date;
  deadlineAt?: Date | null;
  status: MatchStatus;
  resultConfirmed: boolean;
  isKnockout: boolean;
  result: OfficialResult | null;
  rennesScorerIds: readonly string[];
  rennesPlayerScored?: boolean;
  userRegisteredAt: Date;
  prediction: {
    score: ScoreLine;
    scorerId: string | null;
    noScorerPick?: boolean;
    scorerOdds: number | null;
    savedAt: Date; // dernière modification enregistrée
  } | null;
}

export interface ParticipantMatchScore {
  category: ScoreCategory;
  scorePoints: number;
  scorerPoints: number;
  totalPoints: number;
  correctScorer: boolean;
  oddsUsed: number | null;
  usedFallback: boolean;
  rulesVersion: number;
}

/**
 * Renvoie null quand aucune ligne de résultat ne doit exister :
 * match annulé, résultat non confirmé, ou participant inscrit après le coup d'envoi
 * sans pronostic (ni points ni -1).
 */
export function scoreParticipantForMatch(
  input: ParticipantMatchInput,
  rules: ScoringRules,
): ParticipantMatchScore | null {
  if (input.status === "CANCELLED") return null;
  if (input.status !== "FINISHED" || !input.resultConfirmed || !input.result) return null;

  // Défense en profondeur : un pronostic enregistré après le verrouillage est ignoré.
  const prediction =
    input.prediction && input.prediction.savedAt.getTime() < lockTime(input).getTime()
      ? input.prediction
      : null;

  if (prediction === null && input.userRegisteredAt.getTime() >= input.kickoffAt.getTime()) {
    return null;
  }

  const finalScore = scoreLineForPredictions(input.result, input.isKnockout, rules);
  const score = evaluateScore(prediction ? prediction.score : null, finalScore, rules);
  const scorer = prediction
    ? evaluateScorer(
        {
          predictedPlayerId: prediction.scorerId,
          noScorerPick: prediction.noScorerPick ?? false,
          oddsSnapshot: prediction.scorerOdds,
          rennesScorerIds: input.rennesScorerIds,
          rennesPlayerScored: input.rennesPlayerScored,
        },
        rules,
      )
    : { correct: false, points: 0, oddsUsed: null, usedFallback: false, noScorerHit: false };

  return {
    category: score.category,
    scorePoints: score.points,
    scorerPoints: scorer.points,
    totalPoints: score.points + scorer.points,
    correctScorer: scorer.correct,
    oddsUsed: scorer.oddsUsed,
    usedFallback: scorer.usedFallback,
    rulesVersion: rules.version,
  };
}

// ─── Verrouillage ───────────────────────────────────────────────────────────

/** Heure de verrouillage : la date limite de l'admin si elle est plus tôt, sinon le coup d'envoi. */
export function lockTime(match: { kickoffAt: Date; deadlineAt?: Date | null }): Date {
  return match.deadlineAt && match.deadlineAt.getTime() < match.kickoffAt.getTime() ? match.deadlineAt : match.kickoffAt;
}

/** `now` vient toujours de l'horloge du serveur, jamais du navigateur. */
export function canEditPrediction(
  match: { kickoffAt: Date; status: MatchStatus; deadlineAt?: Date | null },
  now: Date,
): boolean {
  // Reporté = pas encore joué : modifiable jusqu'à la nouvelle date officielle (sauf date limite passée).
  if (match.status === "POSTPONED") return !match.deadlineAt || now.getTime() < match.deadlineAt.getTime();
  if (match.status !== "SCHEDULED") return false;
  return now.getTime() < lockTime(match).getTime();
}

/** Les pronostics des autres ne sont envoyés au navigateur qu'après le coup d'envoi. */
export function arePredictionsPublic(
  match: { kickoffAt: Date; status: MatchStatus },
  now: Date,
): boolean {
  if (match.status === "CANCELLED" || match.status === "POSTPONED") return false;
  if (match.status === "LIVE" || match.status === "INTERRUPTED" || match.status === "FINISHED") {
    return true;
  }
  return now.getTime() >= match.kickoffAt.getTime();
}
