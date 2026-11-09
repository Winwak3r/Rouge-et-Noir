import type { Metadata } from "next";
import { ResendVerificationForm, SpamNotice } from "@/components/forms";
import { PageTitle } from "@/components/PageTitle";

export const metadata: Metadata = { title: "Confirme ton adresse e-mail" };

export default async function RegisterDonePage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <PageTitle className="page-title mb-6">Plus qu’une étape</PageTitle>
      <div className="card space-y-4 text-sm">
        <p>
          Ton compte est créé. Pour l’activer, clique sur le lien envoyé à <strong>{email ?? "ton adresse e-mail"}</strong>. Tu
          seras connecté automatiquement.
        </p>
        <SpamNotice />
        <p className="text-neutral-600">Rien reçu après quelques minutes ?</p>
        <ResendVerificationForm email={email ?? ""} />
      </div>
    </div>
  );
}
