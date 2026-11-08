import { describe, expect, it } from "vitest";
import { ageOn, nationalityFr } from "../nationality";

describe("Effectif : âge et nationalité", () => {
  it("nationalités traduites, inconnues gardées telles quelles", () => {
    expect(nationalityFr("Senegal")).toBe("Sénégal");
    expect(nationalityFr("Ivory Coast")).toBe("Côte d’Ivoire");
    expect(nationalityFr("Atlantis")).toBe("Atlantis");
    expect(nationalityFr(null)).toBeNull();
  });
  it("âge à la date du jour (anniversaire pas encore passé : un an de moins)", () => {
    const now = new Date("2026-11-08T12:00:00Z");
    expect(ageOn(new Date("2000-11-08T00:00:00Z"), now)).toBe(26);
    expect(ageOn(new Date("2000-12-01T00:00:00Z"), now)).toBe(25);
    expect(ageOn(null, now)).toBeNull();
  });
});
