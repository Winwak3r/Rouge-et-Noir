import { describe, expect, it } from "vitest";
import { parisLocalToDate, toParisLocalInput } from "../dates";

describe("Heure de Paris", () => {
  it("hiver : UTC+1", () => {
    expect(parisLocalToDate("2026-12-20T15:00")?.toISOString()).toBe("2026-12-20T14:00:00.000Z");
  });
  it("été : UTC+2", () => {
    expect(parisLocalToDate("2027-05-10T21:00")?.toISOString()).toBe("2027-05-10T19:00:00.000Z");
  });
  it("aller-retour avec le champ du formulaire", () => {
    expect(toParisLocalInput(new Date("2026-10-25T15:15:00Z"))).toBe("2026-10-25T16:15");
  });
  it("refuse une saisie invalide", () => {
    expect(parisLocalToDate("25/10/2026 16:15")).toBeNull();
  });
});

describe("Disparition de l'encart « Match terminé »", () => {
  it("match fini dimanche soir → minuit à la fin du lundi (heure de Paris)", async () => {
    const { endOfNextDayParis } = await import("../dates");
    // fin du match dimanche 25/10/2026 à 19:15 (Paris) = 18:15 UTC
    expect(endOfNextDayParis(new Date("2026-10-25T18:15:00Z")).toISOString()).toBe("2026-10-26T23:00:00.000Z");
  });
  it("match fini après minuit (prolongations) : on compte à partir du jour de fin", async () => {
    const { endOfNextDayParis } = await import("../dates");
    expect(endOfNextDayParis(new Date("2027-03-03T23:30:00Z")).toISOString()).toBe("2027-03-05T23:00:00.000Z");
  });
});
