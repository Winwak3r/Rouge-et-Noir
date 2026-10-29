import type { Metadata } from "next";
import { getActiveRules } from "@/lib/scoring/active-rules";
import { oddsToBonus } from "@/lib/scoring/engine";

export const metadata: Metadata = { title: "Règles du jeu" };
export const dynamic = "force-dynamic";

const pts = (n: number) => `${n > 0 ? "+" : ""}${n} point${Math.abs(n) > 1 ? "s" : ""}`;

export default async function RulesPage() {
  const r = await getActiveRules();
  const rows = [
    ["Score exact", r.points.exact],
    ["Bon résultat et bon écart de buts", r.points.goalDiff],
    ["Bon résultat, mauvais écart", r.points.outcome],
    ["Mauvais résultat", r.points.wrong],
    ["Aucun pronostic avant le coup d’envoi", r.points.missing],
  ] as const;

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="page-title">Règles du jeu</h1>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Le score</h2>
        <p className="text-sm text-neutral-700">
          Pour chaque match du Stade Rennais, pronostique le nombre de buts de Rennes et de l’adversaire.
          Les catégories ne se cumulent pas : un score exact rapporte {r.points.exact} points au total.
        </p>
        <table className="w-full text-sm">
          <tbody className="divide-y divide-neutral-100">
            {rows.map(([label, n]) => (
              <tr key={label}>
                <td className="py-2">{label}</td>
                <td className="py-2 text-right font-semibold">{pts(n)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-neutral-600">
          Matchs à élimination directe : on retient le score{" "}
          {r.knockoutScoreBasis === "AFTER_EXTRA_TIME" ? "après prolongation" : "à la fin du temps réglementaire"}.
          Les tirs au but ne comptent jamais.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Le buteur rennais (facultatif)</h2>
        <p className="text-sm text-neutral-700">
          Choisis un joueur rennais. S’il marque, tu gagnes un bonus égal à sa cote « buteur » divisée par{" "}
          {r.scorerBonus.oddsDivisor}, arrondie à l’entier le plus proche (minimum {pts(r.scorerBonus.minBonus)}, maximum{" "}
          {pts(r.scorerBonus.maxBonus)}).
          La cote est figée au coup d’envoi. Les buts contre son camp et les tirs au but ne comptent pas.
        </p>
        <p className="text-sm text-neutral-600">
          Exemples : cote de 4,60 → 4,60 ÷ {r.scorerBonus.oddsDivisor} = {(4.6 / r.scorerBonus.oddsDivisor).toLocaleString("fr-FR")} → bonus de{" "}
          {oddsToBonus(4.6, r)} points ; cote de 5,76 → {(5.76 / r.scorerBonus.oddsDivisor).toLocaleString("fr-FR")} → bonus de{" "}
          {oddsToBonus(5.76, r)} points.
          {r.scorerFallback.mode === "FIXED"
            ? ` Joueur sans cote disponible : ${pts(r.scorerFallback.fixedBonus)} s’il marque.`
            : " Joueur sans cote disponible : pas de bonus."}
        </p>
        {r.noScorerBonus > 0 && (
          <p className="text-sm text-neutral-700">
            Tu peux aussi parier volontairement sur « Aucun buteur rennais » : {pts(r.noScorerBonus)} si aucun
            joueur rennais ne marque. Un but contre son camp d’un adversaire ne compte pas comme un but rennais.
            Sans pari buteur, pas de bonus.
          </p>
        )}
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Verrouillage et confidentialité</h2>
        <p className="text-sm text-neutral-700">
          Tu peux modifier ton pronostic jusqu’au coup d’envoi officiel. Ensuite, il est verrouillé et les
          pronostics de tous les participants deviennent visibles. En cas de report, la nouvelle heure fait foi.
          Les matchs joués avant ton inscription ne comptent pas.
        </p>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Classement</h2>
        <p className="text-sm text-neutral-700">
          Classement par points. En cas d’égalité : 1) le plus de scores exacts, 2) le plus de buteurs trouvés,
          3) le plus de bons écarts. Si l’égalité persiste, les participants sont ex æquo.
        </p>
      </section>
    </div>
  );
}
