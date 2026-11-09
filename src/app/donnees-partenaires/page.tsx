import type { Metadata } from "next";
import { PARTNERS } from "@/lib/site-info";
import { PageTitle } from "@/components/PageTitle";

export const metadata: Metadata = { title: "Données et partenaires" };

export default function PartnersPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle className="font-display text-4xl font-bold uppercase tracking-wide text-rouge sm:text-5xl">Données et partenaires</PageTitle>
      <ul className="card divide-y divide-neutral-100 text-sm">
        {PARTNERS.map(([what, who]) => (
          <li key={what} className="flex flex-wrap items-baseline justify-between gap-2 py-2">
            <span className="text-neutral-700">{what}</span>
            <span className="font-semibold">{who}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
