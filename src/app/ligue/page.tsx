import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { Avatar } from "@/components/Avatar";
import { InviteBox, LeagueImageEditor, MemberActions, RenameLeagueForm } from "@/components/LeagueAdminForms";
import { DeleteLeagueForm } from "@/components/LeagueForms";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { formatDate } from "@/lib/dates";
import { appUrl } from "@/lib/email";
import { getLeagueLogos } from "@/lib/league-logos";

export const metadata: Metadata = { title: "Gérer ma ligue" };
export const dynamic = "force-dynamic";

/** Gestion d'une ligue, réservée à ses administrateurs. */
export default async function ManageLeaguePage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const user = await requireUser();
  const { id } = await searchParams;
  const adminOf = await prisma.leagueMember.findMany({
    where: { userId: user.id, role: "ADMIN", isActive: true },
    include: { league: true },
    orderBy: { joinedAt: "asc" },
  });
  if (adminOf.length === 0) redirect("/ligues");
  const league = (adminOf.find((m) => m.leagueId === id) ?? adminOf[0]).league;
  const members = await prisma.leagueMember.findMany({
    where: { leagueId: league.id },
    include: { user: { select: { id: true, pseudo: true, avatarUpdatedAt: true, isActive: true } } },
    orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
  });
  const url = appUrl(`/rejoindre/${league.inviteCode}`);
  const logos = await getLeagueLogos();
  const [qrSvg, qrPng] = await Promise.all([
    QRCode.toString(url, { type: "svg", margin: 1, errorCorrectionLevel: "M" }),
    QRCode.toDataURL(url, { width: 600, margin: 2, errorCorrectionLevel: "M" }),
  ]);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Gérer ma ligue</h1>
        {adminOf.length > 1 && (
          <nav className="flex flex-wrap gap-2" aria-label="Choix de la ligue">
            {adminOf.map((m) => (
              <Link key={m.leagueId} href={`/ligue?id=${m.leagueId}`} className={m.leagueId === league.id ? "btn-primary px-3 py-1.5" : "btn-secondary px-3 py-1.5"}>
                {m.league.name}
              </Link>
            ))}
          </nav>
        )}
      </div>

      <section className="card space-y-4">
        {/* key : chaque ligue a son propre formulaire (sinon les valeurs de la ligue précédente restaient affichées) */}
        <RenameLeagueForm
          key={league.id}
          leagueId={league.id}
          name={league.name}
          description={league.description}
          competitions={league.competitions}
          logos={logos}
        />
        <div>
          <p className="label">Image de la ligue</p>
          <LeagueImageEditor key={league.id} leagueId={league.id} at={league.imageUpdatedAt?.getTime() ?? null} />
        </div>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Inviter des joueurs</h2>
        <p className="text-sm text-neutral-600">Partage le lien ou fais scanner le QR code : le joueur s’inscrit (ou se connecte) et rejoint la ligue directement.</p>
        <InviteBox key={league.id} leagueId={league.id} url={url} code={league.inviteCode} qrSvg={qrSvg} qrPng={qrPng} />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Joueurs ({members.filter((m) => m.isActive).length})</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-surface shadow-sm">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="px-3 py-2">Joueur</th>
                <th scope="col" className="px-3 py-2">Arrivée</th>
                <th scope="col" className="px-3 py-2">Rôle</th>
                <th scope="col" className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {members.map((m) => (
                <tr key={m.userId} className={m.isActive ? undefined : "text-neutral-400"}>
                  <td className="px-3 py-2">
                    <span className="flex items-center gap-2 font-medium">
                      <Avatar userId={m.user.id} pseudo={m.user.pseudo} at={m.user.avatarUpdatedAt?.getTime() ?? null} size={24} />
                      {m.user.pseudo}
                      {!m.isActive && <span className="text-xs">(désactivé)</span>}
                    </span>
                  </td>
                  <td className="px-3 py-2">{formatDate(m.joinedAt)}</td>
                  <td className="px-3 py-2">
                    {m.role === "ADMIN" ? <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-800">Admin</span> : "Joueur"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <MemberActions leagueId={league.id} userId={m.userId} pseudo={m.user.pseudo} isAdmin={m.role === "ADMIN"} isActive={m.isActive} isMe={m.userId === user.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-neutral-500">
          « Désactiver » retire le joueur du classement de la ligue sans l’en faire sortir ; « Supprimer » le retire de la ligue. Son compte
          sur le site n’est pas supprimé.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Zone de danger</h2>
        <DeleteLeagueForm key={league.id} leagueId={league.id} name={league.name} members={members.length} />
      </section>
    </div>
  );
}
