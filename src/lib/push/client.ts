// Abonnement de l'appareil aux notifications, côté navigateur (partagé par les écrans qui le proposent).

export type PushSupport = "unconfigured" | "unsupported" | "needs-install" | "denied" | "ok";

/** Clé publique VAPID (base64url) → octets, comme l'exige l'abonnement. */
function toKey(b64: string): Uint8Array {
  const raw = atob((b64 + "=".repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

export function pushSupport(publicKey: string | null): PushSupport {
  if (!publicKey) return "unconfigured";
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone =
    window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
  if (!("serviceWorker" in navigator && "PushManager" in window && "Notification" in window)) return ios && !standalone ? "needs-install" : "unsupported";
  if (Notification.permission === "denied") return "denied";
  return "ok";
}

/** Demande l'autorisation puis abonne cet appareil (à appeler directement depuis un clic). */
export async function subscribeThisDevice(publicKey: string): Promise<void> {
  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Autorisation refusée : tu pourras les activer plus tard dans Mon compte › Notifications.");
  const reg = await navigator.serviceWorker.register("/sw.js");
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(publicKey) as BufferSource }));
  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Enregistrement impossible.");
}
