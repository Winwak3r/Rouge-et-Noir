import type { Metadata } from "next";
import Link from "next/link";
import { CreateLeagueForm, JoinLeagueForm } from "@/components/LeagueForms";
import { PageTitle } from "@/components/PageTitle";
import { requireUser } from "@/lib/auth/session";
import { getLeagueLogos } from "@/lib/league-logos";
import { MAX_LEAGUES, canJoinAnother } from "@/lib/league-rules";
import { myLeagues } from "@/lib/leagues";

export const metadata: Metadata = { title: "Créer / Rejoindre une ligue" };

const H = "font-display text-lg font-bold uppercase tracking-wide text-rouge";

/** Créer une ligue, ou en rejoindre une avec son code (3 ligues au maximum). */
export default async function NewLeaguePage() {
  const user = await requireUser();
  const [leagues, logos] = await Promise.all([myLeagues(user.id), getLeagueLogos()]);
  const canAdd = canJoinAnother(leagues.length);

  return (
    <div className="space-y-6">
      <PageTitle className="font-display text-4xl font-bold uppercase tracking-wide text-rouge sm:text-5xl">Créer / Rejoindre</PageTitle>

      {/* Avertissement : 3 ligues au maximum */}
      <p
        className={`flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm ${
          canAdd ? "border-neutral-200 bg-[var(--color-surface)] text-neutral-700" : "border-amber-300 bg-amber-100 text-amber-900"
        }`}
      >
        <span className={`rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${canAdd ? "bg-neutral-100 text-neutral-700" : "bg-rouge text-white"}`}>
          {leagues.length}/{MAX_LEAGUES}
        </span>
        {canAdd ? (
          <span>
            Tu peux participer à <strong>{MAX_LEAGUES} ligues au maximum</strong>, créées ou rejointes : il t’en reste{" "}
            {MAX_LEAGUES - leagues.length}.
          </span>
        ) : (
          <span>
            Tu participes déjà à <strong>{MAX_LEAGUES} ligues</strong>, le maximum : quittes-en une depuis{" "}
            <Link href="/ligues" className="font-semibold underline">
              Mes Ligues
            </Link>{" "}
            pour en rejoindre ou en créer une autre.
          </span>
        )}
      </p>

      {canAdd && (
        <div className="grid gap-4 md:grid-cols-2">
          <section className="card space-y-2">
            <h2 className={H}>Rejoindre une ligue</h2>
            <p className="text-sm text-neutral-600">Saisis le code d’invitation que t’a donné l’administrateur de la ligue.</p>
            <JoinLeagueForm />
          </section>
          <section id="creer" className="card space-y-2">
            <h2 className={H}>Créer une ligue</h2>
            <p className="text-sm text-neutral-600">Tu en deviens l’administrateur et tu invites tes amis, ta famille ou tes collègues.</p>
            <CreateLeagueForm logos={logos} />
          </section>
        </div>
      )}
    </div>
  );
}
