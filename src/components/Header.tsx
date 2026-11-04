import Link from "next/link";
import { logoutAction } from "@/app/actions/auth";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { formatStamp } from "@/lib/dates";
import { ordinalFr } from "@/lib/match-view";
import { buildStandings } from "@/lib/scoring/ranking";
import { Logo } from "./Logo";
import { ThemeSwitch } from "./ThemeSwitch";
import { LeagueSwitcher } from "./LeagueSwitcher";
import { BottomNav } from "./BottomNav";
import { Avatar } from "./Avatar";
import { CompetitionBadge } from "./CompetitionBadge";
import { LeagueWelcome } from "./LeagueWelcome";
import { Tutorial } from "./Tutorial";
import { NotifPrompt } from "./NotifPrompt";
import { getActiveRules } from "@/lib/scoring/active-rules";
import { cookies } from "next/headers";
import { WELCOME_COOKIE } from "@/lib/league-rules";
import { getLeagueLogos } from "@/lib/league-logos";
import { VerifyEmailBanner } from "./AccountForms";
import { LeagueOnboarding } from "./LeagueForms";
import { activeLeagueScope, generalPlayers, scopeResultFilter } from "@/lib/leagues";

export async function Header() {
  const user = await getCurrentUser();
  // Classement de la ligue affichée (sinon de tous les joueurs)
  const scope = user ? await activeLeagueScope(user) : null;
  // Sans ligue : « Général », c'est-à-dire tous les joueurs inscrits dans au moins une ligue
  const ids = user ? (scope?.memberIds ?? (await generalPlayers())) : null;
  const [leagueInfo, standings, lastSync] = await Promise.all([
    user
      ? Promise.all([
          prisma.leagueMember.count({ where: { userId: user.id } }),
          prisma.leagueMember.count({ where: { userId: user.id } }),
          prisma.leagueMember.count({ where: { userId: user.id, role: "ADMIN", isActive: true } }),
        ])
      : Promise.resolve([0, 0, 0] as const),
    user
      ? Promise.all([
          prisma.user.findMany({
            where: { isActive: true, id: { in: [...(ids ?? [])] } },
            select: { id: true, pseudo: true },
          }),
          prisma.predictionResult.findMany({
            where: { user: { isActive: true }, userId: { in: [...(ids ?? [])] }, ...scopeResultFilter(scope) },
            select: { userId: true, category: true, totalPoints: true, correctScorer: true },
          }),
        ]).then(([users, rows]) => buildStandings(users.map((u) => ({ userId: u.id, pseudo: u.pseudo })), rows))
      : Promise.resolve(null),
    prisma.syncLog.findFirst({ where: { status: { not: "FAILED" } }, orderBy: { startedAt: "desc" } }),
  ]);
  const rennes = await prisma.team.findUnique({
    where: { externalId: Number(process.env.ESPN_TEAM_ID ?? 169) },
    select: { logoUrl: true },
  });
  const [membershipCount, createdCount, adminCount] = leagueInfo;
  // Ligue tout juste rejointe : fenêtre de bienvenue
  const welcomeId = user ? (await cookies()).get(WELCOME_COOKIE)?.value : undefined;
  const welcomeLeague = welcomeId
    ? await prisma.league.findFirst({
        where: { id: welcomeId, members: { some: { userId: user!.id } } },
        include: { _count: { select: { members: { where: { isActive: true } } } } },
      })
    : null;
  const logos = user ? await getLeagueLogos() : {};
  // Compétitions jouées dans la ligue affichée (toutes pour « Général »)
  const leagueComps = (scope?.competitions ?? ["LIGUE_1", "EUROPA_LEAGUE", "COUPE_DE_FRANCE"]) as ("LIGUE_1" | "EUROPA_LEAGUE" | "COUPE_DE_FRANCE")[];
  const myActiveLeagues = user
    ? await prisma.leagueMember.findMany({
        where: { userId: user.id, isActive: true },
        orderBy: { joinedAt: "asc" },
        select: { league: { select: { id: true, name: true, imageUpdatedAt: true } } },
      })
    : [];
  const me = standings?.find((s) => s.userId === user?.id) ?? null;
  const rankText = me && me.scoredMatches > 0 ? ordinalFr(me.rank) : "—";

  return (
    <header className="sticky top-0 z-30 border-b border-neutral-200 bg-[var(--header-bg)]">
      {user && !user.emailVerifiedAt && <VerifyEmailBanner email={user.email} />}
      {/* Première connexion (ou aucune ligue) : rejoindre ou créer une ligue */}
      {user && membershipCount === 0 && <LeagueOnboarding canCreate logos={logos} />}
      {/* Didacticiel : une fois, quand le joueur a sa première ligue (après la fenêtre de bienvenue s'il y en a une) */}
      {/* Après la première ligue : 1) bienvenue dans la ligue, 2) proposition des notifications, 3) didacticiel */}
      {user && !user.notifPromptAt && membershipCount > 0 && (
        <NotifPrompt publicKey={process.env.VAPID_PUBLIC_KEY?.trim() || null} waitForEvent={welcomeLeague ? "league-welcome-closed" : undefined} />
      )}
      {user && !user.tutorialDoneAt && membershipCount > 0 && (
        <Tutorial
          waitForEvent={!user.notifPromptAt ? "notif-prompt-closed" : welcomeLeague ? "league-welcome-closed" : undefined}
          points={(await getActiveRules()).points}
        />
      )}
      {welcomeLeague && (
        <LeagueWelcome
          logos={logos}
          league={{
            id: welcomeLeague.id,
            name: welcomeLeague.name,
            description: welcomeLeague.description,
            imageAt: welcomeLeague.imageUpdatedAt?.getTime() ?? null,
            players: welcomeLeague._count.members,
            competitions: welcomeLeague.competitions,
          }}
        />
      )}
      <div className="mx-auto max-w-5xl px-3 py-2 sm:px-4 sm:py-3">
        {/* Compte à gauche, logo au centre, Règles et Classement à droite (mobile et ordinateur) */}
        <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-x-2 sm:gap-x-4">
          <div className="col-start-1 row-start-1 flex items-center gap-1 justify-self-start sm:gap-2">
            {user && (
              <Link href="/regles" aria-label="Règles" data-tour="rules" className="hbtn sm:hidden">
                <span className="hicon">
                <svg aria-hidden viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </span>
                Règles
              </Link>
            )}
            {user ? (
              // Ordinateur : « Mon compte » (rouge, avec la photo) puis « Ligues »
              <div className="hidden items-center gap-2 sm:flex">
                <Link href="/compte" data-tour="user-menu" className="hbtn-pseudo">
                  <Avatar userId={user.id} pseudo={user.pseudo} at={user.avatarUpdatedAt?.getTime() ?? null} size={22} className="ring-white/60" />
                  Mon compte
                </Link>
                <Link href="/ligues" data-tour="leagues" className="hbtn">
                  <span className="hicon">
                  <svg aria-hidden viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
                  </svg>
                  </span>
                  Ligues
                </Link>
                {user.role === "ADMIN" && (
                  <Link href="/admin" className="hbtn">
                    Admin
                  </Link>
                )}
              </div>
            ) : (
              <>
                <Link href="/connexion" className="hbtn">
                  Connexion
                </Link>
                <Link href="/inscription" className="hbtn">
                  <span className="sm:hidden">S’inscrire</span>
                  <span className="hidden sm:inline">Créer un compte</span>
                </Link>
              </>
            )}
            <ThemeSwitch className="hidden sm:inline-flex" />
          </div>
          <Link href="/" aria-label="Rouge & Noir — accueil" className="col-start-2 row-start-1 justify-self-center rounded focus-visible:outline-2 focus-visible:outline-noir">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-clair.png" alt="Rouge & Noir" width={860} height={160} className="logo-clair h-[22px] w-auto min-[400px]:h-7 sm:h-10" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-sombre.png" alt="Rouge & Noir" width={858} height={160} className="logo-sombre h-[22px] w-auto min-[400px]:h-7 sm:h-10" />
          </Link>
          <div className="col-start-3 row-span-2 row-start-1 flex min-w-0 flex-col items-end gap-1 justify-self-end">
            <nav className="flex items-center gap-1 sm:gap-2" aria-label="Navigation principale">
            <Link href="/regles" aria-label="Règles" data-tour="rules" className={`hbtn ${user ? "max-sm:hidden" : ""}`}>
              <span className="hicon">
                <svg aria-hidden viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                  <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                </svg>
              </span>
              <span className="max-[359px]:hidden">Règles</span>
            </Link>
            <Link href="/classements-srfc" aria-label="Classements officiels du Stade Rennais" data-tour="standings" className="hbtn">
              <span className="hicon bg-white">
                {rennes?.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rennes.logoUrl} alt="" width={16} height={16} className="h-[72%] w-[72%] object-contain" />
                ) : (
                  <Logo className="h-[72%] w-[72%]" />
                )}
              </span>
              {/* Sur mobile : blason + podium, pour ne pas déborder */}
              <svg aria-hidden className="sm:hidden" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                <rect x="9" y="6" width="6" height="15" rx="1" />
                <rect x="2" y="11" width="6" height="10" rx="1" />
                <rect x="16" y="14" width="6" height="7" rx="1" />
              </svg>
              <span className="hidden sm:inline">Classements</span>
            </Link>
          </nav>
            <span className="text-right text-[10px] leading-tight text-neutral-500 sm:text-xs">
              Dernière synchro : {lastSync ? formatStamp(lastSync.finishedAt ?? lastSync.startedAt) : "jamais"}
            </span>
            {/* Mobile : interrupteur du thème sous la dernière synchro, tout à droite */}
            <ThemeSwitch className="inline-flex sm:hidden" />
          </div>
          {/* Sous le pseudo : choix de la ligue (ordinateur) et classement de la ligue (toute la largeur sur mobile) */}
          <div className="col-span-2 col-start-1 row-start-2 mt-1.5 flex min-w-0 items-stretch gap-2">
            {user && myActiveLeagues.length > 0 && (
              <LeagueSwitcher
                className="max-sm:hidden"
                leagues={[
                  ...myActiveLeagues.map((m) => ({ id: m.league.id, name: m.league.name, imageAt: m.league.imageUpdatedAt?.getTime() ?? null })),
                  { id: "general", name: "Général R&N", imageAt: null },
                ]}
                activeId={scope?.leagueId ?? null}
              />
            )}
          {user && (
            <div className="flex min-w-0 flex-1 gap-2.5 sm:flex-none sm:shrink-0">
              <Link
                href="/classement"
                data-tour="rank"
                title="Voir le classement de la ligue"
                className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-[10px] border border-neutral-200 bg-neutral-50 px-3.5 py-1.5 transition-colors max-sm:pointer-events-none sm:flex-none sm:hover:border-neutral-400"
              >
                {/* Nom de la ligue mis en avant */}
                <span className="flex min-w-0 items-center gap-2">
                  <span className="truncate text-sm font-extrabold leading-tight text-neutral-900 sm:max-w-[11rem]">
                    {scope ? scope.name : "Général"}
                  </span>
                  <span aria-hidden className="hidden text-neutral-400 sm:inline">›</span>
                </span>
                {/* Rang et points, compétitions de la ligue calées à droite */}
                <span className="flex items-center gap-2">
                  <span className="whitespace-nowrap text-lg font-extrabold leading-tight">
                    {rankText}
                    {standings && <span className="ml-1.5 text-xs font-semibold text-neutral-500">sur {standings.length}</span>}
                    <span className="mx-1.5 text-neutral-400">·</span>
                    <span className="pts-points">{me?.totalPoints ?? 0}</span>
                    <span className="ml-1 text-xs font-semibold text-neutral-500">pts</span>
                  </span>
                  <span className="ml-auto flex shrink-0 items-center gap-1" aria-label={`Compétitions : ${leagueComps.join(", ")}`}>
                    {leagueComps.map((c) => (
                      <CompetitionBadge key={c} code={c} logo={logos[c]} className="!h-5 !w-5 !text-[8px]" />
                    ))}
                  </span>
                </span>
              </Link>
            </div>
          )}
          </div>
        </div>
      </div>
      {user && (
        <BottomNav
          user={{ id: user.id, pseudo: user.pseudo, avatarAt: user.avatarUpdatedAt?.getTime() ?? null }}
          activeLeagueId={scope?.leagueId ?? null}
          leagues={
            myActiveLeagues.length
              ? [
                  ...myActiveLeagues.map((m) => ({ id: m.league.id, name: m.league.name, imageAt: m.league.imageUpdatedAt?.getTime() ?? null })),
                  { id: "general", name: "Général R&N", imageAt: null },
                ]
              : []
          }
        />
      )}
    </header>
  );
}
