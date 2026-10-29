import type { CompetitionCode } from "@/lib/competitions";
import { prisma } from "@/lib/db";

export type LeagueLogos = Partial<Record<CompetitionCode, string>>;

/**
 * Logos des compétitions : celui déposé par l'administrateur s'il existe (logo officiel à jour),
 * sinon celui récupéré chez ESPN lors de la synchro.
 */
export async function getLeagueLogos(): Promise<LeagueLogos> {
  const [row, custom] = await Promise.all([
    prisma.appSetting.findUnique({ where: { key: "league_logos" } }),
    prisma.competitionLogo.findMany({ select: { code: true, updatedAt: true } }),
  ]);
  const logos: LeagueLogos = { ...((row?.value as unknown as LeagueLogos) ?? {}) };
  for (const c of custom) logos[c.code as CompetitionCode] = `/api/competition-logo/${c.code}?v=${c.updatedAt.getTime()}`;
  return logos;
}
