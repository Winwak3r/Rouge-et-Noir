import { describe, expect, it } from "vitest";
import { gateDecision, gateMode } from "../sync/wake-gate";

const at = (iso: string) => new Date(iso);

describe("Portier de la synchronisation (base en veille hors matchs)", () => {
  const k = [at("2026-11-22T16:15:00Z")];
  it("mode selon la distance au coup d'envoi", () => {
    expect(gateMode(k, at("2026-11-22T14:00:00Z"))).toBe("hot"); // 2 h 15 avant
    expect(gateMode(k, at("2026-11-22T19:30:00Z"))).toBe("hot"); // pendant / après le match
    expect(gateMode(k, at("2026-11-22T21:00:00Z"))).toBe("cold"); // plus de 4 h après
    expect(gateMode(k, at("2026-11-21T16:30:00Z"))).toBe("warm"); // la veille
    expect(gateMode(k, at("2026-11-19T12:00:00Z"))).toBe("cold"); // 3 jours avant
    expect(gateMode([], at("2026-11-19T12:00:00Z"))).toBe("cold");
  });
  it("fréquence : chaque appel en match, 20 min la veille, 6 h sinon", () => {
    const now = at("2026-11-19T12:00:00Z");
    const ago = (m: number) => now.getTime() - m * 60_000;
    expect(gateDecision("hot", ago(1), now)).toBe(true);
    expect(gateDecision("warm", ago(10), now)).toBe(false);
    expect(gateDecision("warm", ago(20), now)).toBe(true);
    expect(gateDecision("cold", ago(120), now)).toBe(false);
    expect(gateDecision("cold", ago(360), now)).toBe(true);
    expect(gateDecision("cold", null, now)).toBe(true); // premier appel
  });
});
