// Données de l'animation « fin de match » : dernier résultat publié, mon prono, mes spécialités, mon rang par ligue.
import { prisma } from "@/lib/db";
import { loadBoard } from "@/lib/board-data";
import { clubLogo } from "@/lib/club-logo";
import { clubLogosMode } from "@/lib/club-logo-mode";
import { playerPhotoUrl } from "@/lib/player-photo";
import { buildStandings } from "@/lib/scoring/ranking";
import type { BonusKind } from "@/lib/scoring/bonus";

export interface RecapData {
  key: string; // match + date de publication du résultat : l'animation est rejouée si le résultat est republié
  home: { name: string; logo: string | null; goals: number };
  away: { name: string; logo: string | null; goals: number };
  my: {
    score: string; // dans l'ordre domicile - extérieur
    scorer: { name: string; photo: string | null } | null;
    noScorer: boolean;
    scorePoints: number;
    scorerPoints: number;
    total: number;
  } | null;
  bonuses: Array<{ leagueId: string; leagueName: string; kind: BonusKind; points: number }>;
  leagues: Array<{ leagueId: string; name: string; rank: number | null; points: number }>;
}

export async function loadRecap(userId: string): Promise<RecapData | null> {
  const match = await prisma.match.findFirst({
    where: { status: "FINISHED", resultConfirmedAt: { not: null }, regHomeScore: { not: null }, regAwayScore: { not: null } },
    orderBy: { kickoffAt: "desc" },
    include: { homeTeam: true, awayTeam: true },
  });
  if (!match || !match.resultConfirmedAt) return null;
  const [pred, result, uses, mode, board] = await Promise.all([
    prisma.prediction.findUnique({
      where: { userId_matchId: { userId, matchId: match.id } },
      include: { scorer: { select: { name: true, photoUrl: true, externalId: true, officialPhotoUrl: true, customPhotoAt: true, id: true } } },
    }),
    prisma.predictionResult.findUnique({ where: { userId_matchId: { userId, matchId: match.id } } }),
    prisma.bonusUse.findMany({ where: { userId, matchId: match.id }, include: { league: { select: { name: true } } } }),
    clubLogosMode(),
    loadBoard(),
  ]);
  // Pas de pronostic sur ce match : pas d'animation
  if (!pred || !result) return null;

  const leagues = board.views
    .filter((v) => v.key !== "general")
    .map((v) => {
      const st = buildStandings(
        v.players.map((p) => ({ userId: p.userId, pseudo: p.pseudo })),
        v.results,
      );
      const me = st.find((r) => r.userId === userId);
      return { leagueId: v.key, name: v.name, rank: me?.rank ?? null, points: me?.totalPoints ?? 0 };
    });

  return {
    key: `${match.id}:${match.resultConfirmedAt.getTime()}`,
    // score affiché : après prolongation s'il y en a eu, sinon temps réglementaire
    home: { name: match.homeTeam.name, logo: clubLogo(match.homeTeam, mode), goals: match.aetHomeScore ?? match.regHomeScore! },
    away: { name: match.awayTeam.name, logo: clubLogo(match.awayTeam, mode), goals: match.aetAwayScore ?? match.regAwayScore! },
    my: {
      score: match.rennesIsHome ? `${pred.rennesGoals} - ${pred.opponentGoals}` : `${pred.opponentGoals} - ${pred.rennesGoals}`,
      scorer: pred.scorer ? { name: pred.scorer.name, photo: playerPhotoUrl(pred.scorer) } : null,
      noScorer: pred.noScorerPick,
      scorePoints: result.scorePoints,
      scorerPoints: result.scorerPoints,
      total: result.totalPoints,
    },
    bonuses: uses.map((u) => ({ leagueId: u.leagueId, leagueName: u.league.name, kind: u.kind, points: u.points ?? 0 })),
    leagues,
  };
}
