import { prisma } from "@/lib/db";
import { ordinalFr } from "@/lib/match-view";
import { rankHistory } from "@/lib/rank-history";
import { buildStandings } from "@/lib/scoring/ranking";
import { scopeResultFilter } from "@/lib/leagues";
import { RankSparkline } from "./RankSparkline";

/** Bloc « Classement » (position, points, évolution sur 5 matchs) et statistiques d'un joueur. */
export async function ProfileStats(props: {
  userId: string;
  /** Joueurs de la ligue dans laquelle situer le classement (sinon tous les joueurs). */
  memberIds?: Set<string> | null;
  /** Création de la ligue : seuls les matchs suivants comptent. */
  since?: Date | null;
  /** Compétitions de la ligue : seuls leurs matchs comptent. */
  competitions?: string[] | null;
  showMissing?: boolean;
}) {
  const { userId } = props;
  const inScope = props.memberIds && props.memberIds.has(userId) ? { in: [...props.memberIds] } : undefined;
  const [participants, allResults, scoredMatches] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true, ...(inScope ? { id: inScope } : {}) }, select: { id: true, pseudo: true } }),
    prisma.predictionResult.findMany({
      where: {
        user: { isActive: true },
        ...(inScope ? { userId: inScope } : {}),
        ...(inScope ? scopeResultFilter({ since: props.since ?? null, competitions: props.competitions ?? null }) : {}),
      },
      select: { userId: true, matchId: true, category: true, totalPoints: true, correctScorer: true },
    }),
    prisma.match.findMany({
      where: {
        resultConfirmedAt: { not: null },
        results: { some: {} },
        ...(inScope && props.since ? { kickoffAt: { gte: props.since } } : {}),
        ...(inScope && props.competitions ? { competition: { in: props.competitions as ("LIGUE_1" | "EUROPA_LEAGUE" | "COUPE_DE_FRANCE")[] } } : {}),
      },
      orderBy: { kickoffAt: "asc" },
      select: { id: true, competition: true, matchday: true },
    }),
  ]);
  const people = participants.map((p) => ({ userId: p.id, pseudo: p.pseudo }));
  const me = buildStandings(people, allResults).find((x) => x.userId === userId);
  const history = rankHistory(
    userId,
    people,
    allResults,
    scoredMatches.map((m) => ({
      id: m.id,
      label: m.competition === "LIGUE_1" ? `J${m.matchday ?? "?"}` : m.competition === "EUROPA_LEAGUE" ? "UEL" : "CdF",
    })),
  );
  const results = allResults.filter((r) => r.userId === userId);
  const count = (c: string) => results.filter((r) => r.category === c).length;
  const stats = [
    { label: "Scores exacts", value: count("EXACT") },
    { label: "Bons écarts", value: count("GOAL_DIFF") },
    { label: "Bons résultats", value: count("OUTCOME") },
    { label: "Buteurs trouvés", value: results.filter((r) => r.correctScorer).length },
    ...(props.showMissing === false ? [] : [{ label: "Pronostics manquants", value: count("MISSING") }]),
  ];

  return (
    <>
      <section aria-label="Classement" className="card flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm text-neutral-500">Classement</p>
          <p className="mt-1 font-display text-3xl font-bold">
            {me && me.scoredMatches > 0 ? ordinalFr(me.rank) : "—"}
            <span className="ml-2 text-base font-semibold text-neutral-500">sur {participants.length}</span>
          </p>
          <p className="text-sm font-semibold text-green-700">{me?.totalPoints ?? 0} pts</p>
        </div>
        <div className="text-neutral-800">
          <p className="mb-1 text-right text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500">Position · 5 derniers matchs</p>
          <RankSparkline points={history} />
        </div>
      </section>

      <section aria-label="Statistiques" className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {stats.map((s) => (
          <div key={s.label} className="card">
            <p className="text-sm text-neutral-500">{s.label}</p>
            <p className="mt-1 font-display text-3xl font-bold">{s.value}</p>
          </div>
        ))}
      </section>
    </>
  );
}
