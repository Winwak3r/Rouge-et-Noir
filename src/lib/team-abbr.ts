// Abréviation à 3 lettres (ou sigle usuel) d'un club, pour l'en-tête réduit de la fiche mobile.

const KNOWN: Array<[RegExp, string]> = [
  [/stade rennais|^rennes/, "REN"],
  [/paris saint|psg/, "PSG"],
  [/paris fc/, "PFC"],
  [/marseille/, "OM"],
  [/lyon/, "OL"],
  [/lille|losc/, "LIL"],
  [/monaco/, "ASM"],
  [/nice/, "NIC"],
  [/lens/, "RCL"],
  [/nantes/, "NAN"],
  [/strasbourg/, "RCSA"],
  [/toulouse/, "TFC"],
  [/brest/, "SB29"],
  [/auxerre/, "AJA"],
  [/angers/, "SCO"],
  [/havre/, "HAC"],
  [/lorient/, "FCL"],
  [/metz/, "FCM"],
  [/saint-etienne|saint etienne|st etienne/, "ASSE"],
  [/montpellier/, "MHSC"],
  [/reims/, "SDR"],
  [/troyes/, "ESTAC"],
  [/olympiacos|olympiakos/, "OLY"],
  [/juventus/, "JUV"],
];

const SKIP = new Set(["stade", "fc", "as", "ac", "sc", "rc", "us", "ogc", "aj", "olympique", "racing", "club", "de", "du", "la", "le", "real", "sporting"]);

export function teamAbbr(name: string): string {
  const n = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  const known = KNOWN.find(([re]) => re.test(n));
  if (known) return known[1];
  const words = n.split(/[\s\-']+/).filter((w) => w && !SKIP.has(w));
  return (words[0] ?? n).replace(/[^a-z]/g, "").slice(0, 3).toUpperCase();
}
