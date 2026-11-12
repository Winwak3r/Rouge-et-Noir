import { simulateLiveAction, stopLiveSimulationAction } from "@/app/actions/admin";
import { LIVE_SIM_KEY, getSetting } from "@/lib/sync/sync";
import Link from "next/link";
import { Prisma } from "@prisma/client";
import { cancelSimulationAction, simulateMatchAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { prisma } from "@/lib/db";
import { COMPETITIONS } from "@/lib/competitions";
import { formatDateTime } from "@/lib/dates";
import { PageTitle } from "@/components/PageTitle";

export default async function SimulationPage({ searchParams }: { searchParams: Promise<{ match?: string }> }) {
  const q = await searchParams;
  const now = new Date();
  const matches = await prisma.match.findMany({
    where: { OR: [{ status: { in: ["SCHEDULED", "POSTPONED"] }, kickoffAt: { gt: now } }, { NOT: { simulation: { equals: Prisma.AnyNull } } }] },
    orderBy: { kickoffAt: "asc" },
    include: { homeTeam: true, awayTeam: true, _count: { select: { predictions: true } } },
    take: 12,
  });
  const match = matches.find((m) => m.id === q.match) ?? matches.find((m) => m.simulation) ?? matches[0] ?? null;
  const result = match?.simulation
    ? await prisma.match.findUnique({ where: { id: match.id }, include: { goals: true } })
    : null;

  // Simulation EN DIRECT (affichage) : match en cours de simulation, et matchs à venir proposés
  const liveSim = await getSetting<{ matchId: string }>(LIVE_SIM_KEY);
  const liveMatch = liveSim
    ? await prisma.match.findUnique({ where: { id: liveSim.matchId }, include: { homeTeam: true, awayTeam: true } })
    : null;
  const liveChoices = matches.filter((m) => !m.simulation);

  return (
    <div className="space-y-6">
      <PageTitle className="page-title">Simulation de match (test)</PageTitle>

      <section className="card space-y-3">
        <h2 className="text-lg font-semibold">Match en direct (affichage)</h2>
        <p className="text-sm text-neutral-600">
          Passe un match à venir « en direct », avec le score et la minute de ton choix, pour vérifier l’affichage (en-têtes, barre épinglée,
          bandeaux). Aucun point n’est calculé. Le match est ignoré par la synchronisation tant que la simulation dure ; « Arrêter » lui
          rend son état d’origine.
        </p>
        {liveMatch && (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-rouge/10 px-3 py-2 text-sm">
            <span>
              <strong className="text-rouge">● En direct (simulé)</strong> {liveMatch.homeTeam.name} {liveMatch.liveHomeScore ?? 0} – {liveMatch.liveAwayScore ?? 0}{" "}
              {liveMatch.awayTeam.name} · {liveMatch.liveMinute ?? 0}’
            </span>
            <form action={stopLiveSimulationAction}>
              <button className="btn-secondary px-3 py-1 text-sm">Arrêter la simulation</button>
            </form>
          </div>
        )}
        <form action={simulateLiveAction} className="flex flex-wrap items-end gap-2 text-sm">
          <label className="min-w-[14rem] flex-1">
            <span className="mb-1 block text-xs font-semibold text-neutral-500">Match</span>
            <select name="matchId" defaultValue={liveMatch?.id ?? liveChoices[0]?.id} className="input">
              {liveMatch && !liveChoices.some((m) => m.id === liveMatch.id) && (
                <option value={liveMatch.id}>
                  {liveMatch.homeTeam.name} – {liveMatch.awayTeam.name}
                </option>
              )}
              {liveChoices.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.homeTeam.name} – {m.awayTeam.name}
                </option>
              ))}
            </select>
          </label>
          <label className="w-20">
            <span className="mb-1 block text-xs font-semibold text-neutral-500">Dom.</span>
            <input name="home" type="number" min={0} max={20} defaultValue={liveMatch?.liveHomeScore ?? 1} className="input" />
          </label>
          <label className="w-20">
            <span className="mb-1 block text-xs font-semibold text-neutral-500">Ext.</span>
            <input name="away" type="number" min={0} max={20} defaultValue={liveMatch?.liveAwayScore ?? 0} className="input" />
          </label>
          <label className="w-24">
            <span className="mb-1 block text-xs font-semibold text-neutral-500">Minute</span>
            <input name="minute" type="number" min={0} max={130} defaultValue={liveMatch?.liveMinute ?? 34} className="input" />
          </label>
          <button className="btn-primary">{liveMatch ? "Mettre à jour" : "Passer en direct"}</button>
        </form>
      </section>
      <div className="space-y-2 rounded-lg border border-orange-300 bg-orange-100 p-3 text-sm text-orange-800">
        <p>
          <strong>À lire avant de simuler.</strong> La simulation donne un résultat fictif à un match pas encore joué (score
          choisi ou tiré au sort, buteurs rennais tirés parmi les joueurs qui ont une cote), puis calcule les points de tous les
          joueurs comme pour un vrai match.
        </p>
        <ul className="list-disc space-y-1 pl-5 text-xs">
          <li>Pendant la simulation, la saisie des pronostics de ce match est fermée et un bandeau « mode test » s’affiche pour tous. Préviens les joueurs.</li>
          <li>Pour un test utile, saisis d’abord des pronostics sur ce match (avec un deuxième compte de test).</li>
          <li>« Annuler la simulation » supprime le résultat et les points fictifs et rouvre les pronostics. Les vrais résultats ne sont jamais touchés, et la synchro ignore le match pendant le test.</li>
        </ul>
      </div>

      <nav className="flex flex-wrap gap-2" aria-label="Choix du match">
        {matches.map((m) => (
          <Link
            key={m.id}
            href={`/admin/simulation?match=${m.id}`}
            className={m.id === match?.id ? "btn-primary px-3 py-1.5" : "btn-secondary px-3 py-1.5"}
          >
            {m.homeTeam.shortName ?? m.homeTeam.name} – {m.awayTeam.shortName ?? m.awayTeam.name}
            {m.simulation ? " ⚠️" : ""}
          </Link>
        ))}
        {matches.length === 0 && <span className="text-sm text-neutral-500">Aucun match à venir : lance d’abord la synchronisation.</span>}
      </nav>

      {match && (
        <section className="card space-y-4">
          <div>
            <p className={`text-xs font-bold uppercase ${COMPETITIONS[match.competition].textClass}`}>{COMPETITIONS[match.competition].label}</p>
            <h2 className="text-lg font-semibold">
              {match.homeTeam.name} – {match.awayTeam.name}
            </h2>
            <p className="text-sm text-neutral-600">
              {formatDateTime(match.kickoffAt)} · {match._count.predictions} pronostic(s)
            </p>
          </div>

          {match.simulation && result ? (
            <>
              <p className="text-sm">
                Résultat simulé : <strong className="font-display text-xl">{result.regHomeScore} - {result.regAwayScore}</strong>
                {result.goals.filter((g) => g.forRennes).length > 0 && (
                  <span className="ml-2 text-neutral-600">
                    (buteurs rennais : {result.goals.filter((g) => g.forRennes).map((g) => g.scorerName).join(", ")})
                  </span>
                )}
              </p>
              <ActionForm
                action={cancelSimulationAction}
                submits={[{ label: "Annuler la simulation", confirm: "Annuler la simulation ? Le résultat et les points fictifs seront supprimés." }]}
              >
                <input type="hidden" name="matchId" value={match.id} />
              </ActionForm>
            </>
          ) : (
            <ActionForm
              action={simulateMatchAction}
              submits={[{ label: "Simuler le match", confirm: "Simuler ce match ? La saisie des pronostics sera fermée jusqu’à l’annulation." }]}
            >
              <input type="hidden" name="matchId" value={match.id} />
              <div className="flex flex-wrap items-end gap-3">
                <label className="text-sm">
                  <span className="label">Buts de {match.homeTeam.name}</span>
                  <input name={match.rennesIsHome ? "rennes" : "opponent"} inputMode="numeric" placeholder="au hasard" className="input w-28" />
                </label>
                <label className="text-sm">
                  <span className="label">Buts de {match.awayTeam.name}</span>
                  <input name={match.rennesIsHome ? "opponent" : "rennes"} inputMode="numeric" placeholder="au hasard" className="input w-28" />
                </label>
              </div>
            </ActionForm>
          )}
        </section>
      )}
    </div>
  );
}
