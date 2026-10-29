// Textes des e-mails (fonctions pures, testées).

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

const layout = (body: string) =>
  `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto;color:#111">` +
  `<p style="font-size:20px;font-weight:800;margin:0 0 16px"><span style="color:#e1001a">ROUGE</span> &amp; NOIR</p>${body}` +
  `<p style="font-size:12px;color:#777;margin-top:24px">Rouge &amp; Noir — Les Pronostics</p></div>`;

const button = (href: string, label: string) =>
  `<p><a href="${href}" style="display:inline-block;background:#e1001a;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;font-weight:700">${label}</a></p>`;

export function verifyEmail(i: { pseudo: string; link: string }) {
  return {
    subject: "Rouge & Noir — confirme ton adresse e-mail",
    text: `Bonjour ${i.pseudo},\n\nBienvenue sur Rouge & Noir ! Pour confirmer ton compte, ouvre ce lien (valable 48 heures) :\n${i.link}\n\nSi tu ne t’es pas inscrit, ignore cet e-mail.`,
    html: layout(
      `<p>Bonjour ${esc(i.pseudo)},</p><p>Bienvenue sur Rouge &amp; Noir ! Pour confirmer ton compte, clique sur le bouton (lien valable 48 heures) :</p>${button(i.link, "Confirmer mon adresse")}<p style="font-size:13px;color:#555">Si tu ne t’es pas inscrit, ignore cet e-mail.</p>`,
    ),
  };
}

export function reminderEmail(i: { pseudo: string; home: string; away: string; deadline: string; link: string; settingsLink: string }) {
  return {
    subject: `Rouge & Noir — pronostic à faire : ${i.home} – ${i.away}`,
    text: `Bonjour ${i.pseudo},\n\nTu n’as pas encore saisi ton pronostic pour ${i.home} – ${i.away}. Clôture ${i.deadline} (heure de Paris).\n\nPronostiquer : ${i.link}\n\nNe plus recevoir ces rappels : ${i.settingsLink}`,
    html: layout(
      `<p>Bonjour ${esc(i.pseudo)},</p><p>Tu n’as pas encore saisi ton pronostic pour <strong>${esc(i.home)} – ${esc(i.away)}</strong>.<br>Clôture <strong>${esc(i.deadline)}</strong> (heure de Paris).</p>${button(i.link, "Faire mon pronostic")}<p style="font-size:12px;color:#777">Ne plus recevoir ces rappels : <a href="${i.settingsLink}">Mon compte › Notifications</a></p>`,
    ),
  };
}

/** Rappel e-mail dû entre 2 h avant le verrouillage et le verrouillage. */
export function emailReminderDue(lockAt: Date, now: Date, leadMs = 2 * 3600_000): boolean {
  const t = lockAt.getTime() - now.getTime();
  return t > 0 && t <= leadMs;
}

export function changeEmailConfirm(i: { pseudo: string; link: string; newEmail: string }) {
  return {
    subject: "Rouge & Noir — confirme ta nouvelle adresse e-mail",
    text: `Bonjour ${i.pseudo},\n\nPour utiliser ${i.newEmail} sur Rouge & Noir, ouvre ce lien (valable 48 heures) :\n${i.link}\n\nSi tu n’as rien demandé, ignore cet e-mail : ton adresse ne changera pas.`,
    html: layout(
      `<p>Bonjour ${esc(i.pseudo)},</p><p>Pour utiliser <strong>${esc(i.newEmail)}</strong> sur Rouge &amp; Noir, clique sur le bouton (lien valable 48 heures) :</p>${button(i.link, "Confirmer ma nouvelle adresse")}<p style="font-size:13px;color:#555">Si tu n’as rien demandé, ignore cet e-mail : ton adresse ne changera pas.</p>`,
    ),
  };
}

export function emailChangedNotice(i: { pseudo: string; newEmail: string }) {
  return {
    subject: "Rouge & Noir — ton adresse e-mail a été modifiée",
    text: `Bonjour ${i.pseudo},\n\nL’adresse e-mail de ton compte Rouge & Noir est maintenant ${i.newEmail}.\nSi tu n’es pas à l’origine de ce changement, contacte l’organisateur.`,
    html: layout(
      `<p>Bonjour ${esc(i.pseudo)},</p><p>L’adresse e-mail de ton compte Rouge &amp; Noir est maintenant <strong>${esc(i.newEmail)}</strong>.</p><p style="font-size:13px;color:#555">Si tu n’es pas à l’origine de ce changement, contacte l’organisateur.</p>`,
    ),
  };
}
