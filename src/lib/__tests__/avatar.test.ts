import { describe, expect, it } from "vitest";
import { hueOf, initials, sniffImageType } from "../avatar";

describe("Photo de profil", () => {
  it("reconnaît le vrai format d'après le contenu", () => {
    expect(sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))).toBe("image/jpeg");
    expect(sniffImageType(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe("image/png");
    expect(sniffImageType(new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))).toBe("image/webp");
  });
  it("refuse SVG, GIF et faux fichiers", () => {
    expect(sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>"))).toBeNull();
    expect(sniffImageType(new TextEncoder().encode("GIF89a"))).toBeNull();
  });
  it("initiales et couleur stables", () => {
    expect(initials("Rouge Noir")).toBe("RN");
    expect(initials("dia-9")).toBe("D9");
    expect(initials("Marco")).toBe("M");
    expect(hueOf("Marco")).toBe(hueOf("Marco"));
  });
});
