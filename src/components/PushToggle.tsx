"use client";

import { useEffect, useState } from "react";

type Status = "checking" | "unconfigured" | "unsupported" | "needs-install" | "denied" | "off" | "on";

/** Clé publique VAPID (base64url) → octets, comme l'exige l'abonnement. */
function toKey(b64: string): Uint8Array {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

/** Notifications de rappel sur cet appareil : activer, tester, désactiver (repris de F1 Pronos). */
export function PushToggle({ publicKey, compact = false }: { publicKey: string | null; compact?: boolean }) {
  const [status, setStatus] = useState<Status>("checking");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    (async () => {
      if (!publicKey) return setStatus("unconfigured");
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
      if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) {
        return setStatus(ios && !standalone ? "needs-install" : "unsupported");
      }
      if (Notification.permission === "denied") return setStatus("denied");
      const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
      setStatus(sub && Notification.permission === "granted" ? "on" : "off");
    })().catch(() => setStatus("unsupported"));
  }, [publicKey]);

  const currentSub = async () => (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription() ?? null;

  async function enable() {
    setBusy(true);
    setMsg(null);
    try {
      const perm = await Notification.requestPermission(); // doit suivre directement le toucher du bouton
      if (perm !== "granted") {
        setStatus(perm === "denied" ? "denied" : "off");
        throw new Error("Autorisation refusée : active les notifications du site dans les réglages du téléphone.");
      }
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
      const sub =
        (await reg.pushManager.getSubscription()) ??
        (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey!) as BufferSource }));
      const res = await post("/api/push/subscribe", { endpoint: sub.endpoint });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Enregistrement impossible.");
      setStatus("on");
      setMsg({ ok: true, text: "Notifications activées sur cet appareil. Utilise « Envoyer un test » pour vérifier." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function disable() {
    setBusy(true);
    setMsg(null);
    try {
      const sub = await currentSub();
      if (sub) {
        await post("/api/push/unsubscribe", { endpoint: sub.endpoint });
        await sub.unsubscribe();
      }
      setStatus("off");
      setMsg({ ok: true, text: "Notifications désactivées sur cet appareil." });
    } catch {
      setMsg({ ok: false, text: "Désactivation impossible." });
    } finally {
      setBusy(false);
    }
  }

  async function test() {
    setBusy(true);
    setMsg(null);
    try {
      const sub = await currentSub();
      if (!sub) throw new Error("Aucun abonnement sur cet appareil : réactive les notifications.");
      const res = await post("/api/push/test", { endpoint: sub.endpoint });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Test impossible.");
      setMsg({ ok: true, text: "Notification de test envoyée : elle doit apparaître dans quelques secondes." });
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 text-sm">
      {!compact && (
        <p className="text-neutral-600">
          Un rappel une heure avant chaque match si ton pronostic n’est pas saisi, et les messages importants de l’organisateur.
        </p>
      )}
      {status === "checking" && <p className="text-neutral-500">Vérification…</p>}
      {status === "unconfigured" && <p className="text-orange-700">Les notifications ne sont pas encore configurées sur le serveur : préviens l’organisateur.</p>}
      {status === "needs-install" && (
        <p className="text-orange-700">
          Sur iPhone, installe d’abord l’appli : dans Safari, touche Partager puis « Sur l’écran d’accueil », ouvre Rouge &amp; Noir depuis son icône et reviens ici.
        </p>
      )}
      {status === "unsupported" && <p className="text-orange-700">Ce navigateur ne gère pas les notifications. Essaie Chrome (Android) ou l’appli installée (iPhone).</p>}
      {status === "denied" && <p className="text-red-700">Les notifications sont bloquées pour ce site : autorise-les dans les réglages, puis reviens ici.</p>}
      <div className="flex flex-wrap gap-2">
        {status === "off" && (
          <button type="button" disabled={busy} onClick={enable} className="btn-primary px-3 py-1.5">
            Activer les notifications
          </button>
        )}
        {status === "on" && (
          <>
            <span className="rounded bg-green-100 px-2 py-1.5 text-xs font-medium text-green-800">Activées sur cet appareil</span>
            <button type="button" disabled={busy} onClick={test} className="btn-secondary px-3 py-1.5">
              Envoyer un test
            </button>
            <button type="button" disabled={busy} onClick={disable} className="btn-secondary px-3 py-1.5">
              Désactiver
            </button>
          </>
        )}
      </div>
      {msg && <p role="status" className={msg.ok ? "text-green-700" : "text-red-700"}>{msg.text}</p>}
    </div>
  );
}
