import Link from "next/link";
import { after } from "next/server";
import { cookies } from "next/headers";
import { AccordionGroup } from "@/components/AccordionGroup";
import { AnnouncementWindow } from "@/components/AnnouncementWindow";
import { LiveRefresh } from "@/components/LiveRefresh";
import { CompetitionTabs } from "@/components/CompetitionTabs";
import { Collapsible } from "@/components/Collapsible";
import { Comparison } from "@/components/Comparison";
import { MatchAccordion, type MatchHeader } from "@/components/MatchAccordion";
import { MatchResult } from "@/components/MatchResult";
import { MatchStats } from "@/components/MatchStats";
import { MyPrediction } from "@/components/MyPrediction";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import { announceCookie, effectiveContent, shouldShowAnnouncement } from "@/lib/announcement";
import { endOfNextDayParis, formatDateTime } from "@/lib/dates";
import { getLeagueLogos } from "@/lib/league-logos";
import { PHASE, buildMatchRows, matchPhase } from "@/lib/match-view";
import { getActiveRules } from "@/lib/scoring/active-rules";
import { arePredictionsPublic, canEditPrediction, lockTime, oddsToBonus } from "@/lib/scoring/engine";
import { buildStandings } from "@/lib/scoring/ranking";
import { maxPredictedGoals } from "@/lib/settings";
import { runSmartSync } from "@/lib/sync/sync";
import { playerPhotoUrl } from "@/lib/player-photo";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { activeLeagueScope } from "@/lib/leagues";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // laisse le temps à la synchro d'arrière-plan

const ORDER: CompetitionCode[] = ["LIGUE_1", "EUROPA_LEAGUE", "COUPE_DE_FRANCE"];

export default async function HomePage() {
  const now = new Date();
  const user = await getCurrentUser();
  // Ligue affichée : classement et pronostics des autres limités à ses joueurs (sinon tous les joueurs)
  const scope = user ? await activeLeagueScope(user) : null;
  // Sans ligue : on ne voit que ses propres pronostics (pas ceux des autres joueurs du site)
  const inScope = scope ? { in: [...scope.memberIds] } : user ? { in: [user.id] } : undefined;
  const [matches, rules, users, allResults, predCounts, logos] = await Promise.all([
    prisma.match.findMany({ orderBy: { kickoffAt: "asc" }, include: { homeTeam: true, awayTeam: true, goals: true, cards: true } }),
    getActiveRules(),
    prisma.user.findMany({
      where: { isActive: true, ...(inScope ? { id: inScope } : {}) },
      select: { id: true, pseudo: true, createdAt: true, avatarUpdatedAt: true },
    }),
    prisma.predictionResult.findMany({
      where: { user: { isActive: true }, ...(inScope ? { userId: inScope } : {}) },
      select: { userId: true, matchId: true, category: true, scorePoints: true, scorerPoints: true, totalPoints: true, correctScorer: true },
    }),
    prisma.prediction.groupBy({ by: ["matchId"], where: inScope ? { userId: inScope } : {}, _count: { _all: true } }),
    getLeagueLogos(),
  ]);

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
          include: { scorer: { select: { id: true, name: true, photoUrl: true, externalId: true, officialPhotoUrl: true, customPhotoAt: true } } },
        })
      : [],
    user
      ? prisma.prediction.findMany({
          where: { matchId: { in: publicIds }, ...(inScope ? { userId: inScope } : {}) },
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
          where: { matchId: { in: openIds }, ...(inScope ? { userId: inScope } : {}) },
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
    const h: MatchHeader = {
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

    if (h.cancelled) {
      return (
        <MatchAccordion key={m.id} h={h}>
          <p className="text-sm text-neutral-600">Ce match est annulé.</p>
        </MatchAccordion>
      );
    }

    const matchResults = allResults.filter((r) => r.matchId === m.id);
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
    const rows = user
      ? buildMatchRows({
          users: usersByRank,
          me: user.id,
          rennesIsHome: m.rennesIsHome,
          kickoffAt: m.kickoffAt,
          isPublic,
          preds: [
            // mon pronostic (toujours), ceux des autres seulement s'ils sont publics
            ...(isPublic ? publicPreds.filter((p) => p.matchId === m.id) : my ? [my] : []).map((p) => ({
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
                  .filter((p) => p.matchId === m.id && p.userId !== user.id)
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
          results: matchResults,
          live: liveInput,
        })
      : [];

    const matchOdds = oddsBy.get(m.id);
    const matchLineup = m.lineupAt ? lineupBy.get(m.id) : undefined;
    const myBonus = my ? bonusOf(m.id, my) : null;
    const myScore = my ? (m.rennesIsHome ? `${my.rennesGoals} - ${my.opponentGoals}` : `${my.opponentGoals} - ${my.rennesGoals}`) : null;
    const myScorer = my ? (my.scorer?.name ?? (my.noScorerPick ? "Aucun buteur rennais" : null)) : null;
    const summaryNode = my ? (
      <div className="flex items-stretch gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-sm">
        <div className="min-w-0 flex-1 space-y-2">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500">Score</p>
            <p className="font-display text-2xl font-bold tabular-nums">
              <span className="mr-2 text-sm font-medium text-neutral-600">{m.homeTeam.shortName ?? m.homeTeam.name}</span>
              {myScore}
              <span className="ml-2 text-sm font-medium text-neutral-600">{m.awayTeam.shortName ?? m.awayTeam.name}</span>
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500">Buteur</p>
            {myScorer ? (
              <>
                <p className="truncate font-semibold">{myScorer}</p>
                {myBonus != null && (
                  <p className="text-sm font-bold text-green-700">
                    +{myBonus} point{myBonus > 1 ? "s" : ""} à gagner
                  </p>
                )}
              </>
            ) : (
              <p className="italic text-neutral-500">Pas de pari buteur</p>
            )}
          </div>
        </div>
        {/* Photo officielle du buteur choisi, en grand, dans l'espace libre à droite */}
        {my?.scorer && (
          <PlayerPhoto name={my.scorer.name} url={playerPhotoUrl(my.scorer)} size={112} shape="card" className="self-center" />
        )}
      </div>
    ) : null;
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
            scorers={
              editable
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
                : []
            }
            lineupPublished={Boolean(matchLineup)}
            savedScorerOut={
              matchLineup && my?.scorerId && !matchLineup.has(my.scorerId) ? (my.scorer?.name ?? "Ton buteur") : null
            }
            initial={my ? { rennesGoals: my.rennesGoals, opponentGoals: my.opponentGoals, scorerId: my.scorerId, noScorerPick: my.noScorerPick } : null}
            summary={opts.layout === "next" || (opts.layout !== "top" && editable) ? summaryNode : undefined}
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
    const comparisonNode = user && rows.length > 0 ? <Comparison rows={rows} live={m.status === "LIVE" || m.status === "INTERRUPTED"} /> : null;
    const resultNode = score ? (
      <MatchResult
        title={finalScore ? (m.resultConfirmedAt ? "Résultat officiel" : "Résultat officiel (en attente de confirmation)") : "Résultat officiel · en direct"}
        homeName={m.homeTeam.name}
        awayName={m.awayTeam.name}
        score={score}
        goals={m.goals}
        cards={m.cards}
        rennesIsHome={m.rennesIsHome}
      />
    ) : null;

    const title = (t: string) => <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">{t}</h3>;
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
    const pronosSection = (
      <section>
        {title("Pronostics et points")}
        {comparisonNode ?? (
          <p className="text-sm text-neutral-600">
            {!user
              ? "Connecte-toi pour voir les pronostics des joueurs."
              : editable
                ? "Aucun pronostic pour l’instant."
                : "Aucun pronostic n’a été effectué."}
          </p>
        )}
        {noLeagueNote}
      </section>
    );

    if (opts.layout === "next") {
      // Prochain match — en haut : Mon prono (gauche) · Avant match (droite) ; en bas : Pronostics et points
      return (
        <MatchAccordion key={m.id} h={h}>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="min-w-0">
              {title("Mon prono")}
              {predictionNode}
            </section>
            <section className="min-w-0">
              {title("Avant match")}
              <MatchStats
                competition={m.competition}
                home={{ id: m.homeTeam.externalId, name: m.homeTeam.name }}
                away={{ id: m.awayTeam.externalId, name: m.awayTeam.name }}
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
      // Calendrier, pronostics ouverts : comme le prochain match, sans la rubrique « Avant match »
      return (
        <MatchAccordion key={m.id} h={h}>
          <div className="grid gap-6 md:grid-cols-2">
            <section className="min-w-0">
              {title("Mon prono")}
              {predictionNode}
            </section>
          </div>
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

  return (
    <AccordionGroup defaultOpenId={null}>
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
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-500">{live ? "Match en cours" : "Match terminé"}</h2>
            {renderMatch(top, { layout: "top" })}
          </section>
        )}

        {next ? (
          <section className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Prochain match</h2>
            {renderMatch(next, { layout: "next" })}
          </section>
        ) : (
          !top && <p className="card text-sm text-neutral-700">Le calendrier est en attente de nouvelles rencontres.</p>
        )}

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wide text-neutral-500">Calendrier 2026/2027</h2>
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
                    list.map((m) => renderMatch(m))
                  ),
              };
            })}
          />
        </section>
      </div>
    </AccordionGroup>
  );
}
