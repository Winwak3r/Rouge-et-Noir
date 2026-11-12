import Link from "next/link";
import { cookies } from "next/headers";
import { after } from "next/server";
import { AccordionGroup } from "@/components/AccordionGroup";
import { AnnouncementWindow } from "@/components/AnnouncementWindow";
import { LiveRefresh } from "@/components/LiveRefresh";
import { CompetitionTabs } from "@/components/CompetitionTabs";
import { Collapsible } from "@/components/Collapsible";
import { Comparison } from "@/components/Comparison";
import { MatchCard, MatchAccordion, type MatchHeader } from "@/components/MatchAccordion";
import { MatchResult } from "@/components/MatchResult";
import { MatchStats } from "@/components/MatchStats";
import { MyPrediction } from "@/components/MyPrediction";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import { announceCookie, effectiveContent, shouldShowAnnouncement } from "@/lib/announcement";
import { endOfNextDayParis, formatDateTime, formatShortNumeric } from "@/lib/dates";
import { getLeagueLogos } from "@/lib/league-logos";
import { PHASE, buildMatchRows, matchPhase } from "@/lib/match-view";
import { getActiveRules } from "@/lib/scoring/active-rules";
import { arePredictionsPublic, canEditPrediction, lockTime, oddsToBonus } from "@/lib/scoring/engine";
import { buildStandings } from "@/lib/scoring/ranking";
import { maxPredictedGoals } from "@/lib/settings";
import { runSmartSync } from "@/lib/sync/sync";
import { playerPhotoUrl } from "@/lib/player-photo";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { clubLogo } from "@/lib/club-logo";
import { clubLogosMode } from "@/lib/club-logo-mode";
import { PlayerName } from "@/components/PlayerName";
import { shortPlayerName } from "@/lib/player-name";
import { Landing } from "@/components/landing/Landing";
import { MatchRecap } from "@/components/MatchRecap";
import { loadRecap } from "@/lib/match-recap";
import { LeagueComparison } from "@/components/LeagueComparison";
import { HomeStickyMatch } from "@/components/HomeStickyMatch";
import { PastMatches } from "@/components/PastMatches";
import { BonusIcon } from "@/components/BonusIcon";
import { BONUS_INFO, withBonuses, type BonusQuotas } from "@/lib/scoring/bonus";
import { bonusStock } from "@/lib/bonus-data";
import { TeamLabel } from "@/components/TeamLabel";
import { ScorerPlaceholder } from "@/components/ScorerPlaceholder";
import { activeLeagueScope } from "@/lib/leagues";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // laisse le temps à la synchro d'arrière-plan

const ORDER: CompetitionCode[] = ["LIGUE_1", "EUROPA_LEAGUE", "COUPE_DE_FRANCE"];

export default async function HomePage() {
  const now = new Date();
  const user = await getCurrentUser();
  // Visiteur sans compte : page d'accueil de présentation, sans accès au site
  if (!user) return <Landing />;
  // Animation « fin de match » (affichée une seule fois par appareil, côté navigateur)
  const recap = await loadRecap(user.id).catch(() => null);
  // Ligue affichée : classement et pronostics des autres limités à ses joueurs (sinon tous les joueurs)
  const scope = user ? await activeLeagueScope(user) : null;
  // Sans ligue : on ne voit que ses propres pronostics (pas ceux des autres joueurs du site)
  const inScope = scope ? { in: [...scope.memberIds] } : user ? { in: [user.id] } : undefined;
  const scopeSet = new Set<string>(scope ? [...scope.memberIds] : user ? [user.id] : []);
  // « Pronostics et points » : on peut afficher n'importe laquelle de mes ligues → joueurs de toutes mes ligues
  const myLeagueMembers = user
    ? await prisma.leagueMember.findMany({
        where: { isActive: true, league: { members: { some: { userId: user.id, isActive: true } } } },
        select: { leagueId: true, userId: true },
      })
    : [];
  const inWide = user ? { in: [...new Set([...scopeSet, ...myLeagueMembers.map((x) => x.userId)])] } : undefined;
  const [matches, rules, users, allResults, predCounts, logos] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoffAt: "asc" }, include: { homeTeam: true, awayTeam: true, goals: true, cards: true, events: true } }),
    getActiveRules(),
    prisma.user.findMany({
      where: { isActive: true, ...(inWide ? { id: inWide } : {}) },
      select: { id: true, pseudo: true, createdAt: true, avatarUpdatedAt: true },
    }),
    prisma.predictionResult.findMany({
      where: { user: { isActive: true }, ...(inWide ? { userId: inWide } : {}) },
      select: { userId: true, matchId: true, category: true, scorePoints: true, scorerPoints: true, totalPoints: true, correctScorer: true },
    }),
    prisma.prediction.groupBy({ by: ["matchId"], where: inScope ? { userId: inScope } : {}, _count: { _all: true } }),
    getLeagueLogos(),
  ]);
  // « Les Spécialités Maison » de la ligue affichée (le Général R&N n'en a pas)
  const bonusLeague = user && scope && !scope.general ? { id: scope.leagueId, name: scope.name } : null;
  const currentSeasonId = matches[0]?.seasonId ?? null;
  const leagueBonuses: LeagueBonus[] = bonusLeague ? await loadLeagueBonuses(bonusLeague.id, matches.map((x) => x.id)) : [];
  const bonusStockAll: BonusQuotas | null = bonusLeague && currentSeasonId ? await bonusStock(user!.id, bonusLeague.id, currentSeasonId) : null;
  // Fiche mobile : toutes mes ligues (un bonus peut s'y appliquer en une fois), leur stock et mes bonus sur les matchs affichés
  const myLeagues =
    user && currentSeasonId
      ? await prisma.leagueMember.findMany({
          where: { userId: user.id, isActive: true },
          select: { league: { select: { id: true, name: true, imageUpdatedAt: true } } },
          orderBy: { joinedAt: "asc" },
        })
      : [];
  const myUses = user && myLeagues.length ? await prisma.bonusUse.findMany({ where: { userId: user.id, matchId: { in: matches.map((x) => x.id) } } }) : [];

  // Écussons : officiels ou factices selon le réglage de l'administration
  const logoMode = await clubLogosMode();
  for (const m of matches) {
    m.homeTeam.logoUrl = clubLogo(m.homeTeam, logoMode);
    m.awayTeam.logoUrl = clubLogo(m.awayTeam, logoMode);
  }

  // Synchro en arrière-plan après l'envoi de la page : elle ne fait que ce qui est nécessaire.
  after(() => runSmartSync({ reason: "visite" }).catch(() => undefined));

  // Confidentialité : avant le coup d'envoi, seul MON pronostic quitte le serveur.
  const publicIds = matches.filter((m) => arePredictionsPublic(m, now)).map((m) => m.id);
  const openIds = matches.filter((m) => canEditPrediction(m, now)).map((m) => m.id);
  const [players, odds, mine, publicPreds, predictedBefore, lineups] = await Promise.all([
    prisma.player.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, position: true, photoUrl: true, externalId: true, officialPhotoUrl: true, customPhotoAt: true },
    }),
    // Cotes des matchs ouverts (choix du buteur) et des matchs pas encore notés (points gagnables affichés)
    prisma.playerOdds.findMany({
      where: { match: { resultConfirmedAt: null, status: { not: "CANCELLED" } } },
      select: { matchId: true, playerId: true, odds: true },
    }),
    user
      ? prisma.prediction.findMany({
          where: { userId: user.id },
          include: {
            scorer: { select: { id: true, name: true, photoUrl: true, externalId: true, officialPhotoUrl: true, customPhotoAt: true, shirtNumber: true } },
          },
        })
      : [],
    user
      ? prisma.prediction.findMany({
          where: { matchId: { in: publicIds }, ...(inWide ? { userId: inWide } : {}) },
          select: {
            matchId: true,
            userId: true,
            rennesGoals: true,
            opponentGoals: true,
            noScorerPick: true,
            scorerId: true,
            scorerOdds: true,
            scorer: { select: { name: true } },
          },
        })
      : [],
    // Avant le coup d'envoi : seulement QUI a pronostiqué (aucun score)
    user
      ? prisma.prediction.findMany({
          where: { matchId: { in: openIds }, ...(inWide ? { userId: inWide } : {}) },
          select: { matchId: true, userId: true, scorerId: true, noScorerPick: true },
        })
      : [],
    prisma.matchLineup.findMany({ where: { matchId: { in: openIds } }, select: { matchId: true, playerId: true, starter: true } }),
  ]);
  const lineupBy = new Map<string, Map<string, boolean>>();
  for (const l of lineups) {
    if (!lineupBy.has(l.matchId)) lineupBy.set(l.matchId, new Map());
    lineupBy.get(l.matchId)!.set(l.playerId, l.starter);
  }

  const standings = buildStandings(users.map((u) => ({ userId: u.id, pseudo: u.pseudo })), allResults);
  const usersByRank = standings.map((s) => users.find((u) => u.id === s.userId)!).filter(Boolean);
  // Bonus de toutes mes ligues (pour l'affichage des pronostics de chacune)
  const allLeagueBonuses = myLeagueMembers.length
    ? await prisma.bonusUse.findMany({
        where: { leagueId: { in: [...new Set(myLeagueMembers.map((x) => x.leagueId))] }, matchId: { in: matches.map((x) => x.id) } },
      })
    : [];
  const countBy = new Map(predCounts.map((c) => [c.matchId, c._count._all]));
  const myBy = new Map(mine.map((p) => [p.matchId, p]));
  const oddsBy = new Map<string, Map<string, number>>();
  for (const o of odds) {
    if (!oddsBy.has(o.matchId)) oddsBy.set(o.matchId, new Map());
    oddsBy.get(o.matchId)!.set(o.playerId, Number(o.odds));
  }
  const fallbackBonus = rules.scorerFallback.mode === "FIXED" ? rules.scorerFallback.fixedBonus : 0;
  /** Points gagnables avec un choix de buteur : cote figée si elle existe, sinon cote actuelle, sinon bonus de secours. */
  const bonusOf = (matchId: string, p: { scorerId: string | null; noScorerPick: boolean; scorerOdds: unknown }): number | null => {
    if (p.noScorerPick) return rules.noScorerBonus || null;
    if (!p.scorerId) return null;
    const odds = p.scorerOdds != null ? Number(p.scorerOdds) : (oddsBy.get(matchId)?.get(p.scorerId) ?? null);
    return odds ? oddsToBonus(odds, rules) : fallbackBonus;
  };
  const maxGoals = maxPredictedGoals();

  // En tête : le match en cours, ou le dernier match terminé (jusqu'à minuit à la fin du lendemain), puis le prochain match.
  const live = matches.find((m) => m.status === "LIVE" || m.status === "INTERRUPTED") ?? null;
  const justFinished = live
    ? null
    : ([...matches]
        .reverse()
        .find((m) => m.status === "FINISHED" && now < endOfNextDayParis(new Date(m.kickoffAt.getTime() + 2 * 3600_000))) ?? null);
  const top = live ?? justFinished;
  const next = matches.find((m) => m.status === "SCHEDULED" && m.kickoffAt > now) ?? null;

  const headersById = new Map<string, MatchHeader>();
  let upcoming: typeof matches = [];
  const renderMatch = (m: (typeof matches)[number], opts: { layout?: "next" | "top" | "list" } = {}) => {
    const c = COMPETITIONS[m.competition];
    const phase = matchPhase(m, now);
    const editable = canEditPrediction(m, now);
    const isPublic = publicIds.includes(m.id);
    const my = myBy.get(m.id);

    const finalScore =
      m.status === "FINISHED" && m.regHomeScore !== null && m.regAwayScore !== null
        ? {
            home: m.aetHomeScore ?? m.regHomeScore,
            away: m.aetAwayScore ?? m.regAwayScore,
            pens: m.penHomeScore !== null ? `t.a.b. ${m.penHomeScore}-${m.penAwayScore}` : null,
          }
        : null;
    const liveScore =
      (m.status === "LIVE" || m.status === "INTERRUPTED") && m.liveHomeScore !== null
        ? { home: m.liveHomeScore, away: m.liveAwayScore ?? 0, pens: null }
        : null;
    const score = finalScore ?? liveScore;

    const code =
      m.competition === "COUPE_DE_FRANCE"
        ? (m.stage?.split(" ")[0] ?? "CdF")
        : m.matchday
          ? `J${m.matchday}`
          : m.competition === "EUROPA_LEAGUE"
            ? (m.stage?.split(" ")[0] ?? "UEL")
            : "L1";
    // Rappel de mon pronostic dans l'en-tête du match (score, buteur, spécialités jouées et leurs ligues)
    const myPick: MatchHeader["myPick"] = my
      ? {
          score: m.rennesIsHome ? `${my.rennesGoals} - ${my.opponentGoals}` : `${my.opponentGoals} - ${my.rennesGoals}`,
          scorer: my.scorer
            ? { name: my.scorer.name, short: shortPlayerName(my.scorer.name), photo: playerPhotoUrl(my.scorer), number: my.scorer.shirtNumber }
            : null,
          noScorer: my.noScorerPick,
          bonuses: myUses
            .filter((u) => u.matchId === m.id)
            .map((u) => {
              const l = myLeagues.find((x) => x.league.id === u.leagueId)?.league;
              return { kind: u.kind, leagueId: u.leagueId, leagueName: l?.name ?? "Ligue", leagueImageAt: l?.imageUpdatedAt?.getTime() ?? null };
            }),
        }
      : null;
    const h: MatchHeader = {
      myPick,
      id: m.id,
      code,
      competition: m.competition,
      competitionLabel:
        m.competition === "LIGUE_1"
          ? `${c.label}${m.matchday ? ` · ${m.matchday}e journée` : ""}`
          : `${c.label}${m.stage ? ` · ${m.stage}` : ""}`,
      competitionLogo: logos[m.competition] ?? null,
      dateLabel: formatDateTime(m.kickoffAt),
      home: { name: m.homeTeam.name, logo: m.homeTeam.logoUrl, rennes: m.rennesIsHome },
      away: { name: m.awayTeam.name, logo: m.awayTeam.logoUrl, rennes: !m.rennesIsHome },
      score,
      statusLabel: PHASE[phase].label,
      statusShort: PHASE[phase].short,
      statusTone: PHASE[phase].tone,
      live: m.status === "LIVE" ? `En direct${m.liveMinute ? ` · ${m.liveMinute}’` : ""}` : null,
      isNext: next?.id === m.id,
      cancelled: m.status === "CANCELLED",
      playersCount: countBy.get(m.id) ?? 0,
      mine:
        user && editable
          ? !my
            ? "incomplete"
            : my.scorerId || my.noScorerPick
              ? "complete"
              : (oddsBy.get(m.id)?.size ?? 0) > 0
                ? "scorer" // les buteurs et leurs points sont disponibles : choix à faire
                : "score"
          : null,
    };
    headersById.set(m.id, h);

    if (h.cancelled) {
      return (
        <MatchAccordion key={m.id} h={h}>
          <p className="text-sm text-neutral-600">Ce match est annulé.</p>
        </MatchAccordion>
      );
    }

    const matchBonuses = leagueBonuses.filter((b) => b.matchId === m.id);
    const myBonusUse = user ? matchBonuses.find((b) => b.userId === user.id) : undefined;
    // Points en direct : match en cours, ou terminé mais pas encore confirmé
    const nowScore =
      !m.resultConfirmedAt && score && (m.status === "LIVE" || m.status === "INTERRUPTED" || m.status === "FINISHED")
        ? m.rennesIsHome
          ? { rennes: score.home, opponent: score.away }
          : { rennes: score.away, opponent: score.home }
        : null;
    const liveInput = nowScore
      ? {
          score: nowScore,
          rennesScorerIds: m.goals.filter((g) => g.forRennes && !g.isOwnGoal && g.playerId).map((g) => g.playerId as string),
          rennesPlayerScored: m.goals.some((g) => g.forRennes && !g.isOwnGoal) || (nowScore.rennes > 0 && m.goals.length === 0),
          rules,
        }
      : null;
    const rowsFor = (ids: Set<string>, bonusRows: ReadonlyArray<{ userId: string; matchId: string; points: number | null }>) =>
      user
      ? buildMatchRows({
          users: usersByRank.filter((u) => ids.has(u.id)),
          me: user.id,
          rennesIsHome: m.rennesIsHome,
          kickoffAt: m.kickoffAt,
          isPublic,
          preds: [
            // mon pronostic (toujours), ceux des autres seulement s'ils sont publics
            ...(isPublic ? publicPreds.filter((p) => p.matchId === m.id && ids.has(p.userId)) : my ? [my] : []).map((p) => ({
              userId: p.userId,
              rennesGoals: p.rennesGoals,
              opponentGoals: p.opponentGoals,
              scorerName: p.scorer?.name ?? null,
              noScorerPick: p.noScorerPick,
              scorerBonus: bonusOf(m.id, p),
              scorerId: p.scorerId,
            })),
            // avant le coup d'envoi : les autres n'apparaissent qu'avec « OK », sans aucun score
            ...(!isPublic
              ? predictedBefore
                  .filter((p) => p.matchId === m.id && p.userId !== user.id && ids.has(p.userId))
                  .map((p) => ({
                    userId: p.userId,
                    rennesGoals: 0,
                    opponentGoals: 0,
                    scorerName: null,
                    noScorerPick: false,
                    hasScorerBet: Boolean(p.scorerId || p.noScorerPick), // oui / non, jamais lequel
                  }))
              : []),
          ],
          results: withBonuses(
            allResults.filter((r) => r.matchId === m.id && ids.has(r.userId)),
            bonusRows,
          ),
          live: liveInput,
        })
      : [];
    const rows = rowsFor(scopeSet, matchBonuses);

    const matchOdds = oddsBy.get(m.id);
    const matchLineup = m.lineupAt ? lineupBy.get(m.id) : undefined;
    const myBonus = my ? bonusOf(m.id, my) : null;
    const myScore = my ? (m.rennesIsHome ? `${my.rennesGoals} - ${my.opponentGoals}` : `${my.opponentGoals} - ${my.rennesGoals}`) : null;
    const myScorer = my ? (my.scorer?.name ?? (my.noScorerPick ? "Aucun buteur rennais" : null)) : null;
    const scorerPhoto = (size: number, caption: boolean) =>
      my?.scorer ? (
        <PlayerPhoto name={my.scorer.name} url={playerPhotoUrl(my.scorer)} size={size} shape="card" number={my.scorer.shirtNumber} className="self-center" />
      ) : (
        <ScorerPlaceholder mode={my?.noScorerPick ? "none" : "unknown"} size={size} caption={caption} />
      );
    const pointsText = myBonus != null ? `+${myBonus} pt${myBonus > 1 ? "s" : ""}` : null;
    const summaryNode = my ? (
      // Ordinateur : score et buteur sur une seule ligne, à la même hauteur ; mobile : score puis buteur
      <div className="space-y-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm md:flex md:items-stretch md:gap-5 md:space-y-0">
        <div className="md:flex md:min-w-0 md:flex-1 md:flex-col md:justify-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500">Score</p>
          <div className="mt-1 grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
            <span className="flex min-w-0 items-center justify-end gap-2 text-right">
              <TeamLabel name={m.homeTeam.name} rennes={m.rennesIsHome} className="truncate font-display text-base font-bold uppercase tracking-wide sm:text-xl" />
              {m.homeTeam.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.homeTeam.logoUrl} alt="" className="h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9" />
              )}
            </span>
            <span aria-label={`Score pronostiqué ${myScore}`} className="font-club text-4xl font-semibold leading-none tabular-nums text-noir sm:text-5xl">
              {myScore?.replace(" - ", " – ")}
            </span>
            <span className="flex min-w-0 items-center gap-2">
              {m.awayTeam.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.awayTeam.logoUrl} alt="" className="h-7 w-7 shrink-0 object-contain sm:h-9 sm:w-9" />
              )}
              <TeamLabel name={m.awayTeam.name} rennes={!m.rennesIsHome} className="truncate font-display text-base font-bold uppercase tracking-wide sm:text-xl" />
            </span>
          </div>
        </div>

        {/* Ordinateur : le buteur à droite du score — photo (avec son numéro), puis « Nom complet · +3 pts » */}
        <div className="hidden min-w-0 items-center gap-3 border-l border-neutral-200 pl-5 md:flex">
          {scorerPhoto(80, false)}
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500">Buteur</p>
            {myScorer ? (
              <p className="whitespace-nowrap text-base font-semibold">
                {my?.scorer ? my.scorer.name : myScorer}
                {pointsText && (
                  <>
                    <span className="mx-1.5 text-neutral-400">·</span>
                    <span className="font-bold text-green-700">{pointsText}</span>
                  </>
                )}
              </p>
            ) : (
              <p className="italic text-neutral-500">Pronostic manquant</p>
            )}
          </div>
        </div>

        {myBonusUse && (
          <div className="flex items-center gap-2 border-neutral-200 md:border-l md:pl-5">
            <BonusIcon kind={myBonusUse.kind} size={40} />
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500">Spécialité maison</p>
              <p className="whitespace-nowrap font-semibold">{BONUS_INFO[myBonusUse.kind].name}</p>
            </div>
          </div>
        )}

        {/* Mobile : le buteur sous le score, photo à droite */}
        <div className="flex items-stretch gap-3 md:hidden">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500">Buteur</p>
            {myScorer ? (
              <>
                <p className="truncate font-semibold">{my?.scorer ? <PlayerName name={my.scorer.name} /> : myScorer}</p>
                {myBonus != null && (
                  <p className="text-sm font-bold text-green-700">
                    +{myBonus} point{myBonus > 1 ? "s" : ""} à gagner
                  </p>
                )}
              </>
            ) : (
              <p className="italic text-neutral-500">Pronostic manquant</p>
            )}
          </div>
          {scorerPhoto(112, true)}
        </div>
      </div>
    ) : null;
    const scorerOptions = editable
                ? players
                    // joueurs avec une cote ET (si elle est publiée) sur la feuille de match ; le choix enregistré reste visible
                    .filter((p) => (matchOdds?.has(p.id) && (!matchLineup || matchLineup.has(p.id))) || p.id === my?.scorerId)
                    .map((p) => {
                      const o = matchOdds?.get(p.id) ?? null;
                      const role = matchLineup ? (matchLineup.get(p.id) === undefined ? null : matchLineup.get(p.id) ? "starter" : "sub") : null;
                      return {
                        id: p.id,
                        name: p.name,
                        position: p.position,
                        photo: playerPhotoUrl(p),
                        odds: o,
                        bonus: o ? oddsToBonus(o, rules) : fallbackBonus,
                        role,
                      } as const;
                    })
                : [];
    const savedOut = matchLineup && my?.scorerId && !matchLineup.has(my.scorerId) ? (my.scorer?.name ?? "Ton buteur") : null;
    const bonusProp = bonusLeague && bonusStockAll
                ? {
                    leagueId: bonusLeague.id,
                    leagueName: bonusLeague.name,
                    // stock sans compter le bonus déjà posé sur CE match
                    stock: myBonusUse ? { ...bonusStockAll, [myBonusUse.kind]: bonusStockAll[myBonusUse.kind] + 1 } : bonusStockAll,
                    current: myBonusUse ? { kind: myBonusUse.kind } : null,
                  }
                : undefined;

    const predictionNode = (
      user ? (
          <MyPrediction
            matchId={m.id}
            open={editable}
            deadline={
              m.status === "POSTPONED" && !m.deadlineAt ? "à la nouvelle heure officielle du coup d’envoi" : formatDateTime(lockTime(m))
            }
            homeName={m.homeTeam.name}
            awayName={m.awayTeam.name}
            rennesIsHome={m.rennesIsHome}
            maxGoals={maxGoals}
            noScorerBonus={rules.noScorerBonus}
            scorers={scorerOptions}
            lineupPublished={Boolean(matchLineup)}
            savedScorerOut={savedOut}
            initial={my ? { rennesGoals: my.rennesGoals, opponentGoals: my.opponentGoals, scorerId: my.scorerId, noScorerPick: my.noScorerPick } : null}
            summary={opts.layout === "next" || (opts.layout !== "top" && editable) ? summaryNode : undefined}
            bonus={bonusProp}
          />
        ) : editable ? (
          <p className="text-sm text-neutral-600">
            <Link href="/connexion" className="font-semibold text-rouge hover:underline">
              Connecte-toi
            </Link>{" "}
            pour saisir ton pronostic.
          </p>
        ) : null
    );
    // le bonus des autres n'est visible qu'après le coup d'envoi (le mien, toujours)
    const withBonusChip = (rs: typeof rows, br: ReadonlyArray<{ userId: string; kind: "KOUIGN_AMANN" | "GALETTE_SAUCISSE"; points: number | null }>) =>
      rs.map((r) => {
        const b = br.find((x) => x.userId === r.userId);
        return b && (isPublic || r.mine) ? { ...r, bonus: { kind: b.kind, points: b.points } } : r;
      });
    // Une vue par ligue du joueur (la ligue affichée d'abord sélectionnée) ; sans ligue : ses seuls pronostics
    const views = myLeagues.length
      ? myLeagues.map((ml) => {
          const ids = new Set(myLeagueMembers.filter((x) => x.leagueId === ml.league.id).map((x) => x.userId));
          const br = allLeagueBonuses.filter((b) => b.leagueId === ml.league.id && b.matchId === m.id);
          return { id: ml.league.id, name: ml.league.name, rows: withBonusChip(rowsFor(ids, br), br) };
        })
      : [{ id: "moi", name: "", rows: withBonusChip(rows, matchBonuses) }];
    const comparisonNode = user && views.some((v) => v.rows.length > 0) ? true : null;
    const resultNode = score ? (
      <MatchResult
        title={finalScore ? (m.resultConfirmedAt ? "Résultat officiel" : "Résultat officiel (en attente de confirmation)") : "Résultat officiel · en direct"}
        homeName={m.homeTeam.name}
        awayName={m.awayTeam.name}
        score={score}
        goals={m.goals}
        cards={m.cards}
        events={m.events}
        rennesIsHome={m.rennesIsHome}
      />
    ) : null;

    // Titres des rubriques d'un match : même style que les titres de pages (LIGUES…), en plus petit
    const title = (t: string) => <h3 className="mb-3 font-display text-xl font-bold uppercase tracking-wide text-rouge sm:text-2xl">{t}</h3>;
    const noLeagueNote =
      user && !scope ? (
        <p className="mt-2 text-xs text-neutral-600">
          Pour voir les pronostics des autres joueurs,{" "}
          <Link href="/ligues" className="font-semibold text-rouge hover:underline">
            rejoins ou crée une ligue
          </Link>
          .
        </p>
      ) : null;
    const emptyNode = (
      <p className="text-sm text-neutral-600">
        {!user ? "Connecte-toi pour voir les pronostics des joueurs." : editable ? "Aucun pronostic pour l’instant." : "Aucun pronostic n’a été effectué."}
      </p>
    );
    const pronosSection = comparisonNode ? (
      <>
        <LeagueComparison
          title={title("Pronostics et points")}
          views={views}
          initial={scope && !scope.general ? scope.leagueId : undefined}
          live={m.status === "LIVE" || m.status === "INTERRUPTED"}
          empty={emptyNode}
        />
        {noLeagueNote}
      </>
    ) : (
      <section>
        {title("Pronostics et points")}
        {emptyNode}
        {noLeagueNote}
      </section>
    );

    if (opts.layout === "next") {
      // Prochain match — en haut : Mon prono (gauche) · Avant match (droite) ; en bas : Pronostics et points
      return (
        <MatchAccordion key={m.id} h={h} href={user && editable ? `/match/${m.id}` : undefined}>
          <div className="space-y-6">
            <section className="min-w-0">
              {title("Mon prono")}
              {predictionNode}
            </section>
            <section className="min-w-0">
              {title("Avant match")}
              <MatchStats
                competition={m.competition}
                home={{ id: m.homeTeam.externalId, name: m.homeTeam.name, logo: m.homeTeam.logoUrl }}
                away={{ id: m.awayTeam.externalId, name: m.awayTeam.name, logo: m.awayTeam.logoUrl }}
                odds={{ home: m.oddsHome, draw: m.oddsDraw, away: m.oddsAway }}
              />
            </section>
          </div>
          {pronosSection}
        </MatchAccordion>
      );
    }

    // Calendrier : un match au résultat définitif reprend la présentation de « Match terminé »
    if (opts.layout === "top" || (!opts.layout && phase === "FINAL")) {
      // Match en cours / terminé — en haut : résultat (score, buteurs, cartons) ; en bas : Pronostics et points
      return (
        <MatchAccordion key={m.id} h={h}>
          {resultNode ?? (
            <section>
              {title("Résultat officiel")}
              <p className="text-sm text-neutral-600">Score pas encore disponible.</p>
            </section>
          )}
          {pronosSection}
        </MatchAccordion>
      );
    }

    if (editable) {
      // Calendrier, pronostics ouverts : même « Mon prono » que le prochain match (toute la largeur :
      // score et buteur sur une ligne sur PC), sans la rubrique « Avant match »
      return (
        <MatchAccordion key={m.id} h={h} href={user && editable ? `/match/${m.id}` : undefined}>
          <section className="min-w-0">
            {title("Mon prono")}
            {predictionNode}
          </section>
          {pronosSection}
        </MatchAccordion>
      );
    }

    return (
      <MatchAccordion key={m.id} h={h}>
        {predictionNode}
        {comparisonNode && (
          <Collapsible title="Pronostics et points">
            {comparisonNode}
            {noLeagueNote}
          </Collapsible>
        )}
        {resultNode}
      </MatchAccordion>
    );
  };

  // Message de l'organisateur : une fois par appareil
  const announcement = user ? await prisma.announcement.findUnique({ where: { id: "current" } }) : null;
  const showAnnouncement =
    !!user && shouldShowAnnouncement(announcement, (await cookies()).get(announceCookie(user.id))?.value);
  const announcementWindow =
    showAnnouncement && announcement && user ? (
      <AnnouncementWindow
        userId={user.id}
        version={announcement.version}
        {...effectiveContent(announcement)}
        askNotifications={announcement.askNotifications}
        publicKey={process.env.VAPID_PUBLIC_KEY?.trim() || null}
      />
    ) : null;

  if (matches.length === 0) {
    return (
      <div className="card">
        <p className="font-semibold">Le calendrier 2026/2027 n’est pas encore disponible.</p>
        <p className="mt-1 text-sm text-neutral-600">Il apparaîtra après la prochaine synchronisation.</p>
      </div>
    );
  }

  // Ordinateur : trois prochains matchs (à venir, non annulés), en cartes
  upcoming = matches
    .filter((m) => m.status === "SCHEDULED" && m.kickoffAt > now && m.id !== live?.id)
    .sort((a, b) => a.kickoffAt.getTime() - b.kickoffAt.getTime())
    .slice(0, 3);
  upcoming.forEach((m) => renderMatch(m, { layout: "list" })); // calcule et mémorise leurs en-têtes
  return (
    <AccordionGroup defaultOpenId={null}>
      {recap && <MatchRecap data={recap} userId={user.id} />}
      {announcementWindow}
      {live && <LiveRefresh />}
      <div className="space-y-8">
        {matches.some((m) => m.simulation) && (
          <div role="status" className="rounded-lg border border-orange-300 bg-orange-100 p-3 text-sm text-orange-800">
            ⚠️ Mode test : le résultat de{" "}
            {matches
              .filter((m) => m.simulation)
              .map((m) => `${m.homeTeam.name} – ${m.awayTeam.name}`)
              .join(", ")}{" "}
            est <strong>simulé</strong> (fictif) et sera supprimé par l’administrateur. La saisie des pronostics y est suspendue.
          </div>
        )}
        {!user && (
          <div className="card text-sm">
            <Link href="/connexion" className="font-semibold text-rouge hover:underline">
              Connecte-toi
            </Link>{" "}
            pour enregistrer tes pronostics et voir ton classement.
          </div>
        )}

        {top && (
          <section id="home-top-match" className="space-y-3" data-tour={live ? "top-match" : undefined}>
            <h2 className="text-xs font-bold uppercase tracking-wide text-noir">{live ? "Match en cours" : "Match terminé"}</h2>
            {renderMatch(top, { layout: "top" })}
          </section>
        )}

        {next ? (
          <>
            {/* Mobile : le prochain match */}
            <section id="home-next-match" className="space-y-3 lg:hidden" data-tour="next-match">
              <h2 className="text-xs font-bold uppercase tracking-wide text-noir">Prochain match</h2>
              {renderMatch(next, { layout: "next" })}
            </section>
            {/* Ordinateur : les trois prochains matchs, en cartes qui ouvrent la page du match */}
            <section id="home-next-cards" className="hidden space-y-3 lg:block" data-tour="next-match">
              <h2 className="text-xs font-bold uppercase tracking-wide text-noir">Prochains matchs</h2>
              <div className="grid grid-cols-3 gap-7 px-1">
                {upcoming.map((m) => {
                  const h = headersById.get(m.id);
                  if (!h) return null;
                  return <MatchCard key={m.id} h={h} href={canEditPrediction(m, now) ? `/match/${m.id}` : `/#match-${m.id}`} />;
                })}
              </div>
            </section>
          </>
        ) : (
          !top && <p className="card text-sm text-neutral-700">Le calendrier est en attente de nouvelles rencontres.</p>
        )}

        {(() => {
          // Barre fixe au défilement : le match à la une (en direct ou terminé), sinon le prochain match
          const featured = top ?? next;
          const fh = featured ? headersById.get(featured.id) : undefined;
          if (!featured || !fh) return null;
          const isLive = Boolean(live && featured.id === live.id);
          const status = isLive
            ? "En direct"
            : featured.status === "FINISHED"
              ? featured.resultConfirmedAt
                ? "Résultat définitif"
                : "Résultat provisoire"
              : canEditPrediction(featured, now)
                ? "Pronostics ouverts"
                : "Pronostics fermés";
          const nh = next ? headersById.get(next.id) : undefined;
          return (
            <>
              <HomeStickyMatch
                only="mobile"
                watchId={top ? "home-top-match" : "home-next-match"}
                title={isLive ? "Match en direct" : featured.status === "FINISHED" ? "Match terminé" : "Prochain match"}
                code={fh.code}
                competitionLogo={fh.competitionLogo}
                home={fh.home}
                away={fh.away}
                score={fh.score ? `${fh.score.home} - ${fh.score.away}` : null}
                status={status}
                live={isLive}
              />
              {/* Ordinateur : le match en direct (quand son bloc n'est plus visible), sinon le prochain match
                  (quand les 3 cartes ne sont plus visibles) ; noms complets des équipes */}
              {isLive ? (
                <HomeStickyMatch
                  only="desktop"
                  fullNames
                  watchId="home-top-match"
                  title="Match en direct"
                  code={fh.code}
                  competitionLogo={fh.competitionLogo}
                  home={fh.home}
                  away={fh.away}
                  score={fh.score ? `${fh.score.home} - ${fh.score.away}` : null}
                  status="En direct"
                  live
                />
              ) : (
                next &&
                nh && (
                  <HomeStickyMatch
                    only="desktop"
                    fullNames
                    watchId="home-next-cards"
                    title="Prochain match"
                    code={nh.code}
                    competitionLogo={nh.competitionLogo}
                    home={nh.home}
                    away={nh.away}
                    score={null}
                    status={canEditPrediction(next, now) ? "Pronostics ouverts" : "Pronostics fermés"}
                    live={false}
                  />
                )
              )}
            </>
          );
        })()}

        <section className="space-y-3" data-tour="calendar">
          <h2 className="text-xs font-bold uppercase tracking-wide text-noir">Calendrier 2026/2027</h2>
          <CompetitionTabs
            defaultCode={(next ?? top)?.competition ?? "LIGUE_1"}
            tabs={ORDER.map((code) => {
              const list = matches.filter((m) => m.competition === code && m.id !== next?.id && m.id !== top?.id);
              return {
                code,
                logo: logos[code] ?? null,
                count: matches.filter((m) => m.competition === code).length,
                panel:
                  list.length === 0 ? (
                    <p className="text-sm text-neutral-500">
                      {code === "COUPE_DE_FRANCE"
                        ? "Aucune rencontre programmée pour l’instant : le Stade Rennais entre en lice en hiver."
                        : "Aucune autre rencontre programmée pour l’instant."}
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {/* Matchs déjà joués : masqués (sauf le « Match terminé » en haut de page), affichables d'un clic */}
                      <PastMatches count={list.filter((m) => isPlayed(m)).length}>{list.filter((m) => isPlayed(m)).map((m) => renderMatch(m))}</PastMatches>
                      {list.filter((m) => !isPlayed(m)).map((m) => renderMatch(m))}
                    </div>
                  ),
              };
            })}
          />
        </section>
      </div>
    </AccordionGroup>
  );
}


/** Match déjà joué (terminé ou annulé) : masqué par défaut dans le calendrier. */
function isPlayed(m: { status: string }) {
  return m.status === "FINISHED" || m.status === "CANCELLED";
}

/** Bonus « Spécialités Maison » joués dans une ligue, sur les matchs affichés. */
async function loadLeagueBonuses(leagueId: string, matchIds: string[]) {
  return prisma.bonusUse.findMany({
    where: { leagueId, matchId: { in: matchIds } },
  });
}
type LeagueBonus = Awaited<ReturnType<typeof loadLeagueBonuses>>[number];
