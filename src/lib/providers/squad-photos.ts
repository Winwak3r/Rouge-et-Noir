// Photos officielles de l'effectif via API-Football (« /players/squads », une requête par jour).
import { normalizeName } from "./names";

export interface SquadPhoto {
  id: number;
  name: string; // souvent abrégé : « B. Dia »
  number: number | null;
  photo: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function parseSquad(data: any): SquadPhoto[] {
  const players: any[] = data?.response?.[0]?.players ?? [];
  return players
    .filter((p) => p?.id && p?.photo)
    .map((p) => ({ id: Number(p.id), name: String(p.name ?? ""), number: Number.isFinite(Number(p.number)) && p.number !== null ? Number(p.number) : null, photo: String(p.photo) }));
}

/**
 * Retrouve notre joueur pour une ligne de l'effectif API-Football.
 * 1) nom identique ; 2) « B. Dia » → même nom de famille et prénom commençant par B ;
 * 3) même nom de famille, départagé par le numéro de maillot. Ambigu → null (on ne devine pas).
 */
export function matchSquadPlayer<T extends { id: string; name: string; shirtNumber: number | null }>(sp: SquadPhoto, players: readonly T[]): T | null {
  const target = normalizeName(sp.name);
  if (!target) return null;
  const norm = players.map((p) => ({ p, words: normalizeName(p.name).split(" ") }));
  const exact = norm.filter((x) => x.words.join(" ") === target);
  if (exact.length === 1) return exact[0].p;

  const tw = target.split(" ");
  const initial = tw.length > 1 && tw[0].length === 1 ? tw[0] : null; // « b dia »
  const lastWords = initial ? tw.slice(1) : tw.slice(-1);
  const last = lastWords.join(" ");
  const sameLast = norm.filter((x) => x.words.join(" ").endsWith(last) && x.words.length > lastWords.length - 1);

  const byInitial = initial ? sameLast.filter((x) => x.words[0].startsWith(initial)) : sameLast;
  if (byInitial.length === 1) return byInitial[0].p;
  const pool = byInitial.length ? byInitial : sameLast;
  if (sp.number !== null) {
    const byNumber = pool.filter((x) => x.p.shirtNumber === sp.number);
    if (byNumber.length === 1) return byNumber[0].p;
  }
  return null;
}
