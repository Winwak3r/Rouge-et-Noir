"use client";

import { useMemo, useState } from "react";
import { LeagueAvatar } from "./LeagueAvatar";

export interface AdminLeague {
  id: string;
  name: string;
  code: string;
  imageAt: number | null;
  createdLabel: string;
  createdShort: string;
  activeCount: number;
  creator: { pseudo: string; email: string } | null;
  admins: Array<{ id: string; pseudo: string; email: string }>;
  members: Array<{ id: string; pseudo: string; email: string; role: "ADMIN" | "MEMBER"; active: boolean; accountActive: boolean; joinedLabel: string; joinedShort: string }>;
}

const norm = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Ligues du site avec recherche (nom, code, créateur, admins ou participants : pseudo ou e-mail). */
export function LeaguesAdminList({ leagues }: { leagues: AdminLeague[] }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const n = norm(q.trim());
    if (!n) return leagues;
    return leagues.filter((l) =>
      [l.name, l.code, l.creator?.pseudo ?? "", l.creator?.email ?? "", ...l.members.flatMap((m) => [m.pseudo, m.email])].some((t) => norm(t).includes(n)),
    );
  }, [q, leagues]);

  return (
    <div className="space-y-3">
      <label className="block max-w-md">
        <span className="sr-only">Rechercher une ligue</span>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une ligue, un code, un joueur ou une adresse e-mail…"
          className="input"
        />
      </label>
      <p className="text-xs text-neutral-500">
        {shown.length} ligue{shown.length > 1 ? "s" : ""}
        {q && ` sur ${leagues.length}`}
      </p>
      {shown.length === 0 && <p className="card text-sm text-neutral-600">{q ? `Aucune ligue ne correspond à « ${q} ».` : "Aucune ligue pour l’instant."}</p>}
      {shown.map((l) => (
        <details key={l.id} className="card p-0">
          <summary className="flex cursor-pointer flex-wrap items-center gap-3 p-4">
            <LeagueAvatar leagueId={l.id} name={l.name} at={l.imageAt} size={44} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold" title={l.name}>
                {l.name}
              </p>
              <p className="text-xs text-neutral-500">
                {l.activeCount} joueur(s) · créée le <span className="sm:hidden">{l.createdShort}</span>
                <span className="hidden sm:inline">{l.createdLabel}</span> · code <span className="font-mono">{l.code}</span>
              </p>
            </div>
            <div className="min-w-0 text-xs text-neutral-600 sm:text-right">
              <p>
                Créateur : <strong>{l.creator?.pseudo ?? "(compte supprimé)"}</strong>{" "}
                {l.creator && <span className="hidden sm:inline">· {l.creator.email}</span>}
              </p>
              <p>
                Admins :{" "}
                {l.admins.length === 0
                  ? "—"
                  : l.admins.map((a, i) => (
                      <span key={a.id}>
                        {i > 0 && ", "}
                        {a.pseudo}
                        <span className="hidden sm:inline"> ({a.email})</span>
                      </span>
                    ))}
              </p>
            </div>
          </summary>
          <div className="overflow-x-auto border-t border-neutral-200">
            <table className="w-full text-sm">
              <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
                <tr>
                  <th scope="col" className="px-2 py-2 sm:px-4">Participant</th>
                  <th scope="col" className="hidden px-4 py-2 sm:table-cell">E-mail</th>
                  <th scope="col" className="px-2 py-2 sm:px-4">Rôle</th>
                  <th scope="col" className="px-2 py-2 sm:px-4">Arrivée</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {l.members.map((m) => (
                  <tr key={m.id} className={m.active && m.accountActive ? undefined : "text-neutral-400"}>
                    <td className="px-2 py-2 font-medium sm:px-4">
                      {m.pseudo}
                      {!m.active && " (désactivé dans la ligue)"}
                      {!m.accountActive && " (compte désactivé)"}
                    </td>
                    <td className="hidden px-4 py-2 sm:table-cell">{m.email}</td>
                    <td className="px-2 py-2 sm:px-4">{m.role === "ADMIN" ? "Admin" : "Joueur"}</td>
                    <td className="px-2 py-2 sm:px-4">
                      <span className="sm:hidden">{m.joinedShort}</span>
                      <span className="hidden sm:inline">{m.joinedLabel}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ))}
    </div>
  );
}
