"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth/session";
import { cookies } from "next/headers";
import {
  GENERAL_KEY,
  MAX_LEAGUES,
  VIEW_COOKIE,
  WELCOME_COOKIE,
  canJoinAnother,
  canLoseAdmin,
  codeFromInput,
  generateInviteCode,
  validateCompetitions,
  validateLeagueDescription,
  validateLeagueName,
} from "@/lib/league-rules";
import { createLeague, isLeagueAdmin, joinLeague } from "@/lib/leagues";

export interface LeagueState {
  error?: string;
  success?: string;
  leagueId?: string;
}

const str = (f: FormData, k: string) => (typeof f.get(k) === "string" ? (f.get(k) as string) : "");
const refresh = () => {
  for (const p of ["/", "/classement", "/ligue", "/ligues", "/compte", "/admin/ligues"]) revalidatePath(p);
};

/** Crée une ligue (3 ligues au plus par joueur). L'image est envoyée ensuite par le navigateur. */
export async function createLeagueAction(_: LeagueState, form: FormData): Promise<LeagueState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Connecte-toi d’abord." };
  const v = validateLeagueName(str(form, "name"));
  if (!v.ok) return { error: v.error };
  const d = validateLeagueDescription(str(form, "description"));
  if (!d.ok) return { error: d.error };
  const c = validateCompetitions(form.getAll("competitions").map(String));
  if (!c.ok) return { error: c.error };
  if (!canJoinAnother(await prisma.leagueMember.count({ where: { userId: user.id } }))) {
    return { error: `Tu participes déjà à ${MAX_LEAGUES} ligues (le maximum) : quittes-en une pour en créer une nouvelle.` };
  }
  const league = await createLeague(user.id, v.name, { description: d.description, competitions: c.competitions });
  await viewLeague(league.id);
  refresh();
  return { success: `Ligue « ${league.name} » créée.`, leagueId: league.id };
}

export async function joinLeagueAction(_: LeagueState, form: FormData): Promise<LeagueState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Connecte-toi d’abord." };
  const code = codeFromInput(str(form, "code"));
  if (!code) return { error: "Code invalide : 8 lettres et chiffres, ou le lien d’invitation." };
  const r = await joinLeague(user.id, code);
  if (!r.ok) return { error: r.error };
  await viewLeague(r.leagueId);
  await welcome(r.leagueId);
  refresh();
  return { success: `Bienvenue dans la ligue « ${r.name} » !` };
}

/** Déclenche la fenêtre « Bienvenue dans la ligue » au prochain affichage. */
async function welcome(leagueId: string) {
  (await cookies()).set(WELCOME_COOKIE, leagueId, { sameSite: "lax", path: "/", maxAge: 600 });
}

/** Fenêtre de bienvenue fermée. */
export async function dismissWelcomeAction(): Promise<void> {
  (await cookies()).delete(WELCOME_COOKIE);
}

async function viewLeague(leagueId: string) {
  // cookie de session : à la reconnexion, retour à la ligue par défaut
  (await cookies()).set(VIEW_COOKIE, leagueId, { httpOnly: true, sameSite: "lax", path: "/", secure: process.env.NODE_ENV === "production" });
}

/** Ligue consultée pendant la session (liste de l'en-tête, boutons du classement). */
export async function viewLeagueAction(leagueId: string): Promise<void> {
  const user = await requireUser();
  if (leagueId !== GENERAL_KEY) {
    const m = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId, userId: user.id } } });
    if (!m?.isActive) return;
  }
  await viewLeague(leagueId);
  revalidatePath("/", "layout"); // en-tête et pronostics des autres joueurs à jour
}

/** Ligue « par défaut » : celle affichée à chaque connexion. */
export async function setDefaultLeagueAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const leagueId = str(form, "leagueId");
  const m = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId, userId: user.id } } });
  if (!m?.isActive) return;
  await prisma.user.update({ where: { id: user.id }, data: { activeLeagueId: leagueId } });
  await viewLeague(leagueId);
  revalidatePath("/", "layout");
}

/** Quitter une ligue (impossible pour le dernier admin s'il reste des joueurs). */
export async function leaveLeagueAction(_: LeagueState, form: FormData): Promise<LeagueState> {
  const user = await requireUser();
  const leagueId = str(form, "leagueId");
  const m = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId, userId: user.id } } });
  if (!m) return { error: "Tu n’es pas dans cette ligue." };
  const [admins, members] = await Promise.all([
    prisma.leagueMember.count({ where: { leagueId, role: "ADMIN", isActive: true } }),
    prisma.leagueMember.count({ where: { leagueId } }),
  ]);
  if (members > 1 && !canLoseAdmin(admins, m.role === "ADMIN")) {
    return { error: "Tu es le seul administrateur : nomme d’abord un autre administrateur de la ligue." };
  }
  await prisma.leagueMember.delete({ where: { leagueId_userId: { leagueId, userId: user.id } } });
  if (members === 1) await prisma.league.delete({ where: { id: leagueId } }); // dernier joueur : la ligue disparaît
  if (user.activeLeagueId === leagueId) await prisma.user.update({ where: { id: user.id }, data: { activeLeagueId: null } });
  refresh();
  return { success: "Tu as quitté la ligue." };
}

// ─── Administration d'une ligue (admins de la ligue) ────────────────────────

async function requireLeagueAdminFor(form: FormData) {
  const user = await requireUser();
  const leagueId = str(form, "leagueId");
  if (!leagueId || !(await isLeagueAdmin(user.id, leagueId))) return null;
  return { user, leagueId };
}

/** Nom, description et compétitions de la ligue. */
export async function renameLeagueAction(_: LeagueState, form: FormData): Promise<LeagueState> {
  const ctx = await requireLeagueAdminFor(form);
  if (!ctx) return { error: "Réservé aux administrateurs de la ligue." };
  const v = validateLeagueName(str(form, "name"));
  if (!v.ok) return { error: v.error };
  const d = validateLeagueDescription(str(form, "description"));
  if (!d.ok) return { error: d.error };
  const c = validateCompetitions(form.getAll("competitions").map(String));
  if (!c.ok) return { error: c.error };
  await prisma.league.update({ where: { id: ctx.leagueId }, data: { name: v.name, description: d.description, competitions: c.competitions } });
  refresh();
  return { success: "Informations enregistrées." };
}

/** Nouveau code d'invitation : l'ancien lien et l'ancien QR code ne fonctionnent plus. */
export async function regenerateInviteAction(_: LeagueState, form: FormData): Promise<LeagueState> {
  const ctx = await requireLeagueAdminFor(form);
  if (!ctx) return { error: "Réservé aux administrateurs de la ligue." };
  await prisma.league.update({ where: { id: ctx.leagueId }, data: { inviteCode: generateInviteCode() } });
  refresh();
  return { success: "Nouveau lien d’invitation créé : l’ancien ne fonctionne plus." };
}

/** Donner ou retirer le rôle d'administrateur de la ligue (il reste toujours au moins un admin). */
export async function toggleLeagueAdminAction(_: LeagueState, form: FormData): Promise<LeagueState> {
  const ctx = await requireLeagueAdminFor(form);
  if (!ctx) return { error: "Réservé aux administrateurs de la ligue." };
  const userId = str(form, "userId");
  const m = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId: ctx.leagueId, userId } }, include: { user: true } });
  if (!m) return { error: "Joueur introuvable dans la ligue." };
  const admins = await prisma.leagueMember.count({ where: { leagueId: ctx.leagueId, role: "ADMIN", isActive: true } });
  if (m.role === "ADMIN" && !canLoseAdmin(admins, true)) return { error: "Il doit rester au moins un administrateur." };
  if (m.role !== "ADMIN" && !m.isActive) return { error: "Réactive d’abord ce joueur." };
  await prisma.leagueMember.update({ where: { leagueId_userId: { leagueId: ctx.leagueId, userId } }, data: { role: m.role === "ADMIN" ? "MEMBER" : "ADMIN" } });
  refresh();
  return { success: m.role === "ADMIN" ? `${m.user.pseudo} n’est plus administrateur.` : `${m.user.pseudo} est administrateur de la ligue.` };
}

/** Suspendre / réactiver un joueur dans la ligue (il disparaît du classement de la ligue). */
export async function toggleLeagueMemberAction(_: LeagueState, form: FormData): Promise<LeagueState> {
  const ctx = await requireLeagueAdminFor(form);
  if (!ctx) return { error: "Réservé aux administrateurs de la ligue." };
  const userId = str(form, "userId");
  if (userId === ctx.user.id) return { error: "Tu ne peux pas te suspendre toi-même." };
  const m = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId: ctx.leagueId, userId } }, include: { user: true } });
  if (!m) return { error: "Joueur introuvable dans la ligue." };
  await prisma.leagueMember.update({
    where: { leagueId_userId: { leagueId: ctx.leagueId, userId } },
    data: { isActive: !m.isActive, ...(m.isActive ? { role: "MEMBER" } : {}) },
  });
  refresh();
  return { success: m.isActive ? `${m.user.pseudo} est suspendu dans la ligue.` : `${m.user.pseudo} est réactivé.` };
}

/** Retirer un joueur de la ligue (son compte sur le site n'est pas supprimé). */
export async function removeLeagueMemberAction(_: LeagueState, form: FormData): Promise<LeagueState> {
  const ctx = await requireLeagueAdminFor(form);
  if (!ctx) return { error: "Réservé aux administrateurs de la ligue." };
  const userId = str(form, "userId");
  if (userId === ctx.user.id) return { error: "Pour partir, utilise « Quitter la ligue »." };
  const m = await prisma.leagueMember.findUnique({ where: { leagueId_userId: { leagueId: ctx.leagueId, userId } }, include: { user: true } });
  if (!m) return { error: "Joueur introuvable dans la ligue." };
  const admins = await prisma.leagueMember.count({ where: { leagueId: ctx.leagueId, role: "ADMIN", isActive: true } });
  if (m.role === "ADMIN" && !canLoseAdmin(admins, true)) return { error: "Il doit rester au moins un administrateur." };
  await prisma.leagueMember.delete({ where: { leagueId_userId: { leagueId: ctx.leagueId, userId } } });
  await prisma.user.updateMany({ where: { id: userId, activeLeagueId: ctx.leagueId }, data: { activeLeagueId: null } });
  refresh();
  return { success: `${m.user.pseudo} a été retiré de la ligue.` };
}


/** Supprime la ligue (admins de la ligue). Les points restent attachés aux comptes des joueurs. */
export async function deleteLeagueAction(_: LeagueState, form: FormData): Promise<LeagueState> {
  const ctx = await requireLeagueAdminFor(form);
  if (!ctx) return { error: "Réservé aux administrateurs de la ligue." };
  if (str(form, "confirm").trim().toUpperCase() !== "SUPPRIMER") return { error: "Écris SUPPRIMER pour confirmer." };
  await prisma.$transaction([
    prisma.user.updateMany({ where: { activeLeagueId: ctx.leagueId }, data: { activeLeagueId: null } }),
    prisma.league.delete({ where: { id: ctx.leagueId } }), // membres et image supprimés avec la ligue
  ]);
  refresh();
  return { success: "Ligue supprimée." };
}
