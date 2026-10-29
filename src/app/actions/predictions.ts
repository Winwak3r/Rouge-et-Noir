"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { canEditPrediction } from "@/lib/scoring/engine";
import { maxPredictedGoals } from "@/lib/settings";

export interface PredictionState {
  error?: string;
  success?: string;
  savedAt?: string;
}

/** Valeur du menu pour le pari « Aucun buteur rennais ». */
const NO_SCORER = "aucun";

const LOCKED = "Trop tard : le match a commencé, les pronostics sont verrouillés.";

function toGoals(v: FormDataEntryValue | null, max: number): number | null {
  if (typeof v !== "string" || !/^\d{1,2}$/.test(v)) return null;
  const n = Number(v);
  return n >= 0 && n <= max ? n : null;
}

/**
 * Enregistre ou modifie le pronostic du participant connecté.
 * L'heure qui compte est celle du serveur ; la base refuse aussi toute écriture après le coup d'envoi.
 */
export async function savePredictionAction(_: PredictionState, form: FormData): Promise<PredictionState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Connecte-toi pour pronostiquer." };

  const matchId = form.get("matchId");
  if (typeof matchId !== "string") return { error: "Match introuvable." };
  const max = maxPredictedGoals();
  const rawR = form.get("rennesGoals");
  const rawO = form.get("opponentGoals");
  // « Réinitialiser », ou « – » aux deux : on revient à un pronostic non saisi
  const removing = form.get("clearPrediction") === "1" || (rawR === "" && rawO === "");
  const rennesGoals = toGoals(rawR, max);
  const opponentGoals = toGoals(rawO, max);
  if (!removing && (rennesGoals === null || opponentGoals === null)) {
    return { error: `Choisis un nombre de buts (0 à ${max}) pour chaque équipe, ou « – » pour les deux.` };
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, kickoffAt: true, deadlineAt: true, status: true, seasonId: true, lineupAt: true },
  });
  if (!match) return { error: "Match introuvable." };
  const now = new Date();
  if (!canEditPrediction(match, now)) return { error: LOCKED };

  if (removing) {
    await prisma.prediction.deleteMany({ where: { userId: user.id, matchId } });
    revalidatePath("/");
    return { success: "Pronostic réinitialisé.", savedAt: undefined };
  }

  let scorerId: string | null = null;
  let noScorerPick = false;
  const rawScorer = form.get("scorerId");
  if (rawScorer === NO_SCORER) {
    noScorerPick = true;
  } else if (typeof rawScorer === "string" && rawScorer !== "") {
    const player = await prisma.player.findFirst({
      where: { id: rawScorer, seasonId: match.seasonId, isActive: true },
      select: { id: true },
    });
    if (!player) return { error: "Ce joueur ne fait plus partie de l’effectif. Choisis-en un autre." };
    // Seuls les joueurs avec une cote sont proposés (sauf choix déjà enregistré, conservé tel quel).
    const [hasOdds, previous] = await Promise.all([
      prisma.playerOdds.findUnique({ where: { matchId_playerId: { matchId: match.id, playerId: player.id } }, select: { id: true } }),
      prisma.prediction.findUnique({ where: { userId_matchId: { userId: user.id, matchId: match.id } }, select: { scorerId: true } }),
    ]);
    if (!hasOdds && previous?.scorerId !== player.id) return { error: "Ce joueur n’a pas de cote pour ce match : choisis-en un autre." };
    // Feuille de match publiée : seuls les joueurs convoqués peuvent être choisis.
    if (match.lineupAt) {
      const inLineup = await prisma.matchLineup.findUnique({
        where: { matchId_playerId: { matchId: match.id, playerId: player.id } },
        select: { playerId: true },
      });
      if (!inLineup) return { error: "Ce joueur ne figure pas sur la feuille de match : choisis un autre buteur." };
    }
    scorerId = player.id;
  }

  // Ici les deux scores sont forcément renseignés (cas « – / – » traité plus haut)
  if (rennesGoals === null || opponentGoals === null) return { error: "Choisis un score pour les deux équipes." };

  try {
    await prisma.prediction.upsert({
      where: { userId_matchId: { userId: user.id, matchId } },
      create: { userId: user.id, matchId, rennesGoals, opponentGoals, scorerId, noScorerPick, submittedAt: now },
      // Modifié : la cote sera de nouveau figée au verrouillage (utile si l'admin a rouvert la saisie).
      update: { rennesGoals, opponentGoals, scorerId, noScorerPick, submittedAt: now, lockedAt: null, scorerOdds: null, scorerOddsSource: null },
    });
  } catch (e) {
    if (String(e instanceof Error ? e.message : e).includes("PREDICTION_LOCKED")) return { error: LOCKED };
    throw e;
  }

  revalidatePath("/");
  return { success: "Ton pronostic a bien été enregistré.", savedAt: now.toISOString() };
}
