// Logos des clubs : officiels (ESPN) ou factices (rond partagé verticalement aux deux couleurs du club).
// Fonctions pures, testées. Le mode est réglé dans Administration › Logos.

export type ClubLogoMode = "official" | "generic";
export const CLUB_LOGOS_SETTING = "club_logos_mode";

const norm = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** Couleurs dominantes connues (gauche | droite), si ESPN ne les fournit pas. */
const KNOWN: Array<[RegExp, string, string]> = [
  [/stade rennais|rennes/, "#E1001A", "#111111"],
  [/paris saint germain|psg/, "#004170", "#DA291C"],
  [/paris fc/, "#0F2B5B", "#7BAFD4"],
  [/marseille/, "#2FAEE0", "#FFFFFF"],
  [/lyon/, "#14387F", "#DA001A"],
  [/lille|losc/, "#E01E13", "#20325F"],
  [/monaco/, "#E51B22", "#FFFFFF"],
  [/nice/, "#C8102E", "#111111"],
  [/lens/, "#FFD700", "#E2001A"],
  [/nantes/, "#FCD405", "#009639"],
  [/strasbourg/, "#0072CE", "#FFFFFF"],
  [/toulouse/, "#5B2D86", "#FFFFFF"],
  [/brest/, "#E30613", "#FFFFFF"],
  [/auxerre/, "#0055A4", "#FFFFFF"],
  [/angers/, "#111111", "#FFFFFF"],
  [/le havre|havre/, "#6CABDD", "#002D62"],
  [/lorient/, "#F47920", "#111111"],
  [/metz/, "#8B1538", "#FFFFFF"],
  [/le mans/, "#E30613", "#FFD100"],
  [/troyes/, "#0055A4", "#FFFFFF"],
  [/saint etienne|st etienne/, "#00A650", "#FFFFFF"],
  [/montpellier/, "#F58220", "#0B2F6B"],
  [/reims/, "#E30613", "#FFFFFF"],
  [/olympiacos|olympiakos/, "#E30613", "#FFFFFF"],
  [/juventus/, "#111111", "#FFFFFF"],
];

const hex = (c: string | null | undefined) => {
  if (!c) return null;
  const v = c.trim().replace(/^#/, "");
  return /^[0-9a-f]{6}$/i.test(v) ? `#${v.toUpperCase()}` : null;
};

/** Teinte stable déduite du nom (club inconnu, sans couleurs). */
function hashHue(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 360;
}

/** Les deux couleurs du club : réglées par l'admin / fournies par ESPN, sinon tableau connu, sinon déduites du nom. */
export function clubColors(team: { name: string; color1?: string | null; color2?: string | null }): [string, string] {
  const a = hex(team.color1);
  const b = hex(team.color2);
  if (a && b) return [a, b];
  const known = KNOWN.find(([re]) => re.test(norm(team.name)));
  if (known) return [a ?? known[1], b ?? known[2]];
  const hue = hashHue(team.name);
  return [a ?? `hsl(${hue} 65% 40%)`, b ?? "#FFFFFF"];
}

/** Rond partagé verticalement à parts égales entre les deux couleurs (image SVG en ligne). */
export function genericClubLogo(colors: [string, string]): string {
  const [left, right] = colors;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<defs><clipPath id="c"><circle cx="32" cy="32" r="29"/></clipPath></defs>` +
    `<g clip-path="url(#c)"><rect width="32" height="64" fill="${left}"/><rect x="32" width="32" height="64" fill="${right}"/></g>` +
    `<circle cx="32" cy="32" r="29" fill="none" stroke="#9a9a9a" stroke-width="2"/></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Logo à afficher pour un club selon le mode choisi. */
export function clubLogo(
  team: { name: string; logoUrl?: string | null; color1?: string | null; color2?: string | null },
  mode: ClubLogoMode,
): string | null {
  if (mode === "official") return team.logoUrl ?? null;
  return genericClubLogo(clubColors(team));
}
