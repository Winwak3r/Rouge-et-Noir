import type { Metadata } from "next";
import { syncNowAction } from "@/app/actions/admin";
import { SubmitButton } from "@/components/SubmitButton";
import { prisma } from "@/lib/db";
import { formatStamp } from "@/lib/dates";
import { vapidFromEnv } from "@/lib/push/webpush";

export const metadata: Metadata = { title: "Administration" };
export const maxDuration = 60;

export default async function AdminHome() {
  const [users, matches, confirmed, players, subs, logs, audits] = await Promise.all([
    prisma.user.count({ where: { isActive: true } }),
    prisma.match.count(),
    prisma.match.count({ where: { resultConfirmedAt: { not: null } } }),
    prisma.player.count({ where: { isActive: true } }),
    prisma.pushSubscription.count(),
    prisma.syncLog.findMany({ orderBy: { startedAt: "desc" }, take: 10 }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { admin: { select: { pseudo: true } } } }),
  ]);

  return (
    <div className="space-y-10">
      <h1 className="page-title">Vue d’ensemble</h1>
      <section className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <Stat label="Participants actifs" value={users} />
        <Stat label="Matchs en base" value={matches} />
        <Stat label="Résultats confirmés" value={confirmed} />
        <Stat label="Joueurs rennais" value={players} />
        <Stat label={vapidFromEnv() ? "Appareils notifiés" : "Push non configuré"} value={subs} />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-xl font-bold uppercase tracking-wide">Synchronisation (ESPN)</h2>
          <form action={syncNowAction}>
            <SubmitButton pendingLabel="Synchronisation…">Synchroniser maintenant</SubmitButton>
          </form>
        </div>
        <Table
          empty="Aucune synchronisation pour l’instant."
          head={["Date", "Origine", "Statut", "Requêtes", "Détail"]}
          rows={logs.map((l) => {
            const d = l.details as unknown as { steps?: string[]; errors?: string[] } | null;
            return [
              formatStamp(l.startedAt),
              l.kind,
              l.status === "SUCCESS" ? "OK" : l.status === "PARTIAL" ? "Partiel" : "Échec",
              String(l.requestsUsed ?? "–"),
              [...(d?.errors ?? []).map((e) => `❌ ${e}`), ...(d?.steps ?? [])].join("\n"),
            ];
          })}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-display text-xl font-bold uppercase tracking-wide">Journal des modifications</h2>
        <Table
          empty="Aucune modification administrative."
          head={["Date", "Admin", "Action", "Objet", "Motif"]}
          rows={audits.map((a) => [formatStamp(a.createdAt), a.admin?.pseudo ?? "(compte supprimé)", a.action, `${a.entity} ${a.entityId.slice(0, 18)}`, a.reason ?? "–"])}
        />
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card">
      <p className="text-sm text-neutral-500">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
    </div>
  );
}

function Table({ head, rows, empty }: { head: string[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) return <p className="card text-sm text-neutral-600">{empty}</p>;
  return (
    <div className="overflow-x-auto rounded-xl border border-neutral-200 bg-surface shadow-sm">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
          <tr>{head.map((h) => <th key={h} scope="col" className="px-3 py-2">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-neutral-100 align-top">
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className={`px-3 py-2 ${j === r.length - 1 ? "whitespace-pre-line text-xs text-neutral-600" : "whitespace-nowrap"}`}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
