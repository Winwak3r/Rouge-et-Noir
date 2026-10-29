import { ParticipantsList } from "@/components/ParticipantsList";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/auth/session";
import { formatDate, formatShortNumeric } from "@/lib/dates";

export default async function ParticipantsPage() {
  const admin = await requireAdmin();
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      pseudo: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      avatarUpdatedAt: true,
      emailVerifiedAt: true,
      _count: { select: { predictions: true, pushSubs: true } },
    },
  });
  return (
    <div className="space-y-4">
      <h1 className="page-title">Participants</h1>
      <ParticipantsList
        adminId={admin.id}
        users={users.map((u) => ({
          id: u.id,
          pseudo: u.pseudo,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          verified: Boolean(u.emailVerifiedAt),
          createdLabel: formatDate(u.createdAt),
          createdShort: formatShortNumeric(u.createdAt),
          avatarAt: u.avatarUpdatedAt?.getTime() ?? null,
          predictions: u._count.predictions,
          pushSubs: u._count.pushSubs,
        }))}
      />
    </div>
  );
}
