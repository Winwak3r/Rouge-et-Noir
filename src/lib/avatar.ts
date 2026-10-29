// Photo de profil : contrôle du fichier reçu et repères d'affichage (fonctions pures, reprises de F1 Pronos).
export const MAX_AVATAR_BYTES = 150_000; // l'image est réduite à 256 px dans le navigateur : 15 à 40 Ko en pratique

export type AvatarType = "image/jpeg" | "image/png" | "image/webp";

/** Vrai format d'après les premiers octets (le type annoncé n'est jamais cru). SVG, GIF et autres : refusés. */
export function sniffImageType(b: Uint8Array): AvatarType | null {
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length >= 8 &&
    b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 &&
    b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a
  )
    return "image/png";
  if (
    b.length >= 12 &&
    b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
    b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50
  )
    return "image/webp";
  return null;
}

export const avatarUrl = (userId: string, at: number) => `/api/avatar/${encodeURIComponent(userId)}?v=${at}`;

/** Initiales pour la bulle sans photo : une lettre, ou deux si le pseudo a plusieurs mots. */
export function initials(pseudo: string): string {
  const parts = pseudo.trim().split(/[\s\-_.]+/).filter(Boolean);
  const letters = parts.length >= 2 ? parts[0][0] + parts[1][0] : (parts[0] ?? "?").slice(0, 1);
  return letters.toUpperCase();
}

/** Teinte stable d'après le pseudo, pour distinguer les bulles sans photo. */
export function hueOf(pseudo: string): number {
  let h = 0;
  for (const ch of pseudo) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
