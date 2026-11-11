import type { Metadata } from "next";
import { OfficialStandings } from "@/components/OfficialStandings";
import { PageTabs } from "@/components/PageTabs";
import { PageTitle } from "@/components/PageTitle";
import { ClubLinks, Squad, Transfers } from "@/components/ZoneMixte";
import { fetchOfficialTransfers } from "@/lib/transfers";

export const metadata: Metadata = { title: "Équipe Pro — La zone mixte" };
export const revalidate = 600;

/** Zone mixte › Équipe Pro : effectif, classements et transferts. */
export default async function ProTeamPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams;
  const official = await fetchOfficialTransfers().catch(() => null);
  return (
    <div className="space-y-6">
      <PageTitle className="font-display text-4xl font-bold uppercase tracking-wide text-rouge sm:text-5xl">Équipe Pro</PageTitle>
      <PageTabs
        initial={onglet}
        tabs={[
          { key: "effectif", label: "Effectif", content: <Squad /> },
          { key: "classements", label: "Classements", content: <OfficialStandings /> },
          { key: "transferts", label: "Transferts", content: <Transfers official={official} /> },
        ]}
      />
      <ClubLinks />
    </div>
  );
}
