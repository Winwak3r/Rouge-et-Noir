"use client";

import { useEffect, useState } from "react";
import { answerNotifPromptAction } from "@/app/actions/auth";
import { pushSupport, subscribeThisDevice, type PushSupport } from "@/lib/push/client";

/**
 * Proposition d'activer les notifications, juste après la première ligue (créée ou rejointe).
 * S'affiche après la fenêtre « Bienvenue dans la ligue » ; le didacticiel suit.
 */
export function NotifPrompt({ publicKey, waitForEvent }: { publicKey: string | null; waitForEvent?: string }) {
  const [ready, setReady] = useState(!waitForEvent);
  const [open, setOpen] = useState(true);
  const [prematch, setPrematch] = useState(true);
  const [live, setLive] = useState(true);
  const [support, setSupport] = useState<PushSupport>("ok");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setSupport(pushSupport(publicKey)), [publicKey]);
  useEffect(() => {
    if (!waitForEvent) return;
    const go = () => setReady(true);
    window.addEventListener(waitForEvent, go);
    return () => window.removeEventListener(waitForEvent, go);
  }, [waitForEvent]);

  const close = () => {
    setOpen(false);
    window.dispatchEvent(new Event("notif-prompt-closed")); // le didacticiel peut commencer
  };

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      // La demande d'autorisation doit suivre directement le clic (sinon Safari la refuse) : elle passe en premier
      if ((live || prematch) && support === "ok") await subscribeThisDevice(publicKey!);
      await answerNotifPromptAction({ live, prematch });
      close();
    } catch (e) {
      await answerNotifPromptAction({ live, prematch }).catch(() => undefined); // les choix sont gardés quand même
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function later() {
    await answerNotifPromptAction(null);
    close();
  }

  if (!open || !ready) return null;
  const box = (checked: boolean, set: (v: boolean) => void, label: string, hint: string) => (
    <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-neutral-200 p-3 text-left hover:bg-neutral-50">
      <input type="checkbox" checked={checked} onChange={(e) => set(e.target.checked)} className="mt-1 h-4 w-4 accent-[#e1001a]" />
      <span>
        <span className="font-semibold">{label}</span>
        <span className="block text-xs text-neutral-500">{hint}</span>
      </span>
    </label>
  );

  return (
    <div role="dialog" aria-modal="true" aria-label="Activer les notifications" className="fixed inset-0 z-[96] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 bg-surface p-6 shadow-2xl">
        <div className="text-center">
          <p aria-hidden className="text-4xl">🔔</p>
          <h2 className="mt-1 font-display text-2xl font-bold uppercase tracking-wide">Ne rate rien !</h2>
          <p className="mt-1 text-sm text-neutral-600">Reçois une notification sur ton téléphone ou ton ordinateur :</p>
        </div>
        <div className="space-y-2">
          {box(prematch, setPrematch, "Avant les matchs", "La veille du match, cotes des buteurs disponibles, composition publiée")}
          {box(live, setLive, "Pendant les matchs", "Coup d’envoi, buts, cartons rouges, mi-temps, fin du match, ton buteur remplacé ou entré en jeu")}
        </div>
        {support === "needs-install" && (
          <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800">
            Sur iPhone, ajoute d’abord le site à l’écran d’accueil (Safari › Partager › « Sur l’écran d’accueil »), puis active les
            notifications dans Mon compte. Tes choix sont enregistrés dès maintenant.
          </p>
        )}
        {(support === "unsupported" || support === "unconfigured") && (
          <p className="rounded-lg bg-neutral-100 px-3 py-2 text-xs text-neutral-700">
            Ce navigateur ne permet pas les notifications. Tes choix sont enregistrés pour tes autres appareils.
          </p>
        )}
        {support === "denied" && (
          <p className="rounded-lg bg-amber-100 px-3 py-2 text-xs text-amber-800">
            Les notifications du site sont bloquées dans ce navigateur : autorise-les dans ses réglages, puis active-les dans Mon compte.
          </p>
        )}
        {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
        <div className="space-y-2">
          <button type="button" onClick={activate} disabled={busy} className="btn-primary w-full">
            {busy ? "Activation…" : support === "ok" && (live || prematch) ? "Activer les notifications" : "Enregistrer mes choix"}
          </button>
          <button type="button" onClick={later} disabled={busy} className="w-full text-sm text-neutral-500 underline underline-offset-2">
            Plus tard
          </button>
        </div>
      </div>
    </div>
  );
}
