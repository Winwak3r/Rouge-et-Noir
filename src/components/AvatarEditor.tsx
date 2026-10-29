"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Avatar } from "./Avatar";

/** Recadre l'image au carré (centre) et la réduit à 256 px en JPEG : quelques dizaines de Ko, quelle que soit la photo. */
export async function toSquareJpeg(file: File, size = 256): Promise<Blob> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = () => rej(new Error("Image illisible."));
      i.src = url;
    });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    const c = document.createElement("canvas");
    c.width = c.height = size;
    const ctx = c.getContext("2d");
    if (!ctx) throw new Error("Conversion impossible sur cet appareil.");
    ctx.fillStyle = "#262626"; // fond pour les images transparentes
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, size, size);
    return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("Conversion impossible."))), "image/jpeg", 0.85));
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Photo de profil : choisir une image (galerie ou appareil photo), la remplacer ou la supprimer. */
export function AvatarEditor(props: { userId: string; pseudo: string; at: number | null }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [current, setCurrent] = useState<number | null>(props.at);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function onPick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setMsg(null);
    try {
      if (!file.type.startsWith("image/")) throw new Error("Choisis une image (photo).");
      const blob = await toSquareJpeg(file);
      const fd = new FormData();
      fd.append("file", blob, "avatar.jpg");
      const res = await fetch("/api/profile/avatar", { method: "PUT", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error ?? "Envoi impossible.");
      setCurrent(data.at);
      setMsg({ ok: true, text: "Photo enregistrée." });
      router.refresh();
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  async function remove() {
    if (!window.confirm("Supprimer ta photo de profil ?")) return;
    setBusy(true);
    setMsg(null);
    const res = await fetch("/api/profile/avatar", { method: "DELETE" });
    setBusy(false);
    if (res.ok) {
      setCurrent(null);
      setMsg({ ok: true, text: "Photo supprimée." });
      router.refresh();
    } else setMsg({ ok: false, text: "Suppression impossible." });
  }

  return (
    <div className="flex flex-wrap items-center gap-4">
      <Avatar userId={props.userId} pseudo={props.pseudo} at={current} size={72} />
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={busy} onClick={() => input.current?.click()} className="btn-secondary px-3 py-1.5">
            {busy ? "Envoi…" : current ? "Changer la photo" : "Ajouter une photo"}
          </button>
          {current && (
            <button type="button" disabled={busy} onClick={remove} className="btn-secondary px-3 py-1.5">
              Supprimer
            </button>
          )}
        </div>
        <input ref={input} type="file" accept="image/*" className="hidden" onChange={(e) => onPick(e.target.files?.[0])} />
        <p className="text-xs text-neutral-500">
          Elle apparaît en bulle ronde à côté de ton pseudo (menu, classement, pronostics). Image recadrée au carré automatiquement.
        </p>
        {msg && <p role="status" className={`text-sm ${msg.ok ? "text-green-700" : "text-red-700"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
