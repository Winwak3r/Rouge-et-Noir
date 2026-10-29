import { saveRulesAction } from "@/app/actions/admin";
import { ActionForm } from "@/components/ActionForm";
import { prisma } from "@/lib/db";
import { formatStamp } from "@/lib/dates";
import { getActiveRules } from "@/lib/scoring/active-rules";

function Num(props: { name: string; label: string; value: number | string; hint?: string; decimal?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-3 text-sm">
      <span>
        {props.label}
        {props.hint && <span className="block text-xs text-neutral-500">{props.hint}</span>}
      </span>
      <input
        name={props.name}
        required
        inputMode={props.decimal ? "decimal" : "numeric"}
        defaultValue={String(props.value).replace(".", ",")}
        className="input w-20 py-1 text-right tabular-nums"
      />
    </label>
  );
}

export default async function RulesAdminPage() {
  const [r, history] = await Promise.all([
    getActiveRules(),
    prisma.scoringRuleSet.findMany({ orderBy: { version: "desc" }, take: 5 }),
  ]);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Barème (version {r.version})</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Chaque enregistrement crée une nouvelle version. Par défaut, elle ne s’applique qu’aux matchs à venir : les matchs déjà
          notés gardent leur barème. Tu peux aussi recalculer toute la saison (journalisé, le classement peut changer).
        </p>
      </div>
      <ActionForm
        action={saveRulesAction}
        className="space-y-5"
        submits={[
          { label: "Enregistrer pour les prochains matchs", value: "future" },
          {
            label: "Enregistrer et recalculer toute la saison",
            value: "all",
            primary: false,
            confirm: "Recalculer tous les matchs déjà notés avec ce barème ? Le classement peut changer. Pense à prévenir les joueurs.",
          },
        ]}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <fieldset className="card space-y-2 p-4">
            <legend className="px-1 text-sm font-semibold">Pronostic du score</legend>
            <Num name="exact" label="Score exact" value={r.points.exact} />
            <Num name="goalDiff" label="Bon résultat et bon écart" value={r.points.goalDiff} />
            <Num name="outcome" label="Bon résultat, mauvais écart" value={r.points.outcome} />
            <Num name="wrong" label="Mauvais résultat" value={r.points.wrong} />
            <Num name="missing" label="Aucun pronostic" value={r.points.missing} hint="Valeur négative ou nulle" />
            <label className="block pt-1 text-sm">
              <span className="label">Élimination directe : score retenu</span>
              <select name="knockout" defaultValue={r.knockoutScoreBasis} className="input">
                <option value="AFTER_EXTRA_TIME">Après prolongation (tirs au but exclus)</option>
                <option value="REGULATION">Fin du temps réglementaire</option>
              </select>
            </label>
          </fieldset>
          <fieldset className="card space-y-2 p-4">
            <legend className="px-1 text-sm font-semibold">Bonus buteur</legend>
            <Num name="oddsDivisor" label="Diviseur de la cote" value={r.scorerBonus.oddsDivisor} hint="Bonus = cote ÷ diviseur, arrondi à l’entier le plus proche" decimal />
            <Num name="minBonus" label="Bonus minimum" value={r.scorerBonus.minBonus} />
            <Num name="maxBonus" label="Bonus maximum" value={r.scorerBonus.maxBonus} />
            <label className="block text-sm">
              <span className="label">Joueur sans cote qui marque</span>
              <select name="fallbackMode" defaultValue={r.scorerFallback.mode} className="input">
                <option value="FIXED">Bonus fixe</option>
                <option value="NONE">Aucun bonus</option>
              </select>
            </label>
            <Num name="fixedBonus" label="Bonus fixe sans cote" value={r.scorerFallback.fixedBonus} />
            <Num name="noScorerBonus" label="« Aucun buteur rennais » réussi" value={r.noScorerBonus} hint="0 pour désactiver ce pari" />
          </fieldset>
        </div>
        <label className="block text-sm">
          <span className="label">Motif (facultatif, conservé dans le journal)</span>
          <input name="reason" maxLength={200} className="input" />
        </label>
      </ActionForm>
      {history.length > 0 && (
        <section className="text-sm text-neutral-600">
          <h2 className="mb-1 font-semibold text-noir">Versions enregistrées</h2>
          <ul className="space-y-0.5">
            {history.map((h) => (
              <li key={h.id}>
                v{h.version} · {formatStamp(h.createdAt)} {h.isActive && <strong className="text-green-700">· active</strong>}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
