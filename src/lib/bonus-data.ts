// Données des bonus côté serveur : stock restant, bonus d'un match, points ajoutés à une ligue.
import { prisma } from "@/lib/db";
import { DEFAULT_BONUS_QUOTAS, remainingBonuses, type BonusQuotas } from "@/lib/scoring/bonus";
import { getActiveRules } from "@/lib/scoring/active-rules";

export async function bonusQuotas(): Promise<BonusQuotas> {
  return (await getActiveRules()).bonusQuotas ?? DEFAULT_BONUS_QUOTAS;
}

/** Stock restant d'un joueur dans une ligue, pour la saison en cours (sans compter `exceptMatchId`). */
export async function bonusStock(userId: string, leagueId: string, seasonId: string, exceptMatchId?: string) {
  const [quotas, used, granted] = await Promise.all([
    bonusQuotas(),
    prisma.bonusUse.findMany({
      where: { userId, leagueId, match: { seasonId }, ...(exceptMatchId ? { matchId: { not: exceptMatchId } } : {}) },
      select: { kind: true },
    }),
    prisma.bonusGrant.findMany({ where: { userId, leagueId }, select: { kind: true, delta: true } }),
  ]);
  return remainingBonuses(quotas, used, granted);
}

/** Points ajoutés par les bonus d'une ligue (pour ses classements). */
export async function leagueBonusPoints(leagueId: string) {
  return prisma.bonusUse.findMany({ where: { leagueId, points: { not: null } }, select: { userId: true, matchId: true, points: true } });
}
