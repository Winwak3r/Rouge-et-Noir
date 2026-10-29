import { describe, expect, it } from "vitest";
import { shortPlayerName } from "../player-name";

describe("Nom court du joueur", () => {
  it("initiale du prénom", () => {
    expect(shortPlayerName("Mousa Al-Tamari")).toBe("M. Al-Tamari");
    expect(shortPlayerName("Abdelhamid Aït Boudlal")).toBe("A. Aït Boudlal");
    expect(shortPlayerName("Brice Samba")).toBe("B. Samba");
  });
  it("un seul mot : inchangé", () => {
    expect(shortPlayerName("Raphinha")).toBe("Raphinha");
  });
});
