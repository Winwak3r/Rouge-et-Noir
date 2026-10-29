import { describe, expect, it } from "vitest";
import { mobileTeamName } from "../team-names";

describe("Noms courts sur mobile", () => {
  it("remplace les noms demandés", () => {
    expect(mobileTeamName("Le Havre AC")).toBe("Le Havre");
    expect(mobileTeamName("Paris Saint-Germain")).toBe("PSG");
    expect(mobileTeamName("AJ Auxerre")).toBe("Auxerre");
    expect(mobileTeamName("Marseille")).toBe("OM");
    expect(mobileTeamName("Strasbourg")).toBe("RCSA");
    expect(mobileTeamName("Stade Rennais", true)).toBe("SRFC");
  });
  it("garde les autres noms", () => {
    expect(mobileTeamName("Lille")).toBeNull();
  });
});
