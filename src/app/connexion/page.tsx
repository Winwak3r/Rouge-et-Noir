import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNext } from "@/lib/validation";

export const metadata: Metadata = { title: "Connexion" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; verification?: string }> }) {
  const { next, verification } = await searchParams;
  if (await getCurrentUser()) redirect(safeNext(next));
  return (
    <div className="mx-auto max-w-md">
      <h1 className="page-title mb-6">Connexion</h1>
      {verification === "invalide" && (
        <p className="mb-4 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">
          Ce lien de confirmation n’est plus valable (déjà utilisé ou expiré). Connecte-toi : un nouveau lien te sera proposé si besoin.
        </p>
      )}
      <div className="card">
        <LoginForm next={safeNext(next)} />
      </div>
    </div>
  );
}
