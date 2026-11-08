import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { LineupPitch } from "@/components/LineupPitch";
import { MatchPageShell } from "@/components/MatchPageShell";
import { MatchStats } from "@/components/MatchStats";
import { PredictionSheet } from "@/components/PredictionSheet";
import { getCurrentUser } from "@/lib/auth/session";
import { loadMatchSheet } from "@/lib/match-sheet";

export const metadata: Metadata = { title: "Mon pronostic" };
export const dynamic = "force-dynamic";

/** Page dédiée d'un match à pronostiquer : score en en-tête, puis Avant-match · Le buteur · Les spécialités maison. */
export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/connexion?next=/match/${id}`);
  const data = await loadMatchSheet(id, user.id);
  if (!data) notFound();
  if (!data.editable) redirect(`/#match-${id}`); // match verrouillé : retour au calendrier
  const m = data.match;

  return (
    <MatchPageShell matchId={m.id}>
      <PredictionSheet
        {...data.sheet}
        prematch={
          <div className="space-y-4">
            {/* Composition dès qu'elle est publiée, en tête de l'avant-match */}
            {data.lineupPlayers.length > 0 && (
              <section className="rounded-xl border border-neutral-200 bg-[var(--color-surface)] p-3">
                <h4 className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-500">Composition du Stade Rennais</h4>
                <LineupPitch players={data.lineupPlayers} />
              </section>
            )}
            <MatchStats
              stacked
              competition={m.competition}
              home={{ id: m.homeTeam.externalId, name: m.homeTeam.name, logo: data.sheet.home.logo }}
              away={{ id: m.awayTeam.externalId, name: m.awayTeam.name, logo: data.sheet.away.logo }}
              odds={{ home: m.oddsHome, draw: m.oddsDraw, away: m.oddsAway }}
            />
          </div>
        }
      />
    </MatchPageShell>
  );
}
