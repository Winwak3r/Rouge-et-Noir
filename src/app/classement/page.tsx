import { redirect } from "next/navigation";

// Les classements sont désormais dans « Mes Ligues ».
export default async function OldStandingsPage({ searchParams }: { searchParams: Promise<{ vue?: string }> }) {
  const { vue } = await searchParams;
  redirect(vue ? `/ligues?vue=${vue}` : "/ligues");
}
