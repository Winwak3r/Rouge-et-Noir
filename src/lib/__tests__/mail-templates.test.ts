import { describe, expect, it } from "vitest";
import { emailReminderDue, reminderEmail, verifyEmail } from "../mail-templates";

describe("E-mails", () => {
  it("confirmation : lien présent, pseudo échappé dans la version HTML", () => {
    const m = verifyEmail({ pseudo: "<b>Kévin</b>", link: "https://site/verifier-email?token=abc" });
    expect(m.text).toContain("https://site/verifier-email?token=abc");
    expect(m.html).toContain("&lt;b&gt;Kévin&lt;/b&gt;");
    expect(m.html).not.toContain("<b>Kévin</b>");
  });
  it("rappel : match, heure de clôture et lien de désinscription", () => {
    const m = reminderEmail({ pseudo: "K", home: "Stade Rennais", away: "Lille", deadline: "à 17:15", link: "https://site/#m", settingsLink: "https://site/compte" });
    expect(m.subject).toBe("Rouge & Noir — pronostic à faire : Stade Rennais – Lille");
    expect(m.text).toContain("à 17:15");
    expect(m.text).toContain("https://site/compte");
  });
  it("rappel dû dans les 2 h avant le verrouillage", () => {
    const lock = new Date("2030-01-01T18:00:00Z");
    expect(emailReminderDue(lock, new Date("2030-01-01T15:30:00Z"))).toBe(false);
    expect(emailReminderDue(lock, new Date("2030-01-01T16:30:00Z"))).toBe(true);
    expect(emailReminderDue(lock, lock)).toBe(false);
  });
});
