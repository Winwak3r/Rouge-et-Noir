import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/forms";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Inscription" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ligue?: string }> }) {
  const { ligue } = await searchParams;
  if (await getCurrentUser()) redirect("/");
  return (
    <div className="mx-auto max-w-md">
      <h1 className="page-title mb-6">Inscription</h1>
      {ligue && (
        <p className="mb-4 rounded-lg bg-green-100 px-3 py-2 text-sm text-green-800">
          Tu es invité dans la ligue <strong>{ligue}</strong> : crée ton compte, confirme ton adresse, et tu la rejoindras automatiquement.
        </p>
      )}
      <div className="card">
        <RegisterForm needsCode={Boolean(process.env.REGISTRATION_CODE?.trim())} />
      </div>
    </div>
  );
}
