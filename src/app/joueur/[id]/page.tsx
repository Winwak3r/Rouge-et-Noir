import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/Avatar";
import { ProfileStats } from "@/components/ProfileStats";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { LeagueAvatar } from "@/components/LeagueAvatar";
import { activeLeagueScope } from "@/lib/leagues";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const u = await prisma.user.findUnique({ where: { id }, select: { pseudo: true } });
  return { title: u ? `Profil de ${u.pseudo}` : "Profil" };
}

/** Profil public d'un joueur (réservé aux joueurs connectés) : photo, pseudo, classement et statistiques. */
export default async function PlayerPage({ params }: { params: Promise<{ id: string }> }) {
  const me = await requireUser();
  const { id } = await params;
  const u = await prisma.user.findUnique({
    where: { id },
    select: { id: true, pseudo: true, createdAt: true, avatarUpdatedAt: true, isActive: true },
  });
  if (!u || !u.isActive) notFound();
  const [scope, leagues] = await Promise.all([
    activeLeagueScope(me),
    prisma.leagueMember.findMany({
      where: { userId: u.id, isActive: true },
      orderBy: { joinedAt: "asc" },
      include: { league: { select: { id: true, name: true, imageUpdatedAt: true } } },
    }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar userId={u.id} pseudo={u.pseudo} at={u.avatarUpdatedAt?.getTime() ?? null} size={56} />
          <div>
            <h1 className="page-title">{u.pseudo}</h1>
            <p className="mt-1 text-sm text-neutral-600">Joueur depuis le {formatDate(u.createdAt)}</p>
          </div>
        </div>
        {u.id === me.id ? (
          <Link href="/compte" className="btn-secondary">Mon compte</Link>
        ) : (
          <Link href="/classement" className="btn-secondary">Classement</Link>
        )}
      </div>
      {leagues.length > 0 && (
        <section aria-label="Ligues" className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">Ligues</span>
          {leagues.map((m) => (
            <span key={m.leagueId} className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-surface py-1 pl-1 pr-3 text-sm">
              <LeagueAvatar leagueId={m.league.id} name={m.league.name} at={m.league.imageUpdatedAt?.getTime() ?? null} size={24} />
              {m.league.name}
              {m.role === "ADMIN" && <span className="text-xs text-neutral-500">(admin)</span>}
            </span>
          ))}
        </section>
      )}
      <ProfileStats userId={u.id} memberIds={scope?.memberIds ?? null} since={scope?.since} competitions={scope?.competitions} />
    </div>
  );
}
