"use server";

import { revalidatePath } from "next/cache";
import { BONUS_INFO, BONUS_KINDS, bonusChoiceError, type BonusKind } from "@/lib/scoring/bonus";
import { bonusStock } from "@/lib/bonus-data";
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
    await prisma.bonusUse.deleteMany({ where: { userId: user.id, matchId } }); // plus de pronostic : bonus rendus
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

  // « Les Spécialités Maison » : bonus joué dans la ligue affichée (vérifié AVANT d'enregistrer)
  const bonus = await checkBonus(form, { userId: user.id, match, scorerId, noScorerPick });
  if ("error" in bonus) return { error: bonus.error };

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

  for (const b of bonus.choices) {
    const key = { userId_leagueId_matchId: { userId: user.id, leagueId: b.leagueId, matchId } };
    if (b.kind) {
      await prisma.bonusUse.upsert({
        where: key,
        create: { userId: user.id, leagueId: b.leagueId, matchId, kind: b.kind, secondScorerId: b.secondScorerId },
        update: { kind: b.kind, secondScorerId: b.secondScorerId, points: null },
      });
    } else {
      await prisma.bonusUse.deleteMany({ where: { userId: user.id, leagueId: b.leagueId, matchId } });
    }
  }

  revalidatePath("/");
  return { success: "Ton pronostic a bien été enregistré.", savedAt: now.toISOString() };
}


type BonusChoice = { leagueId: string; kind: BonusKind | null; secondScorerId: string | null };

/**
 * Bonus choisis dans le formulaire, vérifiés (ligue, stock, conditions) AVANT tout enregistrement.
 *  - ordinateur : un bonus pour la ligue affichée (bonusLeagueId + bonusKind) ;
 *  - fiche mobile : un bonus par ligue cochée (bonusLeagues = ids séparés par des virgules, bonus_<id> = type ou vide).
 */
async function checkBonus(
  form: FormData,
  ctx: { userId: string; match: { id: string; seasonId: string }; scorerId: string | null; noScorerPick: boolean },
): Promise<{ error: string } | { choices: BonusChoice[] }> {
  const wanted: Array<{ leagueId: string; raw: string }> = [];
  const multi = String(form.get("bonusLeagues") ?? "");
  if (multi) {
    for (const id of multi.split(",").filter(Boolean)) wanted.push({ leagueId: id, raw: String(form.get(`bonus_${id}`) ?? "") });
  } else {
    const leagueId = String(form.get("bonusLeagueId") ?? "");
    if (leagueId) wanted.push({ leagueId, raw: String(form.get("bonusKind") ?? "") });
  }
  if (wanted.length === 0) return { choices: [] };

  const secondRaw = String(form.get("secondScorerId") ?? "");
  if (wanted.some((w) => w.raw === "GALETTES_SAUCISSES") && secondRaw) {
    const ok = await prisma.player.findFirst({ where: { id: secondRaw, seasonId: ctx.match.seasonId, isActive: true }, select: { id: true } });
    if (!ok) return { error: "Le second buteur ne fait plus partie de l’effectif." };
  }

  const choices: BonusChoice[] = [];
  for (const w of wanted) {
    const member = await prisma.leagueMember.findUnique({
      where: { leagueId_userId: { leagueId: w.leagueId, userId: ctx.userId } },
      include: { league: { select: { name: true } } },
    });
    if (!member?.isActive) continue; // ligue quittée ou désactivée : ignorée
    if (!w.raw) {
      choices.push({ leagueId: w.leagueId, kind: null, secondScorerId: null });
      continue;
    }
    if (!BONUS_KINDS.includes(w.raw as BonusKind)) return { error: "Bonus inconnu." };
    const kind = w.raw as BonusKind;
    const secondScorerId = kind === "GALETTES_SAUCISSES" && secondRaw ? secondRaw : null;
    const err = bonusChoiceError({ kind, hasScore: true, scorerId: ctx.scorerId, noScorerPick: ctx.noScorerPick, secondScorerId });
    if (err) return { error: err };
    const stock = await bonusStock(ctx.userId, w.leagueId, ctx.match.seasonId, ctx.match.id);
    if (stock[kind] <= 0) return { error: `Plus de « ${BONUS_INFO[kind].name} » dans la ligue ${member.league.name} cette saison.` };
    choices.push({ leagueId: w.leagueId, kind, secondScorerId });
  }
  return { choices };
}
