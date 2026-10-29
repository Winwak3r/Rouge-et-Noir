// Notifications Web Push (VAPID, RFC 8292) sans dépendance, reprises de F1 Pronos : notification SANS contenu.
// Le téléphone reçoit un « réveil » ; le service worker (public/sw.js) demande ensuite le texte au site.
import { createPrivateKey, sign } from "node:crypto";

export interface Vapid {
  publicKey: string;
  privateKey: string;
  subject: string;
}

/** Clés VAPID de l'environnement ; null si absentes (les notifications sont alors désactivées). */
export function vapidFromEnv(env: Record<string, string | undefined> = process.env): Vapid | null {
  const publicKey = env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = env.VAPID_PRIVATE_KEY?.trim();
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: env.VAPID_SUBJECT?.trim() || "mailto:admin@example.com" };
}

const b64u = (b: Buffer | string) => Buffer.from(b).toString("base64url");

/** Jeton signé (ES256) prouvant au service de notification que l'envoi vient de ce site. Valable 12 h. */
export function vapidJwt(endpoint: string, v: Vapid, nowSec = Math.floor(Date.now() / 1000)): string {
  const header = b64u(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payload = b64u(JSON.stringify({ aud: new URL(endpoint).origin, exp: nowSec + 12 * 3600, sub: v.subject }));
  const data = `${header}.${payload}`;
  const pub = Buffer.from(v.publicKey, "base64url"); // 0x04 | x (32 octets) | y (32 octets)
  if (pub.length !== 65 || pub[0] !== 4) throw new Error("VAPID_PUBLIC_KEY invalide (65 octets attendus).");
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", x: b64u(pub.subarray(1, 33)), y: b64u(pub.subarray(33, 65)), d: v.privateKey },
    format: "jwk",
  });
  const signature = sign("sha256", Buffer.from(data), { key, dsaEncoding: "ieee-p1363" });
  return `${data}.${b64u(signature)}`;
}

/** Envoie le « réveil ». gone = true : l'abonnement n'existe plus et doit être supprimé. */
export async function sendPush(endpoint: string, v: Vapid): Promise<{ status: number; gone: boolean }> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { Authorization: `vapid t=${vapidJwt(endpoint, v)}, k=${v.publicKey}`, TTL: "3600", Urgency: "high" },
    signal: AbortSignal.timeout(10_000),
  });
  return { status: res.status, gone: res.status === 404 || res.status === 410 };
}
