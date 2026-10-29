import { describe, expect, it } from "vitest";
import { parseOddsInput, parseRulesForm } from "../rules-form";

const valid = {
  exact: "4", goalDiff: "2", outcome: "1", wrong: "0", missing: "-1",
  oddsDivisor: "2", minBonus: "1", maxBonus: "6", fixedBonus: "1", noScorerBonus: "2",
  knockout: "AFTER_EXTRA_TIME", fallbackMode: "FIXED",
};

describe("Formulaire de barème", () => {
  it("accepte le barème par défaut", () => {
    const r = parseRulesForm(valid);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.rules.points).toEqual({ exact: 4, goalDiff: 2, outcome: 1, wrong: 0, missing: -1 });
  });
  it("accepte un diviseur décimal avec virgule", () => {
    const r = parseRulesForm({ ...valid, oddsDivisor: "1,5" });
    expect(r.ok && r.rules.scorerBonus.oddsDivisor).toBe(1.5);
  });
  it("refuse un ordre incohérent et les valeurs hors limites", () => {
    expect(parseRulesForm({ ...valid, goalDiff: "5" }).ok).toBe(false);
    expect(parseRulesForm({ ...valid, missing: "2" }).ok).toBe(false);
    expect(parseRulesForm({ ...valid, exact: "abc" }).ok).toBe(false);
    expect(parseRulesForm({ ...valid, minBonus: "4", maxBonus: "3" }).ok).toBe(false);
  });
});

describe("Cote saisie par l'admin", () => {
  it("lit les cotes décimales", () => {
    expect(parseOddsInput("3,75")).toBe(3.75);
    expect(parseOddsInput("12")).toBe(12);
  });
  it("refuse les cotes invalides", () => {
    expect(parseOddsInput("1")).toBeNull();
    expect(parseOddsInput("11/4")).toBeNull();
    expect(parseOddsInput("abc")).toBeNull();
  });
});
