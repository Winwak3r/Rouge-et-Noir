import { describe, expect, it } from "vitest";
import { reminderDue, reminderText, validateBroadcast } from "../messages";
import { vapidJwt } from "../webpush";
import { generateKeyPairSync, verify, createPublicKey } from "node:crypto";

const LOCK = new Date("2030-03-01T19:00:00Z");
const min = (n: number) => new Date(LOCK.getTime() - n * 60_000);

describe("Rappels", () => {
  it("dus dans l'heure qui précède le verrouillage seulement", () => {
    expect(reminderDue(LOCK, min(90))).toBe(false);
    expect(reminderDue(LOCK, min(59))).toBe(true);
    expect(reminderDue(LOCK, min(1))).toBe(true);
    expect(reminderDue(LOCK, LOCK)).toBe(false);
  });
  it("texte du rappel", () => {
    const t = reminderText({ home: "Stade Rennais", away: "Nantes", lockAt: LOCK, now: min(45), matchId: "m1" });
    expect(t.title).toBe("Coup d’envoi dans 45 min : pronostic à faire");
    expect(t.body).toContain("Clôture à 20:00");
    expect(t.url).toBe("/#match-m1");
  });
});

describe("Message de l'admin", () => {
  it("contrôle les longueurs", () => {
    expect(validateBroadcast({ title: "Match avancé", body: "Le match de samedi est avancé à 17 h." }).ok).toBe(true);
    expect(validateBroadcast({ title: "x", body: "Le match est avancé." }).ok).toBe(false);
    expect(validateBroadcast({ title: "Titre", body: "a".repeat(300) }).ok).toBe(false);
  });
});

describe("Signature VAPID", () => {
  it("produit un jeton ES256 vérifiable avec la clé publique", () => {
    const { privateKey, publicKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
    const jwk = privateKey.export({ format: "jwk" }) as { d: string; x: string; y: string };
    const raw = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]);
    const token = vapidJwt("https://push.example.com/abc", { publicKey: raw.toString("base64url"), privateKey: jwk.d, subject: "mailto:a@b.fr" });
    const [h, p, sig] = token.split(".");
    expect(JSON.parse(Buffer.from(p, "base64url").toString()).aud).toBe("https://push.example.com");
    const ok = verify("sha256", Buffer.from(`${h}.${p}`), { key: createPublicKey(publicKey.export({ format: "pem", type: "spki" })), dsaEncoding: "ieee-p1363" }, Buffer.from(sig, "base64url"));
    expect(ok).toBe(true);
  });
});
