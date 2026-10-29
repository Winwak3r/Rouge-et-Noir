"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { createLeagueAction, deleteLeagueAction, joinLeagueAction, leaveLeagueAction, type LeagueState } from "@/app/actions/leagues";
import { toSquareJpeg } from "./AvatarEditor";
import { CompetitionsField, DescriptionField } from "./LeagueFields";
import type { CompetitionCode } from "@/lib/competitions";

/** Envoie l'image d'une ligue (recadrée au carré, 256 px). */
export async function uploadLeagueImage(leagueId: string, file: File): Promise<void> {
  const blob = await toSquareJpeg(file);
  const fd = new FormData();
  fd.append("file", blob, "ligue.jpg");
  const res = await fetch(`/api/league/${encodeURIComponent(leagueId)}/image`, { method: "PUT", body: fd });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Envoi de l’image impossible.");
}

function Msg({ state }: { state: LeagueState }) {
  if (state.error) return <p role="alert" className="text-sm text-red-700">{state.error}</p>;
  if (state.success) return <p role="status" className="text-sm text-green-700">{state.success}</p>;
  return null;
}

export function JoinLeagueForm({ onDone }: { onDone?: () => void }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<LeagueState, FormData>(joinLeagueAction, {});
  useEffect(() => {
    if (state.success) {
      router.refresh();
      onDone?.();
    }
  }, [state, router, onDone]);
  return (
    <form action={action} className="space-y-2">
      <div className="flex gap-2">
        <input name="code" required placeholder="Code de la ligue (ex. K7PM3QXA)" autoComplete="off" className="input uppercase" aria-label="Code de la ligue" />
        <button disabled={pending} className="btn-primary shrink-0">
          {pending ? "…" : "Rejoindre"}
        </button>
      </div>
      <Msg state={state} />
    </form>
  );
}

export function CreateLeagueForm({ onDone, logos }: { onDone?: () => void; logos?: Partial<Record<CompetitionCode, string>> }) {
  const router = useRouter();
  const [state, setState] = useState<LeagueState>({});
  const [pending, start] = useTransition();
  const [picked, setPicked] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [imgError, setImgError] = useState<string | null>(null);

  // Tout se fait dans une seule fonction : création, PUIS envoi de l'image, PUIS fermeture.
  // (Dans la fenêtre de bienvenue, la création fait disparaître la fenêtre : un envoi déclenché
  // après coup par un effet n'avait jamais lieu, d'où l'image perdue.)
  const submit = (fd: FormData) =>
    start(async () => {
      const r = await createLeagueAction({}, fd);
      setState(r);
      if (r.leagueId && picked) {
        await uploadLeagueImage(r.leagueId, picked).catch((e) => setImgError((e as Error).message));
      }
      if (r.leagueId) {
        router.refresh();
        onDone?.();
      }
    });

  return (
    <form action={submit} className="space-y-3">
      <label className="block text-sm">
        <span className="label">Nom de la ligue</span>
        <input name="name" required minLength={3} maxLength={40} className="input" placeholder="Ex. Bouge ta classe !" />
      </label>
      <DescriptionField />
      <CompetitionsField logos={logos} />
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img src={preview} alt="" className="h-12 w-12 rounded-lg object-cover" />}
        <label className="btn-secondary cursor-pointer px-3 py-1.5 text-sm">
          {preview ? "Changer la photo" : "Ajouter une photo"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              setPicked(f);
              setPreview(f ? URL.createObjectURL(f) : null);
            }}
          />
        </label>
        <span className="text-xs text-neutral-500">facultatif</span>
      </div>
      <button disabled={pending} className="btn-primary">
        {pending ? "Création…" : "Créer la ligue"}
      </button>
      <Msg state={state} />
      {imgError && <p className="text-sm text-orange-700">Ligue créée, mais l’image n’a pas pu être envoyée : {imgError}</p>}
    </form>
  );
}

export function LeaveLeagueForm({ leagueId, name }: { leagueId: string; name: string }) {
  const [state, action, pending] = useActionState<LeagueState, FormData>(leaveLeagueAction, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!window.confirm(`Quitter la ligue « ${name} » ?`)) e.preventDefault();
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="leagueId" value={leagueId} />
      <button disabled={pending} className="btn-secondary px-3 py-1 text-xs text-red-700">
        Quitter
      </button>
      {state.error && <span className="text-xs text-red-700">{state.error}</span>}
    </form>
  );
}

/** Fenêtre de première connexion : rejoindre une ligue avec son code, ou en créer une. */
export function LeagueOnboarding({ canCreate, logos }: { canCreate: boolean; logos?: Partial<Record<CompetitionCode, string>> }) {
  const [open, setOpen] = useState(true);
  const [creating, setCreating] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("onboarding-later") === "1") setOpen(false);
  }, []);
  if (!open) return null;
  const close = () => setOpen(false);
  return (
    <div role="dialog" aria-modal="true" aria-label="Rejoindre ou créer une ligue" className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center">
      <div className="w-full max-w-md space-y-5 rounded-2xl border border-neutral-200 bg-surface p-6 shadow-2xl">
        <div>
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Bienvenue !</h2>
          <p className="mt-1 text-sm text-neutral-600">Les pronostics se jouent entre amis, dans une ligue. Rejoins celle de tes amis ou crée la tienne.</p>
        </div>
        <section className="space-y-2 rounded-xl border border-neutral-200 p-4">
          <h3 className="font-semibold">Rejoindre une ligue</h3>
          <p className="text-xs text-neutral-500">Saisis le code reçu (ou colle le lien d’invitation).</p>
          <JoinLeagueForm onDone={close} />
        </section>
        {canCreate && (
          <section className="space-y-2 rounded-xl border border-neutral-200 p-4">
            <button type="button" onClick={() => setCreating((c) => !c)} aria-expanded={creating} className="flex w-full items-center justify-between font-semibold">
              Créer une ligue
              <span aria-hidden className={`transition-transform ${creating ? "rotate-180" : ""}`}>▾</span>
            </button>
            {creating && <CreateLeagueForm onDone={close} logos={logos} />}
          </section>
        )}
        <div className="text-right">
          <button
            type="button"
            onClick={() => {
              sessionStorage.setItem("onboarding-later", "1");
              close();
            }}
            className="text-sm text-neutral-500 underline underline-offset-2"
          >
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}

/** Suppression de la ligue : avertissement avec le nombre de participants, puis « SUPPRIMER » à saisir. */
export function DeleteLeagueForm({ leagueId, name, members }: { leagueId: string; name: string; members: number }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<LeagueState, FormData>(deleteLeagueAction, {});
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (state.success) router.push("/ligues");
  }, [state, router]);
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary text-red-700">
        Supprimer la ligue
      </button>
    );
  }
  return (
    <form action={action} className="space-y-3 rounded-lg border border-red-300 bg-red-100 p-4 text-sm text-red-800">
      <input type="hidden" name="leagueId" value={leagueId} />
      <p>
        ⚠️ La ligue « <strong>{name}</strong> » contient <strong>{members} participant{members > 1 ? "s" : ""}</strong>. Si tu la supprimes, ils
        ne la verront plus sur leur profil et son classement disparaîtra. Leurs points restent attachés à leur compte.
      </p>
      <label className="block">
        <span className="mb-1 block font-medium">Pour confirmer, écris SUPPRIMER</span>
        <input name="confirm" autoComplete="off" className="input" />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <button disabled={pending} className="rounded bg-[#E53935] px-3 py-1.5 font-semibold text-white disabled:opacity-50">
          {pending ? "Suppression…" : "Supprimer définitivement"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary px-3 py-1.5">
          Annuler
        </button>
        {state.error && <span role="alert">{state.error}</span>}
      </div>
    </form>
  );
}
