import type { Metadata } from "next";
import Link from "next/link";
import { ResetPasswordForm } from "@/components/forms";

export const metadata: Metadata = { title: "Nouveau mot de passe" };

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <div className="mx-auto max-w-md">
      <h1 className="page-title mb-6">Nouveau mot de passe</h1>
      <div className="card">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-sm text-neutral-700">
            Lien incomplet.{" "}
            <Link href="/mot-de-passe-oublie" className="font-medium text-rouge hover:underline">
              Refaire une demande
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
