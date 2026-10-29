"use server";

import { createHash, randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  LIMITS,
  clearFailures,
  clientIp,
  isLimited,
  purgeOldAttempts,
  recordAttempt,
} from "@/lib/auth/rate-limit";
import { createSession, destroySession, getCurrentUser, requireUser } from "@/lib/auth/session";
import { sendEmailChangeLink, sendVerificationEmail } from "@/lib/auth/verification";
import { cookies } from "next/headers";
import { JOIN_COOKIE, VIEW_COOKIE, WELCOME_COOKIE } from "@/lib/league-rules";
import { joinLeague } from "@/lib/leagues";
import { appUrl, sendEmail } from "@/lib/email";
import {
  emailSchema,
  firstError,
  loginSchema,
  newPasswordSchema,
  registerSchema,
  safeNext,
} from "@/lib/validation";

export interface FormState {
  error?: string;
  success?: string;
  /** Connexion refusée car l'adresse n'est pas confirmée : on propose de renvoyer le lien. */
  unverifiedEmail?: string;
}

const TOO_MANY = "Trop de tentatives. Réessaie dans quelques minutes.";
const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string) : "");
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");

// ─── Inscription ────────────────────────────────────────────────────────────

export async function registerAction(_: FormState, form: FormData): Promise<FormState> {
  const ip = await clientIp();
  if (await isLimited(`register:${ip}`, LIMITS.registerPerIp, false)) return { error: TOO_MANY };

  const parsed = registerSchema.safeParse({
    pseudo: str(form, "pseudo"),
    email: str(form, "email"),
    password: str(form, "password"),
    code: str(form, "code"),
  });
  if (!parsed.success) return { error: firstError(parsed.error) };
  const { pseudo, email, password, code } = parsed.data;

  const requiredCode = process.env.REGISTRATION_CODE?.trim();
  if (requiredCode && code !== requiredCode) {
    await recordAttempt(`register:${ip}`, false);
    return { error: "Code d’invitation incorrect." };
  }

  const taken = await prisma.user.findFirst({
    where: {
      OR: [{ pseudo: { equals: pseudo, mode: "insensitive" } }, { email }],
    },
    select: { pseudo: true, email: true },
  });
  if (taken?.email === email) return { error: "Cette adresse e-mail est déjà utilisée." };
  if (taken) return { error: "Ce pseudo est déjà pris." };

  let user;
  try {
    user = await prisma.user.create({
      data: { pseudo, email, passwordHash: await hashPassword(password) },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return { error: "Ce pseudo ou cette adresse e-mail est déjà utilisé." };
    }
    throw e;
  }
  await recordAttempt(`register:${ip}`, true);
  // E-mail de confirmation : le compte s'active en cliquant sur le lien (renvoi possible)
  await sendVerificationEmail(user).catch((e) => console.error("E-mail de confirmation :", e));
  redirect(`/inscription/confirmation?email=${encodeURIComponent(user.email)}`);
}

// ─── Connexion / déconnexion ────────────────────────────────────────────────

export async function loginAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: str(form, "email"), password: str(form, "password") });
  if (!parsed.success) return { error: "Adresse e-mail ou mot de passe incorrect." };
  const { email, password } = parsed.data;

  const ip = await clientIp();
  const emailKey = `login:${email}`;
  const ipKey = `login-ip:${ip}`;
  if (
    (await isLimited(emailKey, LIMITS.loginPerEmail, true)) ||
    (await isLimited(ipKey, LIMITS.loginPerIp, true))
  ) {
    return { error: "Trop de tentatives de connexion. Réessaie dans 15 minutes." };
  }

  const user = await prisma.user.findUnique({ where: { email } });
  const ok = await verifyPassword(password, user?.passwordHash ?? null);
  if (!user || !ok) {
    await recordAttempt(emailKey, false);
    await recordAttempt(ipKey, false);
    return { error: "Adresse e-mail ou mot de passe incorrect." };
  }
  if (!user.isActive) return { error: "Ce compte est désactivé. Contacte l’administrateur." };
  if (!user.emailVerifiedAt) {
    return { error: "Confirme d’abord ton adresse e-mail avec le lien reçu.", unverifiedEmail: user.email };
  }

  await clearFailures(emailKey);
  (await cookies()).delete(VIEW_COOKIE); // nouvelle session : ligue par défaut
  await joinPendingLeague(user.id);
  if (Math.random() < 0.05) await purgeOldAttempts();
  await createSession(user);
  redirect(safeNext(str(form, "next")));
}

export async function logoutAction(): Promise<void> {
  await destroySession();
  (await cookies()).delete(VIEW_COOKIE);
  redirect("/");
}

// ─── Mot de passe oublié ────────────────────────────────────────────────────

const RESET_SENT =
  "Si un compte existe avec cette adresse, un e-mail de réinitialisation vient d’être envoyé. Le lien est valable 1 heure.";

export async function forgotPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(str(form, "email"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const email = parsed.data;
  const ip = await clientIp();

  if (
    (await isLimited(`reset:${email}`, LIMITS.resetPerEmail, false)) ||
    (await isLimited(`reset-ip:${ip}`, LIMITS.resetPerIp, false))
  ) {
    return { error: TOO_MANY };
  }
  await recordAttempt(`reset:${email}`, true);
  await recordAttempt(`reset-ip:${ip}`, true);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.isActive) return { success: RESET_SENT }; // même réponse : on ne révèle rien

  const token = randomBytes(32).toString("base64url");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + 60 * 60_000) },
  });
  const link = appUrl(`/reinitialiser?token=${token}`);
  await sendEmail({
    to: user.email,
    subject: "Rouge & Noir — réinitialisation de ton mot de passe",
    text: `Bonjour ${user.pseudo},\n\nPour choisir un nouveau mot de passe, ouvre ce lien (valable 1 heure) :\n${link}\n\nSi tu n’as rien demandé, ignore cet e-mail.`,
    html: `<p>Bonjour ${escapeHtml(user.pseudo)},</p><p>Pour choisir un nouveau mot de passe, clique sur ce lien (valable 1 heure) :</p><p><a href="${link}">Réinitialiser mon mot de passe</a></p><p>Si tu n’as rien demandé, ignore cet e-mail.</p>`,
  });
  return { success: RESET_SENT };
}

export async function resetPasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const token = str(form, "token");
  const parsed = newPasswordSchema.safeParse(str(form, "password"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (parsed.data !== str(form, "confirm")) return { error: "Les deux mots de passe ne correspondent pas." };

  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });
  if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.isActive) {
    return { error: "Ce lien n’est plus valable. Refais une demande de réinitialisation." };
  }

  const passwordHash = await hashPassword(parsed.data);
  const [user] = await prisma.$transaction([
    prisma.user.update({
      where: { id: record.userId },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.deleteMany({ where: { userId: record.userId, usedAt: null } }),
  ]);
  await clearFailures(`login:${user.email}`);
  await createSession(user);
  redirect("/");
}

// ─── Changement de mot de passe (connecté) ──────────────────────────────────

export async function changePasswordAction(_: FormState, form: FormData): Promise<FormState> {
  const current = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: current.id } });
  if (!(await verifyPassword(str(form, "current"), user.passwordHash))) {
    return { error: "Mot de passe actuel incorrect." };
  }
  const parsed = newPasswordSchema.safeParse(str(form, "password"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  if (parsed.data !== str(form, "confirm")) return { error: "Les deux mots de passe ne correspondent pas." };

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(parsed.data), sessionVersion: { increment: 1 } },
  });
  await createSession(updated); // cet appareil reste connecté, les autres sont déconnectés
  return { success: "Mot de passe modifié. Tes autres appareils ont été déconnectés." };
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}


// ─── Confirmation d'adresse e-mail et préférences ───────────────────────────

/** Renvoie le lien de confirmation (3 fois par heure au plus). */
export async function resendVerificationAction(_: FormState): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Connecte-toi d’abord." };
  if (user.emailVerifiedAt) return { success: "Ton adresse est déjà confirmée." };
  if (await isLimited(`verify:${user.id}`, { max: 3, windowMs: 60 * 60_000 }, false)) return { error: TOO_MANY };
  await recordAttempt(`verify:${user.id}`, true);
  await sendVerificationEmail(user);
  return { success: `E-mail envoyé à ${user.email}.` };
}

/** Rappels par e-mail avant les matchs : activés ou non pour ce joueur. */
export async function setMyEmailRemindersAction(_: FormState, form: FormData): Promise<FormState> {
  const user = await requireUser();
  const enabled = form.get("emailReminders") === "on";
  await prisma.user.update({ where: { id: user.id }, data: { emailReminders: enabled } });
  return { success: enabled ? "Rappels par e-mail activés." : "Rappels par e-mail désactivés." };
}


/** Invitation gardée en attente (lien ouvert avant l'inscription) : on rejoint la ligue à la connexion. */
export async function joinPendingLeague(userId: string): Promise<void> {
  const jar = await cookies();
  const code = jar.get(JOIN_COOKIE)?.value;
  if (!code) return;
  const r = await joinLeague(userId, code).catch(() => null);
  jar.delete(JOIN_COOKIE);
  if (r?.ok) {
    jar.set(VIEW_COOKIE, r.leagueId, { httpOnly: true, sameSite: "lax", path: "/" });
    jar.set(WELCOME_COOKIE, r.leagueId, { sameSite: "lax", path: "/", maxAge: 600 });
  }
}

/** Renvoi du lien de confirmation depuis la page de connexion ou d'inscription (sans être connecté). */
export async function resendVerificationByEmailAction(_: FormState, form: FormData): Promise<FormState> {
  const parsed = emailSchema.safeParse(str(form, "email"));
  if (!parsed.success) return { error: "Adresse e-mail invalide." };
  const email = parsed.data;
  const ip = await clientIp();
  if ((await isLimited(`verify-mail:${email}`, LIMITS.resetPerEmail, false)) || (await isLimited(`verify-ip:${ip}`, LIMITS.resetPerIp, false))) {
    return { error: TOO_MANY };
  }
  await recordAttempt(`verify-mail:${email}`, true);
  await recordAttempt(`verify-ip:${ip}`, true);
  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.isActive && !user.emailVerifiedAt) await sendVerificationEmail(user);
  return { success: "Si un compte non confirmé existe avec cette adresse, un nouveau lien vient d’être envoyé." };
}


/** Changer d'adresse e-mail (mot de passe actuel demandé) : un lien de confirmation part à la nouvelle adresse. */
export async function requestEmailChangeAction(_: FormState, form: FormData): Promise<FormState> {
  const current = await requireUser();
  const user = await prisma.user.findUniqueOrThrow({ where: { id: current.id } });
  if (!(await verifyPassword(str(form, "password"), user.passwordHash))) return { error: "Mot de passe incorrect." };
  const parsed = emailSchema.safeParse(str(form, "email"));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const email = parsed.data;
  if (email === user.email) return { error: "C’est déjà ton adresse actuelle." };
  if (await prisma.user.findUnique({ where: { email } })) return { error: "Cette adresse est déjà utilisée par un autre compte." };
  if (await isLimited(`email-change:${user.id}`, LIMITS.resetPerEmail, false)) return { error: TOO_MANY };
  await recordAttempt(`email-change:${user.id}`, true);
  await sendEmailChangeLink(user, email);
  return { success: `Lien envoyé à ${email}. Ton adresse actuelle reste valable jusqu’à la confirmation.` };
}


/** Didacticiel terminé (ou passé) : il ne s'affichera plus. */
export async function completeTutorialAction(): Promise<void> {
  const user = await getCurrentUser();
  if (user) await prisma.user.update({ where: { id: user.id }, data: { tutorialDoneAt: new Date() } });
}

/** « Revoir le didacticiel » depuis Mon compte. */
export async function replayTutorialAction(): Promise<void> {
  const user = await requireUser();
  await prisma.user.update({ where: { id: user.id }, data: { tutorialDoneAt: null } });
  redirect("/");
}
