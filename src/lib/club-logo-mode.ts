import { prisma } from "@/lib/db";
import { CLUB_LOGOS_SETTING, type ClubLogoMode } from "@/lib/club-logo";

/** Mode d'affichage des écussons, réglé dans Administration › Logos (officiels par défaut). */
export async function clubLogosMode(): Promise<ClubLogoMode> {
  const row = await prisma.appSetting.findUnique({ where: { key: CLUB_LOGOS_SETTING } });
  return row?.value === "generic" ? "generic" : "official";
}
