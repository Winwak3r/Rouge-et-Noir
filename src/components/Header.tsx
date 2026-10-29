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
import { LeagueWelcome } from "./LeagueWelcome";
import { Tutorial } from "./Tutorial";
import { getActiveRules } from "@/lib/scoring/active-rules";
import { cookies } from "next/headers";
import { WELCOME_COOKIE } from "@/lib/league-rules";
import { getLeagueLogos } from "@/lib/league-logos";
import { VerifyEmailBanner } from "./AccountForms";
import { UserMenu } from "./UserMenu";
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
  const logos = user && (welcomeLeague || membershipCount === 0) ? await getLeagueLogos() : {};
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
      {user && !user.tutorialDoneAt && membershipCount > 0 && <Tutorial waitForEvent={welcomeLeague ? "league-welcome-closed" : undefined} points={(await getActiveRules()).points} />}
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
            {user ? (
              <UserMenu
                userId={user.id}
                avatarAt={user.avatarUpdatedAt?.getTime() ?? null}
                pseudo={user.pseudo}
                isAdmin={user.role === "ADMIN"}
                canCreateLeague={createdCount < 3}
                isLeagueAdmin={adminCount > 0}
                logoutAction={logoutAction}
              />
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
            <Link href="/regles" aria-label="Règles" data-tour="rules" className="hbtn">
              <span className="max-[359px]:hidden">Règles</span>
              <svg aria-hidden className="hidden max-[359px]:block" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </Link>
            <Link href="/classements-srfc" aria-label="Classements" data-tour="standings" className="hbtn">
              {rennes?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={rennes.logoUrl} alt="" width={18} height={18} className="h-[18px] w-[18px] object-contain" />
              ) : (
                <Logo className="h-[18px] w-[18px]" />
              )}
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
          {/* Sous le pseudo : classement / points de la ligue, choix de la ligue, (mobile) thème */}
          <div className="col-span-2 col-start-1 row-start-2 mt-1.5 flex min-w-0 items-center gap-2">
            {user && myActiveLeagues.length > 0 && (
              <LeagueSwitcher
                leagues={[
                  ...myActiveLeagues.map((m) => ({ id: m.league.id, name: m.league.name, imageAt: m.league.imageUpdatedAt?.getTime() ?? null })),
                  { id: "general", name: "Général R&N", imageAt: null },
                ]}
                activeId={scope?.leagueId ?? null}
              />
            )}
          {user && (
            <div className="flex min-w-0 shrink gap-2.5">
              <Link
                href="/classement"
                data-tour="rank"
                title="Voir le classement général des pronostics"
                className="flex min-w-0 flex-1 flex-col gap-px rounded-[10px] border border-neutral-200 bg-neutral-50 px-3.5 py-1.5 transition-colors hover:border-neutral-400 sm:flex-none"
              >
                <span className="max-w-[9rem] truncate text-[10px] font-bold uppercase tracking-[0.08em] text-neutral-500">
                  {scope ? scope.name : "Général"} ›
                </span>
                <span className="text-lg font-extrabold leading-tight">
                  {rankText}
                  {standings && <span className="ml-1.5 text-xs font-semibold text-neutral-500">sur {standings.length}</span>}
                  <span className="mx-1.5 text-neutral-400">·</span>
                  <span className="text-green-700">{me?.totalPoints ?? 0}</span>
                  <span className="ml-1 text-xs font-semibold text-neutral-500">pts</span>
                </span>
              </Link>
            </div>
          )}
          </div>
        </div>
      </div>
    </header>
  );
}
