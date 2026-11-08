import { describe, expect, it } from "vitest";
import { teamAbbr } from "../team-abbr";

describe("Abréviations des clubs (en-tête réduit)", () => {
  it("sigles usuels", () => {
    expect(teamAbbr("Stade Rennais")).toBe("REN");
    expect(teamAbbr("Paris Saint-Germain")).toBe("PSG");
    expect(teamAbbr("Lille")).toBe("LIL");
    expect(teamAbbr("Saint-Étienne")).toBe("ASSE");
  });
  it("club inconnu : 3 premières lettres du nom (hors « FC », « Stade »…)", () => {
    expect(teamAbbr("FC Copenhague")).toBe("COP");
    expect(teamAbbr("Real Betis")).toBe("BET");
  });
});
