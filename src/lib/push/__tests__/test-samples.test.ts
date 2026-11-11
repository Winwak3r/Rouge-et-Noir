import { describe, expect, it } from "vitest";
import { TEST_KINDS, sampleNotification } from "../test-samples";

const M = { id: "m1", home: "OGC Nice", away: "Stade Rennais", rennesIsHome: false, competition: "LIGUE_1", kickoffAt: new Date("2030-10-30T18:00:00Z") };

describe("Notifications de test (administration)", () => {
  it("un exemple pour chaque type, marqué [Test], ouvrant le match", () => {
    for (const [kind] of TEST_KINDS) {
      const n = sampleNotification(kind, M, "Arnaud Nordin", new Date("2030-10-29T10:00:00Z"));
      expect(n.title.startsWith("[Test] ")).toBe(true);
      expect(n.url).toBe("/#match-m1");
      expect(n.tag).toContain(`test-${kind}-`);
    }
  });
  it("le but est marqué par le Stade Rennais, avec le bon score selon le côté", () => {
    expect(sampleNotification("goal", M, "Arnaud Nordin").body).toBe("⚽ REN · But de A. Nordin (34') · 0-1");
    expect(sampleNotification("eve", M, "x").body).toContain("prévu demain à 19:00");
  });
});
