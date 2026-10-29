import { LeaguesAdminList } from "@/components/LeaguesAdminList";
import { prisma } from "@/lib/db";
import { formatDate, formatShortNumeric } from "@/lib/dates";

/** Toutes les ligues du site : nom, image, joueurs, créateur et administrateurs, liste des participants. */
export default async function AdminLeaguesPage() {
  const [leagues, withoutLeague] = await Promise.all([
    prisma.league.findMany({
      orderBy: { createdAt: "asc" },
      include: {
        createdBy: { select: { pseudo: true, email: true } },
        members: {
          include: { user: { select: { id: true, pseudo: true, email: true, isActive: true } } },
          orderBy: [{ role: "asc" }, { joinedAt: "asc" }],
        },
      },
    }),
    prisma.user.count({ where: { isActive: true, leagues: { none: { isActive: true } } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Ligues ({leagues.length})</h1>
        <p className="mt-1 text-sm text-neutral-600">{withoutLeague} joueur(s) actif(s) ne sont dans aucune ligue.</p>
      </div>
      <LeaguesAdminList
        leagues={leagues.map((l) => ({
          id: l.id,
          name: l.name,
          code: l.inviteCode,
          imageAt: l.imageUpdatedAt?.getTime() ?? null,
          createdLabel: formatDate(l.createdAt),
          createdShort: formatShortNumeric(l.createdAt),
          activeCount: l.members.filter((m) => m.isActive).length,
          creator: l.createdBy ? { pseudo: l.createdBy.pseudo, email: l.createdBy.email } : null,
          admins: l.members.filter((m) => m.role === "ADMIN").map((m) => ({ id: m.user.id, pseudo: m.user.pseudo, email: m.user.email })),
          members: l.members.map((m) => ({
            id: m.user.id,
            pseudo: m.user.pseudo,
            email: m.user.email,
            role: m.role,
            active: m.isActive,
            accountActive: m.user.isActive,
            joinedLabel: formatDate(m.joinedAt),
            joinedShort: formatShortNumeric(m.joinedAt),
          })),
        }))}
      />
    </div>
  );
}
