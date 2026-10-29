"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toSquareJpeg } from "./AvatarEditor";
import { PlayerPhoto } from "./PlayerPhoto";

/** Photo d'un joueur dans l'administration : déposer une photo (prioritaire) ou revenir à la photo automatique. */
export function PlayerPhotoEditor({ playerId, name, url, custom }: { playerId: string; name: string; url: string | null; custom: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    setMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", await toSquareJpeg(f), "joueur.jpg");
      const res = await fetch(`/api/player-photo/${encodeURIComponent(playerId)}`, { method: "PUT", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Envoi impossible.");
      setMsg("Photo enregistrée.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  const reset = async () => {
    await fetch(`/api/player-photo/${encodeURIComponent(playerId)}`, { method: "DELETE" });
    router.refresh();
  };
  return (
    <div className="flex flex-wrap items-center gap-3">
      <PlayerPhoto name={name} url={url} size={56} />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn-secondary px-3 py-1 text-xs">
        {busy ? "Envoi…" : "Déposer une photo"}
      </button>
      {custom && (
        <button type="button" onClick={reset} className="btn-secondary px-3 py-1 text-xs">
          Revenir à la photo officielle
        </button>
      )}
      <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      {msg && <span className="text-xs text-neutral-600">{msg}</span>}
    </div>
  );
}
