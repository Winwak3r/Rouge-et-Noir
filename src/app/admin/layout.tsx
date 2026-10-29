import { AdminNav } from "@/components/AdminNav";
import type { ReactNode } from "react";
import { requireAdmin } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const LINKS = [
  ["/admin", "Vue d’ensemble"],
  ["/admin/participants", "Participants"],
  ["/admin/ligues", "Ligues"],
  ["/admin/matchs", "Matchs et dates limites"],
  ["/admin/joueurs", "Joueurs"],
  ["/admin/cotes", "Cotes"],
  ["/admin/bareme", "Barème"],
  ["/admin/logos", "Logos"],
  ["/admin/messages", "Messages push"],
  ["/admin/simulation", "Simulation"],
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div className="space-y-4 border-b border-neutral-200 pb-5">
        <p className="font-display text-4xl font-bold uppercase tracking-wide text-rouge sm:text-5xl">Administration</p>
        <AdminNav links={LINKS} />
      </div>
      {children}
    </div>
  );
}
