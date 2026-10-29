// Règles des ligues (fonctions pures, testées).
import { randomInt } from "node:crypto";

/** Cookie qui garde le code d'une invitation le temps de s'inscrire et de confirmer son adresse. */
export const JOIN_COOKIE = "join_league";

/**
 * Ligue consultée pendant la session (liste de l'en-tête, boutons du classement).
 * Cookie de session : à la reconnexion, on revient à la ligue « par défaut » du compte.
 */
export const VIEW_COOKIE = "league_view";

// Sans 0/O ni 1/I/L : un code lisible à l'oral et facile à recopier
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateInviteCode(length = 8): string {
  let s = "";
  for (let i = 0; i < length; i++) s += ALPHABET[randomInt(ALPHABET.length)];
  return s;
}

/** Code saisi (« abcd-efgh », espaces…) → forme canonique ; null s'il ne peut pas être valide. */
export function normalizeInviteCode(raw: string): string | null {
  const code = raw.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return /^[A-Z0-9]{6,12}$/.test(code) ? code : null;
}

/** Le code peut aussi être collé sous forme de lien d'invitation. */
export function codeFromInput(raw: string): string | null {
  const m = /\/rejoindre\/([A-Za-z0-9-]+)/.exec(raw);
  return normalizeInviteCode(m ? m[1] : raw);
}

export function validateLeagueName(raw: string): { ok: true; name: string } | { ok: false; error: string } {
  const name = raw.trim().replace(/\s+/g, " ");
  if (name.length < 3 || name.length > 40) return { ok: false, error: "Le nom de la ligue doit faire entre 3 et 40 caractères." };
  return { ok: true, name };
}

/** Un admin de ligue ne peut pas retirer ses droits ni se retirer s'il est le dernier admin. */
export function canLoseAdmin(admins: number, isTargetAdmin: boolean): boolean {
  return !isTargetAdmin || admins > 1;
}

/** Un joueur participe à 3 ligues au plus (créées ou rejointes). */
export const MAX_LEAGUES = 3;
export const canJoinAnother = (memberships: number) => memberships < MAX_LEAGUES;

/** Pseudo-ligue « Général R&N » de la liste de l'en-tête (tous les joueurs inscrits dans une ligue et ayant pronostiqué). */
export const GENERAL_KEY = "general";
export const GENERAL_NAME = "Général R&N";

export const DESCRIPTION_MAX = 120;

export function validateLeagueDescription(raw: string): { ok: true; description: string | null } | { ok: false; error: string } {
  const description = raw.replace(/\s+/g, " ").trim();
  if (description.length > DESCRIPTION_MAX) return { ok: false, error: `La description ne doit pas dépasser ${DESCRIPTION_MAX} caractères.` };
  return { ok: true, description: description || null };
}

export const ALL_COMPETITIONS = ["LIGUE_1", "EUROPA_LEAGUE", "COUPE_DE_FRANCE"] as const;
export type LeagueCompetition = (typeof ALL_COMPETITIONS)[number];

/** Compétitions cochées (au moins une), dans l'ordre habituel. */
export function validateCompetitions(values: string[]): { ok: true; competitions: LeagueCompetition[] } | { ok: false; error: string } {
  const competitions = ALL_COMPETITIONS.filter((c) => values.includes(c));
  return competitions.length ? { ok: true, competitions } : { ok: false, error: "Choisis au moins une compétition." };
}

/** Cookie (lisible par la page) qui déclenche la fenêtre « Bienvenue dans la ligue » après l'avoir rejointe. */
export const WELCOME_COOKIE = "league_welcome";
