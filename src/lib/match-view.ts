// Présentation d'un match (inspirée de F1 Pronos) : statut des pronostics et lignes « Pronostics et points ».
// Fonctions pures, testées. La confidentialité est appliquée ICI, côté serveur.
import { evaluateScore, evaluateScorer, type MatchStatus } from "@/lib/scoring/engine";
import type { ScoreLine, ScoringRules } from "@/lib/scoring/rules";
import { shortPlayerName } from "@/lib/player-name";

export type MatchPhase = "OPEN" | "CLOSED" | "AWAITING" | "FINAL" | "POSTPONED" | "INTERRUPTED" | "CANCELLED";
export type Tone = "green" | "red" | "grey" | "orange";

export const PHASE: Record<MatchPhase, { label: string; tone: Tone; short?: string }> = {
  OPEN: { label: "Pronostics ouverts", tone: "green", short: "Pronos ouverts" },
  CLOSED: { label: "Pronostics clôturés", tone: "red", short: "Pronos clôturés" },
  AWAITING: { label: "Résultat en attente", tone: "red" },
  FINAL: { label: "Résultat définitif", tone: "grey" },
  POSTPONED: { label: "Reporté · pronostics ouverts", tone: "orange" },
  INTERRUPTED: { label: "Match interrompu", tone: "orange" },
  CANCELLED: { label: "Annulé", tone: "red" },
};

export function matchPhase(
  m: { status: MatchStatus; kickoffAt: Date; resultConfirmedAt: Date | null },
  now: Date,
): MatchPhase {
  switch (m.status) {
    case "CANCELLED":
      return "CANCELLED";
    case "POSTPONED":
      return "POSTPONED";
    case "INTERRUPTED":
      return "INTERRUPTED";
    case "FINISHED":
      return m.resultConfirmedAt ? "FINAL" : "AWAITING";
    case "LIVE":
      return "CLOSED";
    default:
      return m.kickoffAt.getTime() > now.getTime() ? "OPEN" : "CLOSED";
  }
}

export function ordinalFr(n: number): string {
  return n === 1 ? "1er" : `${n}e`;
}

// ─── « Pronostics et points » ───────────────────────────────────────────────

// Vert : exact · vert clair : bon écart · jaune : bon vainqueur · rouge : faux · neutre : pas encore joué
export type ChipTone = "exact" | "diff" | "outcome" | "wrong" | "neutral";
export type RowStatus = "ok" | "todo" | "missing";

export interface CompRow {
  userId: string;
  pseudo: string;
  avatarAt: number | null;
  mine: boolean;
  status: RowStatus; // score — OK : saisi · AC : à compléter (avant le match) · — : rien saisi (match commencé)
  scorerStatus: RowStatus; // buteur — mêmes codes
  visible: boolean; // le détail du pronostic peut-il être montré ?
  score: { label: string; tone: ChipTone } | null;
  scorer: { label: string; shortLabel: string; tone: ChipTone; noScorer: boolean } | null;
  scorePoints: number | null;
  scorerPoints: number | null;
  total: number | null;
  provisional: boolean; // points calculés en direct, pas encore définitifs
}

export interface RowInput {
  users: Array<{ id: string; pseudo: string; createdAt: Date; avatarUpdatedAt?: Date | null }>; // dans l'ordre du classement
  me: string;
  rennesIsHome: boolean;
  kickoffAt: Date;
  isPublic: boolean; // coup d'envoi passé : tous les pronostics sont visibles
  preds: Array<{
    userId: string;
    rennesGoals: number;
    opponentGoals: number;
    scorerName: string | null;
    noScorerPick: boolean;
    scorerBonus?: number | null; // points gagnables avec ce choix de buteur
    scorerId?: string | null;
    /** Avant le coup d'envoi, pour les autres joueurs : seulement « a-t-il fait un pari buteur ? » (jamais lequel). */
    hasScorerBet?: boolean;
  }>;
  results: Array<{ userId: string; category: string; scorePoints: number; scorerPoints: number; totalPoints: number }>;
  /** Match en cours (ou résultat pas encore confirmé) : points calculés sur le score actuel. */
  live?: {
    score: ScoreLine; // du point de vue de Rennes
    rennesScorerIds: string[];
    rennesPlayerScored: boolean;
    rules: ScoringRules;
  } | null;
}

const SCORE_TONE: Record<string, ChipTone> = {
  EXACT: "exact",
  GOAL_DIFF: "diff",
  OUTCOME: "outcome",
  WRONG: "wrong",
};

export function buildMatchRows(input: RowInput): CompRow[] {
  const rows: CompRow[] = [];
  for (const u of input.users) {
    const p = input.preds.find((x) => x.userId === u.id);
    const r = input.results.find((x) => x.userId === u.id);
    const mine = u.id === input.me;

    let status: RowStatus;
    if (p) status = "ok";
    else if (!input.isPublic) status = "todo";
    else if (r || u.createdAt.getTime() < input.kickoffAt.getTime()) status = "missing";
    else continue; // inscrit après le coup d'envoi, sans pronostic : pas concerné

    // Avant le coup d'envoi, rien du pronostic des autres ne sort du serveur.
    const visible = mine || input.isPublic;
    const label = (rg: number, og: number) => (input.rennesIsHome ? `${rg} - ${og}` : `${og} - ${rg}`);

    // Points : définitifs si le résultat est confirmé, sinon calculés en direct sur le score actuel.
    let points: { category: string; scorePoints: number; scorerPoints: number; total: number } | null = null;
    let provisional = false;
    if (r) {
      points = { category: r.category, scorePoints: r.scorePoints, scorerPoints: r.scorerPoints, total: r.totalPoints };
    } else if (input.live && input.isPublic) {
      const sc = evaluateScore(p ? { rennes: p.rennesGoals, opponent: p.opponentGoals } : null, input.live.score, input.live.rules);
      const bonus = p
        ? evaluateScorer(
            {
              predictedPlayerId: p.scorerId ?? null,
              noScorerPick: p.noScorerPick,
              oddsSnapshot: null,
              rennesScorerIds: input.live.rennesScorerIds,
              rennesPlayerScored: input.live.rennesPlayerScored,
            },
            input.live.rules,
          )
        : null;
      // Points du buteur en direct : ceux affichés avec le choix (cote figée), sinon le calcul par défaut.
      const scorerPoints = bonus && (bonus.correct || bonus.noScorerHit) ? (p?.scorerBonus ?? bonus.points) : 0;
      points = { category: sc.category, scorePoints: sc.points, scorerPoints, total: sc.points + scorerPoints };
      provisional = true;
    }

    const score =
      visible && p ? { label: label(p.rennesGoals, p.opponentGoals), tone: points ? (SCORE_TONE[points.category] ?? "wrong") : "neutral" } : null;
    const scorerName = p ? (p.scorerName ?? (p.noScorerPick ? "Aucun buteur" : null)) : null;
    const pts = p?.scorerBonus != null ? ` · +${p.scorerBonus} pt${p.scorerBonus > 1 ? "s" : ""}` : "";
    const scorerLabel = scorerName ? `${scorerName}${pts}` : null;
    // Sur mobile : initiale du prénom (« M. Al-Tamari »)
    const shortLabel = scorerName ? `${p?.scorerName ? shortPlayerName(scorerName) : scorerName}${pts}` : null;
    const scorer =
      visible && scorerLabel && shortLabel
        ? {
            label: scorerLabel,
            shortLabel,
            noScorer: Boolean(p?.noScorerPick && !p?.scorerName),
            tone: (points ? (points.scorerPoints > 0 ? "exact" : "wrong") : "neutral") as ChipTone,
          }
        : null;

    const hasScorerBet = p ? (p.hasScorerBet ?? Boolean(p.scorerName || p.noScorerPick)) : false;
    const scorerStatus: RowStatus = hasScorerBet ? "ok" : !input.isPublic ? "todo" : "missing";

    rows.push({
      userId: u.id,
      scorerStatus,
      pseudo: u.pseudo,
      avatarAt: u.avatarUpdatedAt?.getTime() ?? null,
      mine,
      status,
      visible,
      score,
      scorer,
      scorePoints: points ? points.scorePoints : null,
      scorerPoints: points && scorerLabel ? points.scorerPoints : null,
      total: points ? points.total : null,
      provisional,
    });
  }
  return rows;
}
