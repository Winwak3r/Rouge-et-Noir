"use client";

import { useMemo, useState } from "react";
import { deleteUserAction, toggleUserActiveAction, toggleUserRoleAction } from "@/app/actions/admin";
import { ActionForm } from "./ActionForm";
import { Avatar } from "./Avatar";

export interface ParticipantRow {
  id: string;
  pseudo: string;
  email: string;
  role: "ADMIN" | "PARTICIPANT";
  isActive: boolean;
  verified: boolean;
  createdLabel: string;
  createdShort: string;
  avatarAt: number | null;
  predictions: number;
  pushSubs: number;
}

const norm = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const small = "[&_.btn-secondary]:px-2.5 [&_.btn-secondary]:py-1 [&_.btn-secondary]:text-xs [&_span]:text-xs";

function Actions({ u, adminId }: { u: ParticipantRow; adminId: string }) {
  if (u.id === adminId) return <span className="text-xs text-neutral-500">C’est toi</span>;
  return (
    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
      {(u.isActive || u.role === "ADMIN") && (
        <ActionForm
          action={toggleUserRoleAction}
          className={`flex flex-wrap items-center gap-1.5 ${small}`}
          submits={[
            u.role === "ADMIN"
              ? { label: "Retirer admin", primary: false, confirm: `Retirer le rôle d’administrateur à ${u.pseudo} ?` }
              : { label: "Nommer admin", primary: false, confirm: `Donner le rôle d’administrateur à ${u.pseudo} ? Il aura accès à toute l’administration.` },
          ]}
        >
          <input type="hidden" name="userId" value={u.id} />
        </ActionForm>
      )}
      <form action={toggleUserActiveAction}>
        <input type="hidden" name="userId" value={u.id} />
        <button type="submit" className="btn-secondary px-2.5 py-1 text-xs">
          {u.isActive ? "Désactiver" : "Réactiver"}
        </button>
      </form>
      <ActionForm
        action={deleteUserAction}
        className={`flex flex-wrap items-center gap-1.5 ${small} [&_.btn-secondary]:text-red-700`}
        submits={[
          {
            label: "Supprimer",
            primary: false,
            confirm: `Supprimer DÉFINITIVEMENT ${u.pseudo} ? Son compte, ses pronostics et ses points seront effacés. Pour simplement l’écarter, préfère « Désactiver ».`,
          },
        ]}
      >
        <input type="hidden" name="userId" value={u.id} />
      </ActionForm>
    </div>
  );
}

/** Liste des participants avec recherche (pseudo ou e-mail) : fiches sur mobile, tableau sur ordinateur. */
export function ParticipantsList({ users, adminId }: { users: ParticipantRow[]; adminId: string }) {
  const [q, setQ] = useState("");
  const shown = useMemo(() => {
    const n = norm(q.trim());
    return n ? users.filter((u) => norm(u.pseudo).includes(n) || norm(u.email).includes(n)) : users;
  }, [q, users]);

  const badge = (u: ParticipantRow) =>
    u.role === "ADMIN" ? <span className="rounded bg-red-100 px-1.5 py-0.5 text-xs font-semibold text-red-800">Admin</span> : null;
  const verified = (u: ParticipantRow) =>
    u.verified ? (
      <span title="Adresse confirmée" className="text-green-700">✓</span>
    ) : (
      <span title="Adresse non confirmée" className="text-xs text-amber-700">(non confirmée)</span>
    );

  return (
    <div className="space-y-3">
      <label className="block max-w-md">
        <span className="sr-only">Rechercher un joueur</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un pseudo ou une adresse e-mail…" className="input" />
      </label>
      <p className="text-xs text-neutral-500">
        {shown.length} joueur{shown.length > 1 ? "s" : ""}
        {q && ` sur ${users.length}`}
      </p>

      {/* Mobile : une fiche par joueur, sans défilement horizontal */}
      <ul className="space-y-2 sm:hidden">
        {shown.map((u) => (
          <li key={u.id} className={`card space-y-2 p-3 ${u.isActive ? "" : "opacity-60"}`}>
            <div className="flex min-w-0 items-center gap-2">
              <Avatar userId={u.id} pseudo={u.pseudo} at={u.avatarAt} size={32} />
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate font-semibold">
                  {u.pseudo} {badge(u)}
                  {!u.isActive && <span className="text-xs font-normal">(désactivé)</span>}
                </p>
                <p className="truncate text-xs text-neutral-600">
                  {u.email} {verified(u)}
                </p>
              </div>
            </div>
            <p className="text-xs text-neutral-500">
              Inscrit le {u.createdShort} · {u.predictions} prono{u.predictions > 1 ? "s" : ""} · notifs : {u.pushSubs || "—"}
            </p>
            <Actions u={u} adminId={adminId} />
          </li>
        ))}
      </ul>

      {/* Ordinateur : tableau */}
      <div className="hidden overflow-x-auto rounded-xl border border-neutral-200 bg-surface shadow-sm sm:block">
        <table className="w-full text-sm">
          <thead className="bg-neutral-50 text-left text-xs uppercase tracking-wide text-neutral-500">
            <tr>
              <th scope="col" className="px-3 py-2">Pseudo</th>
              <th scope="col" className="px-3 py-2">E-mail</th>
              <th scope="col" className="px-3 py-2">Inscription</th>
              <th scope="col" className="px-3 py-2 text-right">Pronos</th>
              <th scope="col" className="px-3 py-2 text-right">Notifs</th>
              <th scope="col" className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {shown.map((u) => (
              <tr key={u.id} className={u.isActive ? undefined : "text-neutral-400"}>
                <td className="px-3 py-2 font-medium">
                  <span className="flex items-center gap-2">
                    <Avatar userId={u.id} pseudo={u.pseudo} at={u.avatarAt} size={24} />
                    {u.pseudo} {badge(u)}
                  </span>
                </td>
                <td className="px-3 py-2">
                  {u.email} {verified(u)}
                </td>
                <td className="whitespace-nowrap px-3 py-2">{u.createdLabel}</td>
                <td className="px-3 py-2 text-right">{u.predictions}</td>
                <td className="px-3 py-2 text-right">{u.pushSubs || "–"}</td>
                <td className="px-3 py-2">
                  <Actions u={u} adminId={adminId} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && <p className="card text-sm text-neutral-600">Aucun joueur ne correspond à « {q} ».</p>}
    </div>
  );
}
