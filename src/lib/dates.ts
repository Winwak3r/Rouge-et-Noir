const TZ = "Europe/Paris";

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(d);
}

/** « sam. 25 oct. » */
export function formatShortDate(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, weekday: "short", day: "numeric", month: "short" }).format(d);
}

/** « 17:15 » */
export function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(d);
}

/** « 22/10 à 18:45 » */
export function formatStamp(d: Date): string {
  const day = new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "2-digit", month: "2-digit" }).format(d);
  return `${day} à ${formatTime(d)}`;
}

/** Décalage (ms) de l'heure de Paris par rapport à UTC à un instant donné (+1 h l'hiver, +2 h l'été). */
function parisOffset(at: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date(at));
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second")) - at;
}

/** « 2026-11-08T14:30 » saisi à l'heure de Paris → instant exact (null si invalide). */
export function parisLocalToDate(value: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!m) return null;
  const naive = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  let t = naive - parisOffset(naive);
  t = naive - parisOffset(t); // second passage : exact autour des changements d'heure
  return Number.isFinite(t) ? new Date(t) : null;
}

/** Instant → « 2026-11-08T14:30 » à l'heure de Paris (valeur d'un champ datetime-local). */
export function toParisLocalInput(d: Date): string {
  const p = new Intl.DateTimeFormat("sv-SE", {
    timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(d);
  return p.replace(" ", "T");
}

/** Date (AAAA-MM-JJ) d'un instant à l'heure de Paris. */
export function parisDay(d: Date): string {
  return toParisLocalInput(d).slice(0, 10);
}

/**
 * Minuit (heure de Paris) à la fin du lendemain de la fin du match.
 * Ex. : match terminé dimanche soir → l'encart « Match terminé » disparaît dans la nuit de lundi à mardi.
 */
export function endOfNextDayParis(matchEnd: Date): Date {
  const [y, m, d] = parisDay(matchEnd).split("-").map(Number);
  const target = new Date(Date.UTC(y, m - 1, d + 2)); // jour J+2 à 00:00 (date seulement)
  return parisLocalToDate(`${target.toISOString().slice(0, 10)}T00:00`)!;
}

/** « 26/10/26 » */
export function formatShortNumeric(d: Date): string {
  return new Intl.DateTimeFormat("fr-FR", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "2-digit" }).format(d);
}
