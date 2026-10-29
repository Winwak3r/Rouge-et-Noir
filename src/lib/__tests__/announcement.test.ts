import { describe, expect, it } from "vitest";
import { effectiveContent, nextVersion, shouldShowAnnouncement, validateAnnouncement } from "../announcement";

const a = { title: "Info", body: "Match avancé.", askNotifications: false, active: true, version: 3 };

describe("Message d'ouverture", () => {
  it("affiché une fois par appareil et par version", () => {
    expect(shouldShowAnnouncement(a, undefined)).toBe(true);
    expect(shouldShowAnnouncement(a, "3")).toBe(false);
    expect(shouldShowAnnouncement(a, "2")).toBe(true);
    expect(shouldShowAnnouncement({ ...a, active: false }, undefined)).toBe(false);
  });
  it("invitation aux notifications : texte type si vide", () => {
    expect(effectiveContent({ title: "", body: "", askNotifications: true }).title).toBe("Active les notifications");
  });
  it("nouvelle version seulement si le contenu change", () => {
    expect(nextVersion(a, { ...a })).toBe(3);
    expect(nextVersion(a, { ...a, body: "Autre." })).toBe(4);
  });
  it("refuse un message publié sans titre", () => {
    expect(validateAnnouncement({ title: "", body: "x", askNotifications: false, active: true }).ok).toBe(false);
  });
});
