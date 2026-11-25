import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { BonusIcon } from "@/components/BonusIcon";
import { LeagueAvatar } from "@/components/LeagueAvatar";
import { PageTitle } from "@/components/PageTitle";
import { ProfileLeagues, type ProfileLeagueRow } from "@/components/profile/ProfileLeagues";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { generalPlayers } from "@/lib/leagues";
import { GENERAL_KEY, GENERAL_NAME } from "@/lib/league-rules";
import { leagueStanding } from "@/lib/player-profile";
import { bonusQuotas, bonusStock } from "@/lib/bonus-data";
import { BONUS_INFO, BONUS_KINDS } from "@/lib/scoring/bonus";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const u = await prisma.user.findUnique({ where: { id }, select: { pseudo: true } });
  return { title: u ? `Profil de ${u.pseudo}` : "Profil" };
}

/**
 * Profil public d'un joueur (réservé aux joueurs connectés) :
 * identité · ligues (position et évolution) · statistiques · Trésors du Terroir restants par ligue.
 */
export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const u = await prisma.user.findUnique({
    where: { id },
    select: { id: true, pseudo: true, createdAt: true, avatarUpdatedAt: true, isActive: true },
  });
  if (!u || !u.isActive) notFound();

  const [memberships, general, results, season, quotas] = await Promise.all([
    prisma.leagueMember.findMany({
      where: { userId: u.id, isActive: true },
      orderBy: { joinedAt: "asc" },
      include: {
        league: {
          select: {
            id: true,
            name: true,
            imageUpdatedAt: true,
            createdAt: true,
            competitions: true,
            members: { where: { isActive: true, user: { isActive: true } }, select: { userId: true } },
          },
        },
      },
    }),
    generalPlayers(),
    prisma.predictionResult.findMany({ where: { userId: u.id }, select: { category: true, correctScorer: true } }),
    prisma.season.findFirst({ where: { isCurrent: true }, select: { id: true } }),
    bonusQuotas(),
  ]);

  // Ligues : Général R&N d'abord, puis les ligues du joueur dans l'ordre où il les a rejointes
  const leagueRows: ProfileLeagueRow[] = await Promise.all([
    ...(general.has(u.id)
      ? [
          leagueStanding(u.id, { memberIds: general, since: null, competitions: null, leagueId: null }).then((s) => ({
            key: GENERAL_KEY,
            name: GENERAL_NAME,
            general: true,
            imageAt: null,
            ...s,
          })),
        ]
      : []),
    ...memberships.map((m) =>
      leagueStanding(u.id, {
        memberIds: new Set(m.league.members.map((x) => x.userId)),
        since: m.league.createdAt,
        competitions: m.league.competitions,
        leagueId: m.league.id,
      }).then((s) => ({
        key: m.league.id,
        name: m.league.name,
        general: false,
        imageAt: m.league.imageUpdatedAt?.getTime() ?? null,
        ...s,
      })),
    ),
  ]);

  const count = (c: string) => results.filter((r) => r.category === c).length;
  const stats = [
    { label: "Score exact", value: count("EXACT") },
    { label: "Bon écart", value: count("GOAL_DIFF") },
    { label: "Bon résultat", value: count("OUTCOME") },
    { label: "Buteur", value: results.filter((r) => r.correctScorer).length },
    { label: "Prono manquant", value: count("MISSING") },
  ];

  // Trésors du Terroir restants, ligue par ligue (saison en cours)
  const stocks = season
    ? await Promise.all(memberships.map(async (m) => ({ league: m.league, stock: await bonusStock(u.id, m.league.id, season.id) })))
    : [];

  return (
    <div className="space-y-8">
      {/* 1. Identité */}
      <header className="flex items-center gap-4 sm:gap-6">
        <Avatar
          userId={u.id}
          pseudo={u.pseudo}
          at={u.avatarUpdatedAt?.getTime() ?? null}
          size={96}
          className="shadow-md"
        />
        <div className="min-w-0">
          <PageTitle className="page-title break-words uppercase">{u.pseudo}</PageTitle>
          <p className="mt-1 text-sm text-neutral-600">Joueur depuis le {formatDate(u.createdAt)}</p>
        </div>
      </header>

      {/* 2. Ligues : position et évolution */}
      <section aria-label="Les classements" className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-rouge">Les classements</h2>
        {leagueRows.length > 0 ? (
          <ProfileLeagues rows={leagueRows} />
        ) : (
          <p className="card text-sm text-neutral-600">{u.pseudo} ne fait partie d’aucune ligue pour l’instant.</p>
        )}
      </section>

      {/* 3. Statistiques */}
      <section aria-label="Les statistiques" className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide text-rouge">Les statistiques</h2>
        {/* Téléphone : Score exact sur toute la largeur, puis deux tuiles par ligne ; ordinateur : 5 tuiles sur une ligne */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          {stats.map((s, i) => (
            <div key={s.label} className={`card text-center ${i === 0 ? "col-span-2 lg:col-span-1" : ""}`}>
              <p className="text-sm font-semibold text-neutral-500">{s.label}</p>
              <p className="mt-1 font-display text-4xl font-bold tabular-nums">{s.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 4. Les Trésors du Terroir restants dans chaque ligue */}
      {stocks.length > 0 && (
        <section aria-label="Les Trésors du Terroir" className="space-y-3">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide text-rouge">Les Trésors du Terroir</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {BONUS_KINDS.map((k) => (
              <div key={k} className="card space-y-3">
                <div className="flex items-center gap-3">
                  <BonusIcon kind={k} size={48} />
                  <p className="font-display text-lg font-bold uppercase leading-tight">{BONUS_INFO[k].name}</p>
                </div>
                <ul className="space-y-1.5">
                  {stocks.map(({ league, stock }) => {
                    const left = stock[k];
                    const total = Math.max(quotas[k], left);
                    return (
                      <li key={league.id} className="grid grid-cols-[auto_minmax(0,1fr)_6.75rem] items-center gap-2 text-sm">
                        <LeagueAvatar leagueId={league.id} name={league.name} at={league.imageUpdatedAt?.getTime() ?? null} size={24} />
                        <span className="min-w-0 flex-1 truncate">{league.name}</span>
                        {/* Colonne de largeur fixe : « 1/2 restant » et « 2/2 restants » commencent au même endroit */}
                        <span className={`whitespace-nowrap text-left font-semibold tabular-nums ${left > 0 ? "" : "text-neutral-400"}`}>
                          {left}/{total} restant{left > 1 ? "s" : ""}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
