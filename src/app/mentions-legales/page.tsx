import type { Metadata } from "next";
import { LEGAL_TEXT } from "@/lib/site-info";
import { PageTitle } from "@/components/PageTitle";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <PageTitle className="font-display text-4xl font-bold uppercase tracking-wide text-rouge sm:text-5xl">Mentions légales</PageTitle>
      <p className="card text-sm leading-relaxed text-neutral-700">{LEGAL_TEXT}</p>
    </div>
  );
}
