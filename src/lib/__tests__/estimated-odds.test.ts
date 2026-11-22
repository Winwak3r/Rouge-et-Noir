import { describe, expect, it } from "vitest";
import { averageOdds } from "../odds-average";

const m = (iso: string, entries: [string, number][]) => ({ kickoffAt: new Date(iso), odds: new Map(entries) });

describe("Cotes estimées (moyenne des 5 derniers matchs)", () => {
  const history = [
    m("2026-08-15T19:00:00Z", [["dia", 4], ["camara", 10]]),
    m("2026-08-23T19:00:00Z", [["dia", 3]]),
    m("2026-08-30T19:00:00Z", [["dia", 5], ["camara", 8]]),
    m("2026-09-13T19:00:00Z", [["dia", 3.5]]),
    m("2026-09-20T19:00:00Z", [["dia", 4.5]]),
    m("2026-09-27T19:00:00Z", [["dia", 2]]),
    m("2026-10-04T19:00:00Z", []), // match sans cote : ignoré
  ];
  it("5 derniers matchs avec cotes, moyenne par joueur", () => {
    const est = averageOdds(history, new Date("2026-10-18T19:00:00Z"));
    // dia : 3 + 5 + 3.5 + 4.5 + 2 → 3.6 ; camara : seulement le 30/08 dans les 5 derniers → 8
    expect(est.get("dia")).toBe(3.6);
    expect(est.get("camara")).toBe(8);
  });
  it("début de saison : moyenne des matchs précédents disponibles", () => {
    const est = averageOdds(history, new Date("2026-08-30T19:00:00Z"));
    expect(est.get("dia")).toBe(3.5); // (4 + 3) / 2
    expect(est.get("camara")).toBe(10);
  });
  it("1er match de la saison : aucune estimation", () => {
    expect(averageOdds(history, new Date("2026-08-15T19:00:00Z")).size).toBe(0);
  });
});
