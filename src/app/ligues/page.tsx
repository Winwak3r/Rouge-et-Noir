import type { Metadata } from "next";
import Link from "next/link";
import { setDefaultLeagueAction } from "@/app/actions/leagues";
import { LeagueAvatar } from "@/components/LeagueAvatar";
import { CompetitionBadge } from "@/components/CompetitionBadge";
import { COMPETITIONS } from "@/lib/competitions";
import { CreateLeagueForm, JoinLeagueForm, LeaveLeagueForm } from "@/components/LeagueForms";
import { requireUser } from "@/lib/auth/session";
import { myLeagues } from "@/lib/leagues";
import { getLeagueLogos } from "@/lib/league-logos";
import { MAX_LEAGUES, canJoinAnother } from "@/lib/league-rules";

export const metadata: Metadata = { title: "Ligues" };
export const dynamic = "force-dynamic";

export default async function MyLeaguesPage({ searchParams }: { searchParams: Promise<{ rejoint?: string; invitation?: string }> }) {
  const user = await requireUser();
  const q = await searchParams;
  const [leagues, logos] = await Promise.all([myLeagues(user.id), getLeagueLogos()]);
  const canAdd = canJoinAnother(leagues.length);

  return (
    <div className="space-y-6">
      <h1 className="page-title">Ligues</h1>
      <h2 className="font-display text-xl font-bold uppercase tracking-wide">Mes ligues</h2>
      <p className="text-sm text-neutral-600">La ligue « Par défaut » est celle affichée à chaque connexion. Tu peux en consulter une autre à tout moment avec la liste de l’en-tête.</p>
      {q.rejoint && <p className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800">Bienvenue dans la ligue « {q.rejoint} » !</p>}
      {q.invitation === "invalide" && <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">Ce lien d’invitation n’est plus valable. Demande un nouveau lien à l’administrateur de la ligue.</p>}
      {q.invitation === "suspendu" && <p className="rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">Ton accès à cette ligue a été suspendu par son administrateur.</p>}

      {leagues.length === 0 ? (
        <p className="card text-sm text-neutral-600">Tu n’es dans aucune ligue pour l’instant.</p>
      ) : (
        <ul className="space-y-2">
          {leagues.map((m) => {
            const active = (user.activeLeagueId ?? leagues.find((x) => x.isActive)?.leagueId) === m.leagueId;
            return (
              <li key={m.leagueId} className={`card space-y-3 p-4 sm:flex sm:items-center sm:gap-3 sm:space-y-0 ${active ? "ring-2 ring-rouge" : ""}`}>
                {/* Ligne 1 : logo et nom */}
                <div className="flex min-w-0 items-center gap-3 sm:flex-1">
                  <LeagueAvatar leagueId={m.leagueId} name={m.league.name} at={m.league.imageUpdatedAt?.getTime() ?? null} size={44} />
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{m.league.name}</p>
                    {m.league.description && <p className="truncate text-xs italic text-neutral-600">{m.league.description}</p>}
                    {/* Ligne 2 : joueurs et rôle */}
                    <p className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-neutral-500">
                      <span>
                        {m.league._count.members} joueur{m.league._count.members > 1 ? "s" : ""}
                        {m.role === "ADMIN" && " · Administrateur"}
                        {!m.isActive && " · accès suspendu"}
                      </span>
                      {/* Compétitions jouées dans la ligue */}
                      <span className="inline-flex items-center gap-1" aria-label={`Compétitions : ${m.league.competitions.map((c) => COMPETITIONS[c].label).join(", ")}`}>
                        {m.league.competitions.map((c) => (
                          <span key={c} title={COMPETITIONS[c].label}>
                            <CompetitionBadge code={c} logo={logos[c]} />
                          </span>
                        ))}
                      </span>
                    </p>
                  </div>
                </div>
                {/* Ligne 3 : les boutons */}
                <div className="flex flex-wrap items-center gap-2">
                  {active ? (
                    <span className="rounded bg-rouge px-2 py-0.5 text-xs font-semibold text-white" title="Ligue affichée à chaque connexion">
                      Par défaut
                    </span>
                  ) : (
                    m.isActive && (
                      <form action={setDefaultLeagueAction}>
                        <input type="hidden" name="leagueId" value={m.leagueId} />
                        <button className="btn-secondary px-3 py-1 text-xs">Définir par défaut</button>
                      </form>
                    )
                  )}
                  {m.role === "ADMIN" && m.isActive && (
                    <Link href={`/ligue?id=${m.leagueId}`} className="btn-secondary px-3 py-1 text-xs">
                      Gérer
                    </Link>
                  )}
                  <LeaveLeagueForm leagueId={m.leagueId} name={m.league.name} />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {!canAdd && (
        <p className="rounded-lg bg-neutral-100 px-3 py-2 text-sm text-neutral-700">
          Tu participes à {MAX_LEAGUES} ligues, le maximum : quittes-en une pour en rejoindre ou en créer une autre.
        </p>
      )}

      {canAdd && (
        <section className="card max-w-md space-y-2">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Rejoindre une ligue</h2>
          <JoinLeagueForm />
        </section>
      )}

      {canAdd && (
        <section id="creer" className="card max-w-md scroll-mt-40 space-y-2">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Créer une ligue</h2>
          <CreateLeagueForm logos={logos} />
        </section>
      )}
    </div>
  );
}
