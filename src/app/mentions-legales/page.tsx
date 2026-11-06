import type { Metadata } from "next";
import { LEGAL_TEXT } from "@/lib/site-info";

export const metadata: Metadata = { title: "Mentions légales" };

export default function LegalPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide text-rouge sm:text-5xl">Mentions légales</h1>
      <p className="card text-sm leading-relaxed text-neutral-700">{LEGAL_TEXT}</p>
    </div>
  );
}
