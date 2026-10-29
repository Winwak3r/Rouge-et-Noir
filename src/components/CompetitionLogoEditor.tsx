"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

/** Réduit l'image à 256 px au plus (proportions et transparence conservées) en PNG. */
async function shrinkPng(file: File, max = 256): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Image illisible."));
      i.src = url;
    });
    const ratio = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement("canvas");
    c.width = Math.round(img.naturalWidth * ratio);
    c.height = Math.round(img.naturalHeight * ratio);
    c.getContext("2d")!.drawImage(img, 0, 0, c.width, c.height);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Conversion impossible."))), "image/png"));
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function CompetitionLogoEditor(props: { code: string; label: string; current: string | null; custom: boolean }) {
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
      fd.append("file", await shrinkPng(f), "logo.png");
      const res = await fetch(`/api/competition-logo/${props.code}`, { method: "PUT", body: fd });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Envoi impossible.");
      setMsg("Logo enregistré.");
      router.refresh();
    } catch (e) {
      setMsg((e as Error).message);
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  };
  const reset = async () => {
    if (!window.confirm(`Revenir au logo fourni par ESPN pour ${props.label} ?`)) return;
    await fetch(`/api/competition-logo/${props.code}`, { method: "DELETE" });
    router.refresh();
  };

  return (
    <div className="card flex flex-wrap items-center gap-4 p-4">
      <div className="grid h-16 w-16 place-items-center rounded-lg bg-white ring-1 ring-neutral-300">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {props.current ? <img src={props.current} alt="" className="max-h-14 max-w-14 object-contain" /> : <span className="text-xs text-neutral-400">aucun</span>}
      </div>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{props.label}</p>
        <p className="text-xs text-neutral-500">{props.custom ? "Logo déposé par l’administrateur" : props.current ? "Logo fourni par ESPN" : "Pastille de couleur (aucun logo)"}</p>
        {msg && <p className="text-xs text-neutral-700">{msg}</p>}
      </div>
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn-primary px-3 py-1.5">
        {busy ? "Envoi…" : "Déposer un logo"}
      </button>
      {props.custom && (
        <button type="button" onClick={reset} className="btn-secondary px-3 py-1.5">
          Revenir au logo ESPN
        </button>
      )}
      <input ref={input} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
