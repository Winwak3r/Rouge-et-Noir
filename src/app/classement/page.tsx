import type { Metadata } from "next";
import Link from "next/link";
import { StandingsBoard, type BoardView } from "@/components/StandingsBoard";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { activeLeagueScope, generalPlayers } from "@/lib/leagues";
import { getLeagueLogos } from "@/lib/league-logos";

export const metadata: Metadata = { title: "Classement des pronostics" };
export const dynamic = "force-dynamic";

/**
 * Classements de toutes les ligues du joueur + « Général », calculés en une fois :
 * on passe de l'un à l'autre instantanément, sans recharger la page.
 */
export default async function StandingsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const me = await getCurrentUser();
  const { vue } = await searchParams;
  const [scope, memberships, generalIds] = await Promise.all([
    me ? activeLeagueScope(me) : null,
    me
      ? prisma.leagueMember.findMany({
          where: { userId: me.id, isActive: true },
          orderBy: { joinedAt: "asc" },
          include: {
            league: {
              include: { members: { where: { isActive: true, user: { isActive: true } }, select: { userId: true } } },
            },
          },
        })
      : [],
    generalPlayers(),
  ]);

  // Toutes les données nécessaires en deux requêtes
  const everyone = new Set<string>([...generalIds, ...memberships.flatMap((m) => m.league.members.map((x) => x.userId))]);
  const [users, results] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true, id: { in: [...everyone] } }, select: { id: true, pseudo: true, avatarUpdatedAt: true } }),
    prisma.predictionResult.findMany({
      where: { user: { isActive: true }, userId: { in: [...everyone] } },
      select: { userId: true, category: true, totalPoints: true, correctScorer: true, match: { select: { kickoffAt: true, competition: true } } },
    }),
  ]);
  const avatarOf = new Map(users.map((u) => [u.id, u.avatarUpdatedAt?.getTime() ?? null]));

  type Code = "LIGUE_1" | "EUROPA_LEAGUE" | "COUPE_DE_FRANCE";
  const ALL: Code[] = ["LIGUE_1", "EUROPA_LEAGUE", "COUPE_DE_FRANCE"];
  // Données de chaque vue : joueurs + résultats bruts ; le classement est calculé dans le navigateur
  // (ce qui permet de le recalculer instantanément selon les compétitions cochées).
  const viewData = (ids: Set<string>, since: Date | null, competitions: Code[]) => ({
    competitions,
    players: users.filter((u) => ids.has(u.id)).map((u) => ({ userId: u.id, pseudo: u.pseudo, avatarAt: avatarOf.get(u.id) ?? null })),
    results: results
      .filter((r) => ids.has(r.userId) && (!since || r.match.kickoffAt >= since) && competitions.includes(r.match.competition))
      .map((r) => ({ userId: r.userId, category: r.category, totalPoints: r.totalPoints, correctScorer: r.correctScorer, competition: r.match.competition })),
  });

  const views: BoardView[] = [
    ...memberships.map((m) => ({
      key: m.leagueId,
      name: m.league.name,
      imageAt: m.league.imageUpdatedAt?.getTime() ?? null,
      note: "Classement de la ligue depuis sa création : tous ses joueurs sont partis de 0 point.",
      ...viewData(new Set(m.league.members.map((x) => x.userId)), m.league.createdAt, m.league.competitions),
    })),
    {
      key: "general",
      name: "Général R&N",
      imageAt: null,
      note: "Tous les joueurs inscrits dans une ligue et ayant pronostiqué au moins un match, sur toute la saison.",
      ...viewData(generalIds, null, ALL),
    },
  ];
  const initial = vue === "general" || !scope ? "general" : scope.leagueId;
  const logos = await getLeagueLogos();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Classements</h1>
        {!scope && me && (
          <p className="mt-2 text-sm text-neutral-600">
            Tu n’es dans aucune ligue : voici le classement Général R&N.{" "}
            <Link href="/ligues" className="font-semibold text-rouge hover:underline">
              Rejoindre ou créer une ligue
            </Link>
          </p>
        )}
        <p className="mt-1 text-sm text-neutral-600">Départage : scores exacts, puis buteurs trouvés, puis bons écarts. Égalité persistante = ex æquo.</p>
      </div>
      <StandingsBoard views={views} initial={initial} me={me?.id ?? null} logos={logos} />
    </div>
  );
}
