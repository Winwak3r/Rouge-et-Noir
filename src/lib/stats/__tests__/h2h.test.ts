// Données FICTIVES.
import { describe, expect, it } from "vitest";
import { headToHeadSummary, pickHeadToHead } from "../h2h";

let id = 0;
const r = (year: number, home: number, away: number, hg: number, ag: number) => ({
  id: ++id,
  date: new Date(Date.UTC(year, 2, 1)),
  homeId: home,
  awayId: away,
  homeName: `E${home}`,
  awayName: `E${away}`,
  homeGoals: hg,
  awayGoals: ag,
  goals: null,
});

describe("Confrontations directes (même configuration)", () => {
  const list = [
    r(2026, 169, 8, 2, 0),
    r(2025, 169, 8, 1, 1),
    r(2025, 8, 169, 3, 0), // Lille à domicile : exclu
    r(2024, 169, 8, 0, 1),
    r(2023, 169, 8, 2, 1),
    r(2022, 169, 8, 1, 0),
    r(2021, 169, 8, 4, 2), // 6e plus ancienne : exclue
    r(2030, 169, 8, 5, 0), // pas encore jouée (après la date du match) : exclue
  ];
  it("5 dernières, plus récentes d'abord, seulement avec la même équipe à domicile", () => {
    const h = pickHeadToHead([...list, list[0]], 169, 8, 5, new Date(Date.UTC(2027, 0, 1)));
    expect(h.map((m) => `${m.date.getUTCFullYear()} ${m.homeGoals}-${m.awayGoals} ${m.result}`)).toEqual([
      "2026 2-0 V",
      "2025 1-1 N",
      "2024 0-1 D",
      "2023 2-1 V",
      "2022 1-0 V",
    ]);
    expect(headToHeadSummary(h)).toEqual({ wins: 3, draws: 1, losses: 1 });
  });
});
