import { describe, expect, it } from "vitest";
import { directionBetween } from "../nav-direction";

describe("Sens des transitions de la barre du bas", () => {
  it("vers un onglet à droite : la page arrive de la droite", () => {
    expect(directionBetween("/", "/classement")).toBe("right");
    expect(directionBetween("/ligues", "/compte")).toBe("right");
  });
  it("vers un onglet à gauche : de la gauche", () => {
    expect(directionBetween("/compte", "/")).toBe("left");
    expect(directionBetween("/classement", "/ligues")).toBe("left");
  });
  it("même onglet, ou page hors barre : pas de glissement", () => {
    expect(directionBetween("/", "/")).toBeNull();
    expect(directionBetween("/regles", "/")).toBeNull();
    expect(directionBetween("/", "/actus")).toBe("left");
    expect(directionBetween("/ligue", "/ligues")).toBeNull();
  });
});
