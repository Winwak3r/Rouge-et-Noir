import type { Metadata } from "next";
import { ResendVerificationForm } from "@/components/forms";

export const metadata: Metadata = { title: "Confirme ton adresse e-mail" };

export default async function RegisterDonePage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="page-title mb-6">Plus qu’une étape</h1>
      <div className="card space-y-4 text-sm">
        <p>
          Ton compte est créé. Pour l’activer, clique sur le lien envoyé à <strong>{email ?? "ton adresse e-mail"}</strong> (pense
          à regarder dans les indésirables). Tu seras connecté automatiquement.
        </p>
        <p className="text-neutral-600">Rien reçu après quelques minutes ?</p>
        <ResendVerificationForm email={email ?? ""} />
      </div>
    </div>
  );
}
