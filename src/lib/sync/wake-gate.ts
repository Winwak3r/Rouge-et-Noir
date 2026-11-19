// « Portier » de la synchronisation automatique : décide, SANS TOUCHER À LA BASE, si l'appel de cron-job.org
// (chaque minute) doit lancer une synchronisation. Neon met la base en veille après quelques minutes sans
// activité et ne décompte alors rien : en dehors des matchs, on la laisse dormir.
//
//  - autour d'un match (2 h 30 avant → 4 h après le coup d'envoi) : à chaque appel (rappels, compositions,
//    direct, notifications, confirmation du résultat) ;
//  - dans les 48 h avant un match : toutes les 20 min (cotes, notification de la veille) ;
//  - sinon : toutes les 6 h (calendrier, effectif).
// Le calendrier vient d'ESPN (gardé en mémoire 3 h), jamais de la base.

import { createEspnProvider } from "@/lib/providers/espn";

const MIN = 60_000;
const HOUR = 60 * MIN;

export const GATE = {
  hotBefore: 150 * MIN,
  hotAfter: 4 * HOUR,
  warmBefore: 48 * HOUR,
  warmEvery: 20 * MIN,
  coldEvery: 6 * HOUR,
  scheduleTtl: 3 * HOUR,
};

export type GateMode = "hot" | "warm" | "cold";

/** Mode du moment, d'après les coups d'envoi connus (fonction pure, testée). */
export function gateMode(kickoffs: Date[], now: Date): GateMode {
  let warm = false;
  for (const k of kickoffs) {
    const d = k.getTime() - now.getTime(); // > 0 : match à venir
    if (d <= GATE.hotBefore && d >= -GATE.hotAfter) return "hot";
    if (d > 0 && d <= GATE.warmBefore) warm = true;
  }
  return warm ? "warm" : "cold";
}

/** Faut-il lancer la synchronisation maintenant ? (fonction pure, testée) */
export function gateDecision(mode: GateMode, lastRun: number | null, now: Date): boolean {
  if (lastRun === null) return true; // premier appel de cette instance
  const every = mode === "hot" ? 0 : mode === "warm" ? GATE.warmEvery : GATE.coldEvery;
  return now.getTime() - lastRun >= every;
}

// Mémoire de l'instance serveur (perdue à un redémarrage : on synchronise alors une fois, sans risque)
let schedule: { kickoffs: Date[]; at: number } | null = null;
let lastRun: number | null = null;

async function kickoffs(now: Date): Promise<Date[] | null> {
  if (schedule && now.getTime() - schedule.at < GATE.scheduleTtl) return schedule.kickoffs;
  try {
    const list = await createEspnProvider().listMatches(Number(process.env.SEASON_START_YEAR ?? 2026));
    schedule = { kickoffs: list.map((m) => m.kickoffAt), at: now.getTime() };
    return schedule.kickoffs;
  } catch {
    return schedule?.kickoffs ?? null; // ESPN injoignable : dernier calendrier connu, sinon on synchronise
  }
}

export async function shouldSync(now = new Date()): Promise<{ run: boolean; mode: GateMode | "inconnu" }> {
  const k = await kickoffs(now);
  const mode = k ? gateMode(k, now) : "inconnu";
  const run = mode === "inconnu" ? gateDecision("warm", lastRun, now) : gateDecision(mode, lastRun, now);
  if (run) lastRun = now.getTime();
  return { run, mode };
}
