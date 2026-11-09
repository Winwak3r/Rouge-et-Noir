import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/forms";
import { PageTitle } from "@/components/PageTitle";

export const metadata: Metadata = { title: "Mot de passe oublié" };

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md">
      <PageTitle className="page-title mb-2">Mot de passe oublié</PageTitle>
      <p className="mb-6 text-sm text-neutral-600">
        Indique l’adresse de ton compte : tu recevras un lien pour choisir un nouveau mot de passe.
      </p>
      <div className="card">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
