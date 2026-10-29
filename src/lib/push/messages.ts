// Textes des notifications et fenêtre des rappels (fonctions pures, testées).
export const PUSH_LEAD_MS = 60 * 60_000; // rappel 1 h avant le verrouillage

export interface PushText {
  title: string;
  body: string;
  url: string;
  tag: string;
}

export const GENERIC_MESSAGE: PushText = {
  title: "Rouge & Noir",
  body: "Pense à vérifier tes pronostics du prochain match du Stade Rennais.",
  url: "/",
  tag: "rappel",
};
export const TEST_MESSAGE: PushText = {
  title: "Rouge & Noir : notifications activées",
  body: "Test réussi : tu recevras un rappel une heure avant chaque match si ton pronostic n’est pas saisi.",
  url: "/compte",
  tag: "test",
};

/** Le rappel est dû entre « 1 h avant le verrouillage » et le verrouillage. */
export function reminderDue(lockAt: Date, now: Date, leadMs = PUSH_LEAD_MS): boolean {
  const t = lockAt.getTime() - now.getTime();
  return t > 0 && t <= leadMs;
}

const hhmm = (d: Date) =>
  new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "2-digit", minute: "2-digit" }).format(d);

export function reminderText(i: { home: string; away: string; lockAt: Date; now: Date; matchId: string }): PushText {
  const minutes = Math.max(1, Math.round((i.lockAt.getTime() - i.now.getTime()) / 60_000));
  return {
    title: `Coup d’envoi dans ${minutes} min : pronostic à faire`,
    body: `${i.home} – ${i.away} : tu n’as pas encore saisi ton pronostic. Clôture à ${hhmm(i.lockAt)} (heure de Paris).`,
    url: `/#match-${i.matchId}`,
    tag: `rappel-${i.matchId}`,
  };
}

/** Message de l'admin : contrôles de longueur. */
export function validateBroadcast(i: { title: string; body: string }): { ok: true; title: string; body: string } | { ok: false; error: string } {
  const title = i.title.trim().replace(/\s+/g, " ");
  const body = i.body.replace(/\r\n/g, "\n").trim();
  if (title.length < 3 || title.length > 60) return { ok: false, error: "Le titre doit faire entre 3 et 60 caractères." };
  if (body.length < 5 || body.length > 240) return { ok: false, error: "Le message doit faire entre 5 et 240 caractères." };
  return { ok: true, title, body };
}
