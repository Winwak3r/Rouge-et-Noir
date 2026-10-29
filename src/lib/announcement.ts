// Message d'ouverture de l'administrateur (repris de F1 Pronos) : règles d'affichage et contrôles (fonctions pures).
export const announceCookie = (userId: string) => `announce_${userId}`;

export const DEFAULT_NOTIF_TITLE = "Active les notifications";
export const DEFAULT_NOTIF_BODY =
  "Pour ne plus oublier tes pronostics, active les notifications de Rouge & Noir : tu recevras un rappel une heure avant chaque match si ton pronostic n’est pas saisi.";

export interface AnnouncementInput {
  title: string;
  body: string;
  askNotifications: boolean;
  active: boolean;
}

/** Avec la case « notifications », un titre ou un message vide est remplacé par le message type. */
export function effectiveContent(a: { title: string; body: string; askNotifications: boolean }): { title: string; body: string } {
  const title = a.title.trim();
  const body = a.body.trim();
  return a.askNotifications ? { title: title || DEFAULT_NOTIF_TITLE, body: body || DEFAULT_NOTIF_BODY } : { title, body };
}

/** Affiché si actif, avec un contenu, et si CET appareil n'a pas encore validé cette version. */
export function shouldShowAnnouncement(a: (AnnouncementInput & { version: number }) | null, cookieValue: string | undefined): boolean {
  if (!a || !a.active) return false;
  const c = effectiveContent(a);
  if (!c.title && !c.body) return false;
  return cookieValue !== String(a.version);
}

export function validateAnnouncement(i: AnnouncementInput): { ok: true; data: AnnouncementInput } | { ok: false; error: string } {
  const title = i.title.trim();
  const body = i.body.replace(/\r\n/g, "\n").trim();
  if (title.length > 80) return { ok: false, error: "Le titre ne doit pas dépasser 80 caractères." };
  if (body.length > 2000) return { ok: false, error: "Le message ne doit pas dépasser 2000 caractères." };
  if (i.active && !effectiveContent({ title, body, askNotifications: i.askNotifications }).title) {
    return { ok: false, error: "Ajoute un titre (ou coche l’invitation aux notifications) pour publier le message." };
  }
  return { ok: true, data: { title, body, askNotifications: i.askNotifications, active: i.active } };
}

/** Nouvelle version (le message revient une fois chez tous) si le contenu change ou s'il est réactivé. */
export function nextVersion(prev: (AnnouncementInput & { version: number }) | null, next: AnnouncementInput): number {
  if (!prev) return 1;
  const changed =
    prev.title !== next.title || prev.body !== next.body || prev.askNotifications !== next.askNotifications || (!prev.active && next.active);
  return changed ? prev.version + 1 : prev.version;
}
