// Ligues : appartenance, ligue active, périmètre des classements.
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { GENERAL_KEY, GENERAL_NAME, MAX_LEAGUES, VIEW_COOKIE, canJoinAnother, generateInviteCode } from "@/lib/league-rules";

export interface LeagueScope {
  leagueId: string;
  name: string;
  imageAt: number | null;
  memberIds: Set<string>; // joueurs actifs de la ligue (comptes actifs, non suspendus)
  isAdmin: boolean;
  /** Création de la ligue : seuls les matchs joués ensuite comptent dans son classement (tout le monde part de 0). */
  since: Date | null;
  /** Vue « Général R&N » (tous les joueurs des ligues) plutôt qu'une vraie ligue. */
  general: boolean;
  /** Compétitions jouées dans la ligue (null : toutes). */
  competitions: string[] | null;
}

/**
 * Filtre Prisma des résultats comptant dans la vue : matchs joués après la création de la ligue,
 * dans les compétitions qu'elle a choisies (aucun filtre pour « Général R&N »).
 */
export function scopeResultFilter(scope: { since: Date | null; competitions: string[] | null } | null | undefined) {
  if (!scope || (!scope.since && !scope.competitions)) return {};
  return {
    match: {
      ...(scope.since ? { kickoffAt: { gte: scope.since } } : {}),
      ...(scope.competitions ? { competition: { in: scope.competitions as ("LIGUE_1" | "EUROPA_LEAGUE" | "COUPE_DE_FRANCE")[] } } : {}),
    },
  };
}

/** Filtre Prisma des résultats comptant dans une ligue (matchs dont le coup d'envoi suit sa création). */
export const sinceFilter = (since: Date | null | undefined) => (since ? { match: { kickoffAt: { gte: since } } } : {});

/** Joueurs du classement « Général » : inscrits dans au moins une ligue ET ayant pronostiqué au moins un match. */
export async function generalPlayers(): Promise<Set<string>> {
  const rows = await prisma.user.findMany({
    where: { isActive: true, leagues: { some: { isActive: true } }, predictions: { some: {} } },
    select: { id: true },
  });
  return new Set(rows.map((r) => r.id));
}

/** Ligues du joueur (y compris celles où il est suspendu, pour l'informer). */
export async function myLeagues(userId: string) {
  return prisma.leagueMember.findMany({
    where: { userId },
    orderBy: { joinedAt: "asc" },
    include: { league: { include: { _count: { select: { members: { where: { isActive: true } } } } } } },
  });
}

/**
 * Ligue affichée : celle choisie pendant la session (cookie), sinon la ligue « par défaut » du compte
 * (activeLeagueId), sinon la première rejointe. Avec ses membres actifs.
 */
export async function activeLeagueScope(user: { id: string; activeLeagueId: string | null }): Promise<LeagueScope | null> {
  const memberships = await prisma.leagueMember.findMany({ where: { userId: user.id, isActive: true }, orderBy: { joinedAt: "asc" } });
  if (memberships.length === 0) return null;
  const viewed = (await cookies()).get(VIEW_COOKIE)?.value;
  if (viewed === GENERAL_KEY) {
    return {
      leagueId: GENERAL_KEY,
      name: GENERAL_NAME,
      imageAt: null,
      memberIds: await generalPlayers(),
      isAdmin: false,
      since: null,
      general: true,
      competitions: null,
    };
  }
  const current =
    memberships.find((m) => m.leagueId === viewed) ??
    memberships.find((m) => m.leagueId === user.activeLeagueId) ??
    memberships[0];
  const league = await prisma.league.findUniqueOrThrow({
    where: { id: current.leagueId },
    include: { members: { where: { isActive: true, user: { isActive: true } }, select: { userId: true } } },
  });
  return {
    leagueId: league.id,
    name: league.name,
    imageAt: league.imageUpdatedAt?.getTime() ?? null,
    memberIds: new Set(league.members.map((m) => m.userId)),
    isAdmin: current.role === "ADMIN",
    since: league.createdAt,
    general: false,
    competitions: league.competitions,
  };
}

/** Crée une ligue : le créateur en devient administrateur, elle devient sa ligue active. */
export async function createLeague(
  userId: string,
  name: string,
  extra: { description?: string | null; competitions?: ("LIGUE_1" | "EUROPA_LEAGUE" | "COUPE_DE_FRANCE")[] } = {},
) {
  if (!canJoinAnother(await prisma.leagueMember.count({ where: { userId } }))) {
    throw new Error(`Tu participes déjà à ${MAX_LEAGUES} ligues (le maximum).`);
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const league = await prisma.league.create({
        data: {
          name,
          description: extra.description ?? null,
          ...(extra.competitions ? { competitions: extra.competitions } : {}),
          inviteCode: generateInviteCode(),
          createdById: userId,
          members: { create: { userId, role: "ADMIN" } },
        },
      });
      await prisma.user.updateMany({ where: { id: userId, activeLeagueId: null }, data: { activeLeagueId: league.id } });
      return league;
    } catch (e) {
      if (attempt === 4) throw e; // code déjà pris (très improbable) : on retente
    }
  }
  throw new Error("Création impossible.");
}

/** Rejoint une ligue par son code. Renvoie la ligue, ou un message d'erreur. */
export async function joinLeague(userId: string, code: string): Promise<{ ok: true; name: string; leagueId: string } | { ok: false; error: string }> {
  const league = await prisma.league.findUnique({ where: { inviteCode: code } });
  if (!league) return { ok: false, error: "Code de ligue inconnu. Vérifie-le auprès de l’administrateur de la ligue." };
  const existing = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId: league.id, userId } } });
  if (existing && !existing.isActive) return { ok: false, error: "Ton accès à cette ligue a été suspendu par son administrateur." };
  if (!existing) {
    if (!canJoinAnother(await prisma.leagueMember.count({ where: { userId } }))) {
      return { ok: false, error: `Tu participes déjà à ${MAX_LEAGUES} ligues : quittes-en une pour rejoindre celle-ci.` };
    }
    await prisma.leagueMember.create({ data: { leagueId: league.id, userId } });
  }
  await prisma.user.updateMany({ where: { id: userId, activeLeagueId: null }, data: { activeLeagueId: league.id } });
  return { ok: true, name: league.name, leagueId: league.id };
}

/** Le joueur est-il administrateur de cette ligue ? */
export async function isLeagueAdmin(userId: string, leagueId: string): Promise<boolean> {
  const m = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId, userId } } });
  return Boolean(m && m.isActive && m.role === "ADMIN");
}
