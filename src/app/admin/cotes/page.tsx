import Link from "next/link";
import { setOddsAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { prisma } from "@/lib/db";
import { formatDateTime, formatStamp } from "@/lib/dates";
import { getActiveRules } from "@/lib/scoring/active-rules";
import { canEditPrediction, oddsToBonus } from "@/lib/scoring/engine";

export default async function OddsAdminPage({ searchParams }: { searchParams: Promise<{ match?: string }> }) {
  const now = new Date();
  const sp = await searchParams;
  const open = (
    await prisma.match.findMany({
      where: { status: { in: ["SCHEDULED", "POSTPONED"] } },
      orderBy: { kickoffAt: "asc" },
      include: { homeTeam: true, awayTeam: true },
      take: 8,
    })
  ).filter((m) => canEditPrediction(m, now));
  const match = open.find((m) => m.id === sp.match) ?? open[0];
  const [players, odds, rules] = await Promise.all([
    prisma.player.findMany({ where: { isActive: true }, orderBy: [{ position: "desc" }, { name: "asc" }] }),
    match ? prisma.playerOdds.findMany({ where: { matchId: match.id } }) : [],
    getActiveRules(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Cotes des buteurs</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Les cotes Bet365 sont récupérées automatiquement environ 48 h avant chaque match. Tu peux saisir ou corriger une cote
          (par exemple pour un joueur sans cote) : elle n’est plus remplacée par la synchro. Toutes les cotes sont figées au
          verrouillage du match.
        </p>
      </div>

      {open.length === 0 ? (
        <p className="card text-sm text-neutral-600">Aucun match ouvert aux pronostics.</p>
      ) : (
        <>
          <nav className="flex flex-wrap gap-2" aria-label="Choix du match">
            {open.map((m) => (
              <Link
                key={m.id}
                href={`/admin/cotes?match=${m.id}`}
                aria-current={m.id === match!.id ? "page" : undefined}
                className={m.id === match!.id ? "btn-primary px-3 py-1.5" : "btn-secondary px-3 py-1.5"}
              >
                {m.homeTeam.shortName ?? m.homeTeam.name} – {m.awayTeam.shortName ?? m.awayTeam.name}
              </Link>
            ))}
          </nav>
          <p className="text-sm text-neutral-600">
            {match!.homeTeam.name} – {match!.awayTeam.name} · {formatDateTime(match!.kickoffAt)}
          </p>
          <div className="divide-y divide-neutral-100 overflow-hidden rounded-xl border border-neutral-200 bg-surface shadow-sm">
            {players.map((p) => {
              const o = odds.find((x) => x.playerId === p.id);
              const value = o ? Number(o.odds) : null;
              return (
                <div key={p.id} className="flex flex-wrap items-center gap-3 px-3 py-2 text-sm">
                  <span className="min-w-40 flex-1 font-medium">{p.name}</span>
                  <span className="w-40 text-xs text-neutral-500">
                    {o ? `${o.source === "ADMIN" ? "Saisie admin" : (o.bookmaker ?? "Fournisseur")} · ${formatStamp(o.fetchedAt)}` : "Aucune cote"}
                  </span>
                  <span className="w-16 text-right text-xs text-neutral-600">{value ? `+${oddsToBonus(value, rules)} pt(s)` : ""}</span>
                  <ActionForm action={setOddsAction} className="flex items-center gap-2" submits={[{ label: "OK", primary: false }]}>
                    <input type="hidden" name="matchId" value={match!.id} />
                    <input type="hidden" name="playerId" value={p.id} />
                    <input
                      name="odds"
                      inputMode="decimal"
                      defaultValue={value ? value.toLocaleString("fr-FR", { minimumFractionDigits: 2 }) : ""}
                      placeholder="ex. 3,75"
                      aria-label={`Cote de ${p.name}`}
                      className="input w-24 py-1 text-right"
                    />
                  </ActionForm>
                </div>
              );
            })}
          </div>
          <p className="text-xs text-neutral-500">Vider le champ puis « OK » retire une cote saisie à la main.</p>
        </>
      )}
    </div>
  );
}
