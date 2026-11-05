import { describe, expect, it } from "vitest";
import { clubColors, clubLogo, genericClubLogo } from "../club-logo";

describe("Logos factices des clubs", () => {
  it("couleurs : réglées (ou ESPN) d'abord, puis le tableau connu", () => {
    expect(clubColors({ name: "Paris Saint-Germain" })).toEqual(["#004170", "#DA291C"]);
    expect(clubColors({ name: "Stade Rennais", color1: "123456", color2: "#abcdef" })).toEqual(["#123456", "#ABCDEF"]);
    expect(clubColors({ name: "Lille" })).toEqual(["#E01E13", "#20325F"]);
  });
  it("club inconnu : couleur stable déduite du nom", () => {
    expect(clubColors({ name: "FC Inconnu" })).toEqual(clubColors({ name: "FC Inconnu" }));
  });
  it("rond partagé en deux : deux rectangles des deux couleurs, image SVG en ligne", () => {
    const uri = genericClubLogo(["#004170", "#DA291C"]);
    expect(uri.startsWith("data:image/svg+xml;utf8,")).toBe(true);
    const svg = decodeURIComponent(uri.split(",")[1]);
    expect(svg).toContain('fill="#004170"');
    expect(svg).toContain('x="32" width="32" height="64" fill="#DA291C"');
  });
  it("mode officiel : l'écusson ESPN ; factice : le rond", () => {
    const t = { name: "Lille", logoUrl: "https://espn/lille.png" };
    expect(clubLogo(t, "official")).toBe("https://espn/lille.png");
    expect(clubLogo(t, "generic")?.startsWith("data:image/svg+xml")).toBe(true);
  });
});
