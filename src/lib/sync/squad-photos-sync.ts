// Synchro des photos officielles (API-Football) : une requête par jour, sur la clé gratuite.
import { prisma } from "@/lib/db";
import { matchSquadPlayer, parseSquad } from "@/lib/providers/squad-photos";

export async function syncSquadPhotos(seasonId: string): Promise<{ matched: number; total: number; unmatched: string[] }> {
  const key = process.env.API_FOOTBALL_KEY?.trim();
  if (!key) throw new Error("API_FOOTBALL_KEY absente : photos officielles non récupérées.");
  const team = Number(process.env.API_FOOTBALL_TEAM_ID ?? 94);
  const res = await fetch(`https://v3.football.api-sports.io/players/squads?team=${team}`, {
    headers: { "x-apisports-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`API-Football → HTTP ${res.status}`);
  const data = await res.json();
  if (data?.errors && Object.keys(data.errors).length) throw new Error(`API-Football : ${JSON.stringify(data.errors)}`);
  const squad = parseSquad(data);
  const players = await prisma.player.findMany({ where: { seasonId }, select: { id: true, name: true, shirtNumber: true } });
  let matched = 0;
  const unmatched: string[] = [];
  for (const sp of squad) {
    const p = matchSquadPlayer(sp, players);
    if (!p) {
      unmatched.push(sp.name);
      continue;
    }
    matched++;
    await prisma.player.update({ where: { id: p.id }, data: { officialPhotoUrl: sp.photo } });
  }
  return { matched, total: squad.length, unmatched };
}
