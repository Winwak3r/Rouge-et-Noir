import { describe, expect, it } from "vitest";
import { validateCompetitions, validateLeagueDescription } from "../league-rules";
import { canJoinAnother, canLoseAdmin, codeFromInput, generateInviteCode, normalizeInviteCode, validateLeagueName } from "../league-rules";

describe("Ligues", () => {
  it("codes d'invitation lisibles, sans caractères ambigus", () => {
    for (let i = 0; i < 50; i++) expect(generateInviteCode()).toMatch(/^[A-HJ-KM-NP-Z2-9]{8}$/);
  });
  it("le code peut être saisi en minuscules, avec tiret, ou collé sous forme de lien", () => {
    expect(normalizeInviteCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(codeFromInput("https://site.fr/rejoindre/ABCD2345")).toBe("ABCD2345");
    expect(codeFromInput("x")).toBeNull();
  });
  it("nom de ligue", () => {
    expect(validateLeagueName("  Les   Bréquignistes ")).toEqual({ ok: true, name: "Les Bréquignistes" });
    expect(validateLeagueName("ab").ok).toBe(false);
  });
  it("description : 120 caractères au plus, vide = aucune", () => {
    expect(validateLeagueDescription("  Rejoins le groupe de l’association  ")).toEqual({ ok: true, description: "Rejoins le groupe de l’association" });
    expect(validateLeagueDescription("")).toEqual({ ok: true, description: null });
    expect(validateLeagueDescription("x".repeat(121)).ok).toBe(false);
  });
  it("au moins une compétition, dans l'ordre habituel", () => {
    expect(validateCompetitions(["COUPE_DE_FRANCE", "LIGUE_1", "intrus"])).toEqual({ ok: true, competitions: ["LIGUE_1", "COUPE_DE_FRANCE"] });
    expect(validateCompetitions([]).ok).toBe(false);
  });
  it("3 ligues au maximum par joueur", () => {
    expect(canJoinAnother(2)).toBe(true);
    expect(canJoinAnother(3)).toBe(false);
  });
  it("il reste toujours au moins un admin dans une ligue", () => {
    expect(canLoseAdmin(1, true)).toBe(false);
    expect(canLoseAdmin(2, true)).toBe(true);
    expect(canLoseAdmin(1, false)).toBe(true);
  });
});
