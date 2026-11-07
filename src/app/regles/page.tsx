import type { Metadata } from "next";
import { getActiveRules } from "@/lib/scoring/active-rules";
import { BonusIcon } from "@/components/BonusIcon";
import { BONUS_INFO, BONUS_KINDS, DEFAULT_BONUS_QUOTAS } from "@/lib/scoring/bonus";
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
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Ligues</h2>
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-neutral-700">
          <li>
            Les pronostics se jouent entre amis, dans des <strong>ligues</strong>. Tu peux participer à <strong>3 ligues au maximum</strong>,
            que tu les aies créées ou rejointes.
          </li>
          <li>À 3 ligues, il faut d’abord en quitter une (« Ligues » › « Quitter ») pour pouvoir en rejoindre ou en créer une autre.</li>
          <li>
            On rejoint une ligue avec son <strong>code</strong>, son <strong>lien d’invitation</strong> ou son <strong>QR code</strong>, fournis par
            un administrateur de la ligue.
          </li>
          <li>
            Le créateur d’une ligue en est l’administrateur : il choisit son nom, sa photo, sa description et les{" "}
            <strong>compétitions jouées</strong>, invite les joueurs, peut nommer d’autres administrateurs, désactiver ou retirer un joueur.
          </li>
          <li>
            Dans une ligue, <strong>tout le monde part de 0 point</strong> à sa création : seuls les matchs joués ensuite, dans ses
            compétitions, comptent dans son classement. Tes pronostics, eux, valent pour toutes tes ligues.
          </li>
          <li>La ligue « Par défaut » (choisie dans « Ligues ») est celle affichée à chaque connexion.</li>
          <li>Le classement « Général R&amp;N » réunit tous les joueurs inscrits dans une ligue et ayant pronostiqué, sur toute la saison.</li>
        </ul>
      </section>

      <section className="card space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Les Spécialités Maison</h2>
        <p className="text-sm text-neutral-700">
          Trois bonus à jouer pendant la saison, <strong>dans chacune de tes ligues</strong> : chaque ligue te donne son propre stock.
        </p>
        <ul className="space-y-3">
          {BONUS_KINDS.map((k) => (
            <li key={k} className="flex items-start gap-3">
              <BonusIcon kind={k} size={44} />
              <span className="text-sm text-neutral-700">
                <strong className="text-noir">{BONUS_INFO[k].name}</strong> ({(r.bonusQuotas ?? DEFAULT_BONUS_QUOTAS)[k]} par saison et par ligue) :{" "}
                {k === "KOUIGN_AMANN" && "tous les points du match sont doublés (score et buteur). Un pronostic à 0 point reste à 0 : le bonus est perdu."}
                {k === "GALETTES_SAUCISSES" &&
                  "tu choisis un second buteur rennais, différent du premier. S’il marque, il rapporte ses propres points, en plus du premier."}
                {k === "PILE_CREPES" &&
                  "les points de ton buteur sont comptés à chaque but qu’il marque, sans plafond : un buteur à 3 points qui fait un triplé rapporte 9 points."}
                <span className="block italic text-neutral-500">« {BONUS_INFO[k].tagline} »</span>
              </span>
            </li>
          ))}
        </ul>
        <ul className="list-disc space-y-1 pl-5 text-sm text-neutral-700">
          <li>Un bonus se joue dans le formulaire du pronostic, avant le verrouillage du match, et s’applique à la <strong>ligue affichée</strong>.</li>
          <li>Un seul bonus par match et par ligue. Tant que le match n’est pas verrouillé, tu peux le retirer ou en changer : il t’est rendu.</li>
          <li>Il faut un pronostic de score ; les Galettes Saucisses et la Pile de Crêpes demandent aussi un buteur (pas « Aucun buteur rennais »).</li>
          <li>Match annulé : le bonus est rendu. Les bonus non utilisés sont perdus en fin de saison.</li>
          <li>Les points des bonus comptent dans le classement de la ligue où ils ont été joués, pas dans le classement Général R&amp;N.</li>
        </ul>
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
