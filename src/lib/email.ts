// Envoi des e-mails (confirmation de compte, mot de passe oublié, rappels).
// 1) Gmail (GMAIL_USER + GMAIL_APP_PASSWORD) ; 2) sinon Resend (RESEND_API_KEY) ;
// 3) sinon, en développement : le message s'affiche dans le terminal.
import nodemailer, { type Transporter } from "nodemailer";

interface Email {
  to: string;
  subject: string;
  text: string;
  html: string;
}

let gmail: Transporter | null = null;

function gmailTransport(): Transporter | null {
  const user = process.env.GMAIL_USER?.trim();
  const pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s+/g, ""); // le code Google s'affiche par groupes de 4
  if (!user || !pass) return null;
  gmail ??= nodemailer.createTransport({ host: "smtp.gmail.com", port: 465, secure: true, auth: { user, pass } });
  return gmail;
}

export function emailConfigured(): boolean {
  return Boolean((process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) || (process.env.RESEND_API_KEY && process.env.EMAIL_FROM));
}

export async function sendEmail({ to, subject, text, html }: Email): Promise<void> {
  const viaGmail = gmailTransport();
  if (viaGmail) {
    const user = process.env.GMAIL_USER!.trim();
    // Gmail impose l'adresse du compte comme expéditeur ; seul le nom affiché est libre
    const from = process.env.EMAIL_FROM?.trim() || `Rouge & Noir <${user}>`;
    await viaGmail.sendMail({ from, to, subject, text, html });
    return;
  }

  const key = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) {
    console.info(`\n[E-mail non envoyé : aucun service d'envoi configuré]\nÀ : ${to}\nObjet : ${subject}\n${text}\n`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to, subject, text, html }),
  });
  if (!res.ok) throw new Error(`Envoi de l'e-mail impossible (HTTP ${res.status}).`);
}

export function appUrl(path: string): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return base + path;
}
