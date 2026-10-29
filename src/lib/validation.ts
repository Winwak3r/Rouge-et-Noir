import { z } from "zod";

export const pseudoSchema = z
  .string()
  .trim()
  .min(3, "Le pseudo doit faire au moins 3 caractères.")
  .max(20, "Le pseudo doit faire au plus 20 caractères.")
  .regex(/^[\p{L}\p{N}_.\- ]+$/u, "Lettres, chiffres, espaces, points, tirets et _ uniquement.");

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Adresse e-mail trop longue.")
  .email("Adresse e-mail invalide.");

export const newPasswordSchema = z
  .string()
  .min(8, "Le mot de passe doit faire au moins 8 caractères.")
  .max(128, "Le mot de passe doit faire au plus 128 caractères.")
  .regex(/\p{L}/u, "Le mot de passe doit contenir au moins une lettre.")
  .regex(/\d/, "Le mot de passe doit contenir au moins un chiffre.");

export const registerSchema = z.object({
  pseudo: pseudoSchema,
  email: emailSchema,
  password: newPasswordSchema,
  code: z.string().trim().optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Mot de passe requis.").max(128),
});

export function firstError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Données invalides.";
}

/** N'accepte qu'un chemin interne (évite les redirections vers un autre site). */
export function safeNext(next: unknown): string {
  return typeof next === "string" && next.startsWith("/") && !next.startsWith("//") ? next : "/";
}
