import { describe, expect, it } from "vitest";
import { simulateResult } from "../simulation";

const seq = (...v: number[]) => {
  let i = 0;
  return () => v[i++ % v.length];
};

describe("Simulation de match", () => {
  it("score imposé par l'admin : un buteur rennais par but", () => {
    const r = simulateResult(["dia", "blas", "nordin"], { rennes: 2, opponent: 1 }, seq(0.01, 0.99));
    expect(r).toMatchObject({ rennes: 2, opponent: 1 });
    expect(r.scorerIds).toEqual(["dia", "nordin"]);
  });
  it("score tiré au sort entre 0 et 4", () => {
    for (let i = 0; i < 50; i++) {
      const r = simulateResult(["a"]);
      expect(r.rennes >= 0 && r.rennes <= 4 && r.opponent >= 0 && r.opponent <= 4).toBe(true);
      expect(r.scorerIds.length).toBe(r.rennes);
    }
  });
  it("sans joueur disponible : pas de buteur (but non attribué)", () => {
    expect(simulateResult([], { rennes: 1, opponent: 0 }).scorerIds).toEqual([]);
  });
});
