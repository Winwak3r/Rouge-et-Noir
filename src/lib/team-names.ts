// Noms courts des équipes sur mobile (gain de place). Clé : nom ESPN normalisé (accents, casse).
const SHORT: Record<string, string> = {
  "stade rennais": "SRFC",
  "stade rennais fc": "SRFC",
  "le havre ac": "Le Havre",
  "paris saint-germain": "PSG",
  "paris saint germain": "PSG",
  "aj auxerre": "Auxerre",
  marseille: "OM",
  "olympique de marseille": "OM",
  "olympique marseille": "OM",
  strasbourg: "RCSA",
  "rc strasbourg": "RCSA",
  "rc strasbourg alsace": "RCSA",
};

const norm = (s: string) => s.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

/** Nom complet sur ordinateur : « Stade Rennais F.C. » pour Rennes, sinon le nom tel quel. */
export function desktopTeamName(name: string, isRennes = false): string {
  if (name === "SRFC") return name; // sigle voulu (cartes des prochains matchs)
  return isRennes || /^(stade rennais( fc)?|rennes)$/.test(norm(name)) ? "Stade Rennais F.C." : name;
}

/** Nom court sur mobile, ou null s'il n'y en a pas (le nom complet est alors gardé). */
export function mobileTeamName(name: string, isRennes = false): string | null {
  if (isRennes) return "SRFC";
  return SHORT[norm(name)] ?? null;
}
