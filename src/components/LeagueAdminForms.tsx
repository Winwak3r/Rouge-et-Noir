"use client";

import { useRouter } from "next/navigation";
import { useActionState, useRef, useState } from "react";
import {
  regenerateInviteAction,
  removeLeagueMemberAction,
  renameLeagueAction,
  toggleLeagueAdminAction,
  toggleLeagueMemberAction,
  type LeagueState,
} from "@/app/actions/leagues";
import { leagueImageUrl } from "@/lib/league-url";
import { uploadLeagueImage } from "./LeagueForms";
import { CompetitionsField, DescriptionField } from "./LeagueFields";
import type { CompetitionCode } from "@/lib/competitions";

function Msg({ state }: { state: LeagueState }) {
  if (state.error) return <span role="alert" className="text-xs text-red-700">{state.error}</span>;
  if (state.success) return <span role="status" className="text-xs text-green-700">{state.success}</span>;
  return null;
}

/** Nom, description et compétitions de la ligue. */
export function RenameLeagueForm(props: {
  leagueId: string;
  name: string;
  description: string | null;
  competitions: string[];
  logos?: Partial<Record<CompetitionCode, string>>;
}) {
  const [state, action, pending] = useActionState<LeagueState, FormData>(renameLeagueAction, {});
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="leagueId" value={props.leagueId} />
      <label className="block text-sm">
        <span className="label">Nom de la ligue</span>
        <input name="name" defaultValue={props.name} required minLength={3} maxLength={40} className="input" />
      </label>
      <DescriptionField defaultValue={props.description ?? ""} />
      <CompetitionsField defaultValue={props.competitions} logos={props.logos} />
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} className="btn-primary">Enregistrer</button>
        <Msg state={state} />
      </div>
    </form>
  );
}

export function LeagueImageEditor({ leagueId, at }: { leagueId: string; at: number | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setMsg(null);
    try {
      await uploadLeagueImage(leagueId, f);
      setMsg("Image enregistrée.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = async () => {
    if (!window.confirm("Supprimer l’image de la ligue ?")) return;
    await fetch(`/api/league/${encodeURIComponent(leagueId)}/image`, { method: "DELETE" });
    router.refresh();
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {at ? <img src={leagueImageUrl(leagueId, at)} alt="" className="h-16 w-16 rounded-lg object-cover ring-1 ring-neutral-300" /> : null}
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn-secondary px-3 py-1.5">
        {busy ? "Envoi…" : at ? "Changer l’image" : "Ajouter une image"}
      </button>
      {at && (
        <button type="button" onClick={remove} className="btn-secondary px-3 py-1.5">
          Supprimer
        </button>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {msg && <span className="text-sm text-neutral-600">{msg}</span>}
    </div>
  );
}

export function InviteBox({ leagueId, url, code, qrSvg, qrPng }: { leagueId: string; url: string; code: string; qrSvg: string; qrPng: string }) {
  const [copied, setCopied] = useState(false);
  const [state, action, pending] = useActionState<LeagueState, FormData>(regenerateInviteAction, {});
  const share = async () => {
    if (navigator.share) await navigator.share({ title: "Rouge & Noir", text: "Rejoins ma ligue de pronostics Rouge & Noir !", url }).catch(() => undefined);
    else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  return (
    <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
      <div className="min-w-0 space-y-3 text-sm">
        <div>
          <p className="label">Lien d’invitation</p>
          <div className="flex gap-2">
            <input readOnly value={url} className="input min-w-0 text-xs" onFocus={(e) => e.currentTarget.select()} aria-label="Lien d’invitation" />
            <button
              type="button"
              onClick={async () => {
                await navigator.clipboard.writeText(url);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              className="btn-secondary shrink-0 px-3"
            >
              {copied ? "Copié ✓" : "Copier"}
            </button>
          </div>
        </div>
        <p>
          Code à saisir : <strong className="font-mono text-base tracking-widest">{code}</strong>
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={share} className="btn-primary px-3 py-1.5">Partager</button>
          <a href={qrPng} download={`invitation-${code}.png`} className="btn-secondary px-3 py-1.5">Télécharger le QR code</a>
        </div>
        <form
          action={action}
          onSubmit={(e) => {
            if (!window.confirm("Créer un nouveau lien ? L’ancien lien, l’ancien code et l’ancien QR code ne fonctionneront plus.")) e.preventDefault();
          }}
          className="flex flex-wrap items-center gap-2"
        >
          <input type="hidden" name="leagueId" value={leagueId} />
          <button disabled={pending} className="text-xs text-neutral-600 underline underline-offset-2">Générer un nouveau lien (désactive l’ancien)</button>
          <Msg state={state} />
        </form>
      </div>
      {/* QR code : produit côté serveur par la bibliothèque qrcode (contenu sûr) */}
      <div className="h-40 w-40 rounded-lg bg-white p-2 ring-1 ring-neutral-300" aria-label="QR code d’invitation" role="img" dangerouslySetInnerHTML={{ __html: qrSvg }} />
    </div>
  );
}

function SmallAction(props: { action: (s: LeagueState, f: FormData) => Promise<LeagueState>; leagueId: string; userId: string; label: string; confirm?: string; danger?: boolean }) {
  const [state, action, pending] = useActionState<LeagueState, FormData>(props.action, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (props.confirm && !window.confirm(props.confirm)) e.preventDefault();
      }}
      className="inline-flex flex-wrap items-center gap-1"
    >
      <input type="hidden" name="leagueId" value={props.leagueId} />
      <input type="hidden" name="userId" value={props.userId} />
      <button disabled={pending} className={`btn-secondary px-2 py-1 text-xs ${props.danger ? "text-red-700" : ""}`}>
        {props.label}
      </button>
      <Msg state={state} />
    </form>
  );
}

export function MemberActions(props: { leagueId: string; userId: string; pseudo: string; isAdmin: boolean; isActive: boolean; isMe: boolean }) {
  if (props.isMe) return <span className="text-xs text-neutral-500">C’est toi</span>;
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      {props.isActive && (
        <SmallAction
          action={toggleLeagueAdminAction}
          leagueId={props.leagueId}
          userId={props.userId}
          label={props.isAdmin ? "Retirer admin" : "Nommer admin"}
          confirm={props.isAdmin ? undefined : `Nommer ${props.pseudo} administrateur de la ligue ?`}
        />
      )}
      <SmallAction action={toggleLeagueMemberAction} leagueId={props.leagueId} userId={props.userId} label={props.isActive ? "Désactiver" : "Réactiver"} />
      <SmallAction
        action={removeLeagueMemberAction}
        leagueId={props.leagueId}
        userId={props.userId}
        label="Supprimer"
        danger
        confirm={`Retirer ${props.pseudo} de la ligue ? (Son compte sur le site n’est pas supprimé.)`}
      />
    </div>
  );
}
