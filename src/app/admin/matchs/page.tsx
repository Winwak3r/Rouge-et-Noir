import { rescoreMatchAction, setDeadlineAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { prisma } from "@/lib/db";
import { COMPETITIONS } from "@/lib/competitions";
import { formatDateTime, formatShortDate, formatTime, toParisLocalInput } from "@/lib/dates";
import { PHASE, matchPhase } from "@/lib/match-view";

export default async function MatchesAdminPage() {
  const now = new Date();
  const matches = await prisma.match.findMany({
    orderBy: { kickoffAt: "asc" },
    include: { homeTeam: true, awayTeam: true, _count: { select: { predictions: true } } },
  });
  const upcoming = matches.filter((m) => m.kickoffAt > now && m.status !== "CANCELLED");
  const past = matches.filter((m) => !upcoming.includes(m));

  return (
    <div className="space-y-10">
      <div>
        <h1 className="page-title">Matchs et dates limites</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Par défaut, les pronostics ferment au coup d’envoi. Tu peux les fermer plus tôt (jamais plus tard). Si le match est
          reporté par la synchro, la date limite est automatiquement retirée. Chaque changement est journalisé.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">À venir</h2>
        {upcoming.length === 0 && <p className="card text-sm text-neutral-600">Aucun match à venir.</p>}
        {upcoming.map((m) => (
          <div key={m.id} className="card space-y-3 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">
                <span className={`mr-2 text-xs font-bold uppercase ${COMPETITIONS[m.competition].textClass}`}>{COMPETITIONS[m.competition].label}</span>
                {m.homeTeam.name} – {m.awayTeam.name}
              </p>
              <p className="text-sm text-neutral-600">
                Coup d’envoi : {formatDateTime(m.kickoffAt)} · {m._count.predictions} prono(s)
              </p>
            </div>
            <ActionForm
              action={setDeadlineAction}
              className="flex flex-wrap items-end gap-3"
              submits={[
                { label: "Enregistrer la date limite", value: "set" },
                ...(m.deadlineAt ? [{ label: "Retirer (clôture au coup d’envoi)", value: "clear", primary: false }] : []),
              ]}
            >
              <input type="hidden" name="matchId" value={m.id} />
              <label className="text-sm">
                <span className="label">Clôture des pronostics (heure de Paris)</span>
                <input
                  type="datetime-local"
                  name="deadline"
                  defaultValue={toParisLocalInput(m.deadlineAt ?? m.kickoffAt)}
                  max={toParisLocalInput(m.kickoffAt)}
                  className="input"
                />
              </label>
              <label className="min-w-48 flex-1 text-sm">
                <span className="label">Motif (facultatif)</span>
                <input name="reason" maxLength={200} className="input" placeholder="Ex. horaire avancé par la LFP" />
              </label>
            </ActionForm>
            {m.deadlineAt && <p className="text-xs font-medium text-orange-700">Clôture anticipée : {formatDateTime(m.deadlineAt)}</p>}
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Joués</h2>
        <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-surface shadow-sm">
          <table className="w-full min-w-[680px] text-sm">
            <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
              <tr>
                <th scope="col" className="px-3 py-2">Date</th>
                <th scope="col" className="px-3 py-2">Match</th>
                <th scope="col" className="px-3 py-2">Statut</th>
                <th scope="col" className="px-3 py-2 text-right">Pronos</th>
                <th scope="col" className="px-3 py-2 text-right">Points</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {past.map((m) => {
                const score = m.regHomeScore !== null ? `${m.aetHomeScore ?? m.regHomeScore}-${m.aetAwayScore ?? m.regAwayScore}` : "–";
                return (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap px-3 py-2">{formatShortDate(m.kickoffAt)} {formatTime(m.kickoffAt)}</td>
                    <td className="px-3 py-2">
                      <span className={`mr-1 text-xs font-bold ${COMPETITIONS[m.competition].textClass}`}>{m.competition === "LIGUE_1" ? `J${m.matchday ?? "?"}` : m.stage}</span>
                      {m.homeTeam.name} {score} {m.awayTeam.name}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{PHASE[matchPhase(m, now)].label}</td>
                    <td className="px-3 py-2 text-right">{m._count.predictions}</td>
                    <td className="px-3 py-2 text-right">
                      {m.resultConfirmedAt ? (
                        <form action={rescoreMatchAction}>
                          <input type="hidden" name="matchId" value={m.id} />
                          <button type="submit" className="btn-secondary px-2 py-1 text-xs">Recalculer</button>
                        </form>
                      ) : (
                        "–"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
