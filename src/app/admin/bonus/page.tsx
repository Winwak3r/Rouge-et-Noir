import { grantBonusAction, refundBonusAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { BonusIcon } from "@/components/BonusIcon";
import { prisma } from "@/lib/db";
import { formatShortNumeric } from "@/lib/dates";
import { BONUS_INFO, BONUS_KINDS } from "@/lib/scoring/bonus";
import { PageTitle } from "@/components/PageTitle";

/** « Les Spécialités Maison » : bonus joués (et rendus), ajouts aux joueurs. */
export default async function AdminBonusPage() {
  const [uses, members] = await Promise.all([
    prisma.bonusUse.findMany({
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { pseudo: true } },
        league: { select: { name: true } },
        match: { select: { kickoffAt: true, homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } } },
      },
    }),
    prisma.leagueMember.findMany({
      where: { isActive: true },
      include: { user: { select: { id: true, pseudo: true } }, league: { select: { id: true, name: true } } },
      orderBy: [{ league: { name: "asc" } }],
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageTitle className="page-title">Les Spécialités Maison</PageTitle>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Ajouter ou retirer un bonus</h2>
        <p className="text-sm text-neutral-600">En cas d’erreur ou de geste commercial : le stock du joueur dans la ligue choisie est ajusté d’une unité.</p>
        <ActionForm
          action={grantBonusAction}
          className="flex flex-wrap items-end gap-3"
          submits={[
            { label: "Ajouter 1", value: "add" },
            { label: "Retirer 1", value: "remove", primary: false },
          ]}
        >
          <label className="text-sm">
            <span className="label">Joueur et ligue</span>
            <select name="member" className="input" required>
              {members.map((m) => (
                <option key={`${m.userId}:${m.leagueId}`} value={`${m.userId}:${m.leagueId}`}>
                  {m.user.pseudo} — {m.league.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="label">Bonus</span>
            <select name="kind" className="input">
              {BONUS_KINDS.map((k) => (
                <option key={k} value={k}>
                  {BONUS_INFO[k].name}
                </option>
              ))}
            </select>
          </label>
        </ActionForm>
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Bonus joués ({uses.length})</h2>
        {uses.length === 0 ? (
          <p className="card text-sm text-neutral-600">Aucun bonus joué pour l’instant.</p>
        ) : (
          <ul className="card divide-y divide-neutral-100 p-0">
            {uses.map((u) => (
              <li key={u.id} className="flex flex-wrap items-center gap-3 px-4 py-2 text-sm">
                <BonusIcon kind={u.kind} size={28} />
                <span className="min-w-0 flex-1">
                  <strong>{u.user.pseudo}</strong> · {BONUS_INFO[u.kind].name}
                  <span className="block text-xs text-neutral-500">
                    {u.league.name} · {u.match.homeTeam.name} – {u.match.awayTeam.name} ({formatShortNumeric(u.match.kickoffAt)})
                    {u.points != null && <span className="font-semibold text-green-700"> · +{u.points} pt{u.points > 1 ? "s" : ""}</span>}
                  </span>
                </span>
                <ActionForm
                  action={refundBonusAction}
                  className="[&_.btn-secondary]:px-2.5 [&_.btn-secondary]:py-1 [&_.btn-secondary]:text-xs"
                  submits={[{ label: "Rendre", primary: false, confirm: `Rendre ce bonus à ${u.user.pseudo} ? Il sera retiré du match.` }]}
                >
                  <input type="hidden" name="bonusId" value={u.id} />
                </ActionForm>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
