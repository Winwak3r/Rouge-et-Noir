// Transferts officiels du Stade Rennais (API-Football, une requête par jour au plus).

export interface TransferItem {
  player: string;
  date: Date;
  type: string | null; // « Loan », « Free », montant…
  direction: "in" | "out";
  otherTeam: { name: string; logo: string | null };
}

type Json = any; // eslint-disable-line @typescript-eslint/no-explicit-any

/** Mouvements concernant l'équipe, depuis `since`, du plus récent au plus ancien (doublons retirés). */
export function parseTransfers(json: Json, teamId: number, since: Date): TransferItem[] {
  const out: TransferItem[] = [];
  const seen = new Set<string>();
  for (const entry of json?.response ?? []) {
    const player = entry?.player?.name;
    if (!player) continue;
    for (const t of entry?.transfers ?? []) {
      const date = new Date(t?.date);
      if (Number.isNaN(date.getTime()) || date < since) continue;
      const inId = Number(t?.teams?.in?.id);
      const outId = Number(t?.teams?.out?.id);
      if (inId !== teamId && outId !== teamId) continue;
      const direction = inId === teamId ? "in" : "out";
      const other = direction === "in" ? t?.teams?.out : t?.teams?.in;
      const key = `${player}|${t?.date}|${direction}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        player,
        date,
        type: t?.type && t.type !== "N/A" ? String(t.type) : null,
        direction,
        otherTeam: { name: other?.name ?? "?", logo: other?.logo ?? null },
      });
    }
  }
  return out.sort((a, b) => b.date.getTime() - a.date.getTime());
}

/** Traduction du type de transfert. */
export function transferTypeLabel(type: string | null): string | null {
  if (!type) return null;
  if (/loan/i.test(type)) return "Prêt";
  if (/free/i.test(type)) return "Libre";
  if (/return|back from loan/i.test(type)) return "Retour de prêt";
  return type.replace(/€\s?/, "").trim() ? type : null;
}

export async function fetchOfficialTransfers(): Promise<TransferItem[] | null> {
  const key = process.env.API_FOOTBALL_KEY;
  const team = Number(process.env.API_FOOTBALL_TEAM_ID ?? 94);
  if (!key) return null;
  const res = await fetch(`https://v3.football.api-sports.io/transfers?team=${team}`, {
    headers: { "x-apisports-key": key },
    next: { revalidate: 86400 }, // une fois par jour
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`Transferts : HTTP ${res.status}`);
  const since = new Date(Date.now() - 400 * 24 * 3600 * 1000); // un peu plus d'un an
  return parseTransfers(await res.json(), team, since);
}
