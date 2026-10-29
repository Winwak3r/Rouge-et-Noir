/** « Mousa Al-Tamari » → « M. Al-Tamari » (initiale du prénom, nom complet). Un seul mot : inchangé. */
export function shortPlayerName(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length < 2) return name.trim();
  return `${parts[0][0]}. ${parts.slice(1).join(" ")}`;
}
