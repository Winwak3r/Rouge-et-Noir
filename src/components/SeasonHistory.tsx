import { prisma } from "@/lib/db";
import { ordinalFr } from "@/lib/match-view";
import { buildStandings } from "@/lib/scoring/ranking";

/** Bilan du joueur sur chaque saison terminée : classement final, points, scores exacts, buteurs. */
export async function SeasonHistory({ userId, memberIds }: { userId: string; memberIds: Set<string> | null }) {
  const past = await prisma.season.findMany({ where: { isCurrent: false }, orderBy: { startYear: "desc" } });
  const inScope = memberIds && memberIds.has(userId) ? { in: [...memberIds] } : undefined;
  const rows = await Promise.all(
    past.map(async (season) => {
      const [users, results] = await Promise.all([
        prisma.user.findMany({ where: { isActive: true, ...(inScope ? { id: inScope } : {}) }, select: { id: true, pseudo: true } }),
        prisma.predictionResult.findMany({
          where: { match: { seasonId: season.id }, user: { isActive: true }, ...(inScope ? { userId: inScope } : {}) },
          select: { userId: true, category: true, totalPoints: true, correctScorer: true },
        }),
      ]);
      const standings = buildStandings(users.map((u) => ({ userId: u.id, pseudo: u.pseudo })), results);
      const me = standings.find((s) => s.userId === userId);
      return { season, me, of: standings.filter((s) => s.scoredMatches > 0).length };
    }),
  );
  const played = rows.filter((r) => r.me && r.me.scoredMatches > 0);

  return (
    <section className="space-y-3">
      <h2 className="font-display text-xl font-bold uppercase tracking-wide">Saisons précédentes</h2>
      {played.length === 0 ? (
        <p className="card text-sm text-neutral-600">Aucune saison terminée pour l’instant : ton bilan apparaîtra ici à la fin de la saison.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-surface shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="px-3 py-2">Saison</th>
                <th scope="col" className="px-3 py-2">Classement</th>
                <th scope="col" className="px-3 py-2 text-right">Points</th>
                <th scope="col" className="px-3 py-2 text-right">Exacts</th>
                <th scope="col" className="hidden px-3 py-2 text-right sm:table-cell">Buteurs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {played.map(({ season, me, of }) => (
                <tr key={season.id}>
                  <td className="px-3 py-2 font-medium">{season.label}</td>
                  <td className="px-3 py-2">
                    <strong>{ordinalFr(me!.rank)}</strong> <span className="text-neutral-500">sur {of}</span>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-green-700">{me!.totalPoints}</td>
                  <td className="px-3 py-2 text-right">{me!.exactScores}</td>
                  <td className="hidden px-3 py-2 text-right sm:table-cell">{me!.scorers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
