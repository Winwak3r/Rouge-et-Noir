import type { Metadata } from "next";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/site-info";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="font-display text-4xl font-bold uppercase tracking-wide text-rouge sm:text-5xl">Contact</h1>
      <div className="card space-y-2 text-sm">
        <p className="text-neutral-700">Un bug, une idée d’amélioration ?</p>
        <a href={CONTACT_MAILTO} className="font-semibold text-rouge underline-offset-2 hover:underline">
          {CONTACT_EMAIL}
        </a>
      </div>
    </div>
  );
}
