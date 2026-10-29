// Lecture et contrôle du formulaire de barème de l'administration (fonction pure, testée).
import type { ScoringRules } from "./rules";

type Input = Record<string, string | undefined>;

export function parseRulesForm(f: Input): { ok: true; rules: Omit<ScoringRules, "version"> } | { ok: false; error: string } {
  const int = (k: string, min: number, max: number, label: string): number | string => {
    const v = (f[k] ?? "").trim();
    if (!/^-?\d+$/.test(v)) return `${label} : nombre entier attendu.`;
    const n = Number(v);
    return n < min || n > max ? `${label} : entre ${min} et ${max}.` : n;
  };
  const dec = (k: string, min: number, max: number, label: string): number | string => {
    const v = (f[k] ?? "").trim().replace(",", ".");
    const n = Number(v);
    return v === "" || !Number.isFinite(n) || n < min || n > max ? `${label} : entre ${min} et ${max}.` : n;
  };
  const values = {
    exact: int("exact", 0, 50, "Score exact"),
    goalDiff: int("goalDiff", 0, 50, "Bon écart"),
    outcome: int("outcome", 0, 50, "Bon résultat"),
    wrong: int("wrong", -20, 20, "Mauvais résultat"),
    missing: int("missing", -20, 0, "Sans pronostic"),
    oddsDivisor: dec("oddsDivisor", 0.5, 10, "Diviseur de cote"),
    minBonus: int("minBonus", 0, 20, "Bonus minimum"),
    maxBonus: int("maxBonus", 1, 50, "Bonus maximum"),
    fixedBonus: int("fixedBonus", 0, 20, "Bonus sans cote"),
    noScorerBonus: int("noScorerBonus", 0, 20, "Bonus « Aucun buteur »"),
  };
  const err = Object.values(values).find((v) => typeof v === "string");
  if (typeof err === "string") return { ok: false, error: err };
  const n = values as Record<keyof typeof values, number>;
  if (n.maxBonus < n.minBonus) return { ok: false, error: "Le bonus maximum doit être supérieur ou égal au minimum." };
  if (!(n.exact >= n.goalDiff && n.goalDiff >= n.outcome && n.outcome >= n.wrong)) {
    return { ok: false, error: "Ordre attendu : score exact ≥ bon écart ≥ bon résultat ≥ mauvais résultat." };
  }
  return {
    ok: true,
    rules: {
      points: { exact: n.exact, goalDiff: n.goalDiff, outcome: n.outcome, wrong: n.wrong, missing: n.missing },
      knockoutScoreBasis: f.knockout === "REGULATION" ? "REGULATION" : "AFTER_EXTRA_TIME",
      scorerBonus: { oddsDivisor: n.oddsDivisor, minBonus: n.minBonus, maxBonus: n.maxBonus },
      noScorerBonus: n.noScorerBonus,
      scorerFallback: { mode: f.fallbackMode === "NONE" ? "NONE" : "FIXED", fixedBonus: n.fixedBonus },
    },
  };
}

/** Cote décimale saisie par l'admin (« 3,75 » ou « 3.75 ») ; null si invalide. */
export function parseOddsInput(v: string): number | null {
  const s = v.trim().replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return null;
  const n = Number(s);
  return n > 1 && n <= 500 ? n : null;
}
