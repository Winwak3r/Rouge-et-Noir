// Données FICTIVES.
import { describe, expect, it } from "vitest";
import { buildMatchRows, matchPhase, ordinalFr, type RowInput } from "../match-view";
import { DEFAULT_RULES } from "../scoring/rules";

const KO = new Date("2030-05-10T19:00:00Z");
const before = new Date(KO.getTime() - 3600_000);
const after = new Date(KO.getTime() + 3600_000);

describe("Statut des pronostics", () => {
  const m = (status: "SCHEDULED" | "LIVE" | "FINISHED" | "POSTPONED" | "CANCELLED" | "INTERRUPTED", confirmed = false) => ({
    status,
    kickoffAt: KO,
    resultConfirmedAt: confirmed ? after : null,
  });
  it("ouverts avant le coup d'envoi, clôturés après", () => {
    expect(matchPhase(m("SCHEDULED"), before)).toBe("OPEN");
    expect(matchPhase(m("SCHEDULED"), after)).toBe("CLOSED");
    expect(matchPhase(m("LIVE"), after)).toBe("CLOSED");
  });
  it("résultat en attente puis définitif", () => {
    expect(matchPhase(m("FINISHED"), after)).toBe("AWAITING");
    expect(matchPhase(m("FINISHED", true), after)).toBe("FINAL");
  });
  it("reporté, interrompu, annulé", () => {
    expect(matchPhase(m("POSTPONED"), after)).toBe("POSTPONED");
    expect(matchPhase(m("INTERRUPTED"), after)).toBe("INTERRUPTED");
    expect(matchPhase(m("CANCELLED"), before)).toBe("CANCELLED");
  });
  it("ordinal français", () => {
    expect(ordinalFr(1)).toBe("1er");
    expect(ordinalFr(3)).toBe("3e");
  });
});

const users = [
  { id: "moi", pseudo: "Moi", createdAt: new Date("2030-01-01") },
  { id: "ami", pseudo: "Ami", createdAt: new Date("2030-01-01") },
  { id: "absent", pseudo: "Absent", createdAt: new Date("2030-01-01") },
  { id: "tardif", pseudo: "Tardif", createdAt: after },
];
const base: RowInput = {
  users,
  me: "moi",
  rennesIsHome: false, // Rennes à l'extérieur : le score s'affiche domicile - extérieur
  kickoffAt: KO,
  isPublic: false,
  preds: [
    { userId: "moi", rennesGoals: 2, opponentGoals: 1, scorerName: "Dia", noScorerPick: false },
    { userId: "ami", rennesGoals: 0, opponentGoals: 0, scorerName: null, noScorerPick: true },
  ],
  results: [],
};

describe("Pronostics et points : avant le coup d'envoi", () => {
  const rows = buildMatchRows(base);
  it("mon pronostic est visible, dans l'ordre domicile - extérieur", () => {
    expect(rows[0]).toMatchObject({ mine: true, status: "ok", visible: true, score: { label: "1 - 2", tone: "neutral" } });
    expect(rows[0].scorer?.label).toBe("Dia");
  });
  it("statut du buteur : OK si pari fait, AC sinon", () => {
    const r = buildMatchRows({
      ...base,
      preds: [
        { userId: "moi", rennesGoals: 1, opponentGoals: 0, scorerName: null, noScorerPick: false },
        { userId: "ami", rennesGoals: 0, opponentGoals: 0, scorerName: null, noScorerPick: false, hasScorerBet: true },
      ],
    });
    expect(r.map((x) => [x.status, x.scorerStatus])).toEqual([["ok", "todo"], ["ok", "ok"], ["todo", "todo"], ["todo", "todo"]]);
    expect(r[1].scorer).toBeNull(); // jamais le nom du buteur des autres avant le match
  });
  it("celui des autres reste secret : seul le statut sort", () => {
    expect(rows[1]).toMatchObject({ status: "ok", visible: false, score: null, scorer: null });
    expect(rows[2]).toMatchObject({ status: "todo", visible: false });
  });
});

describe("Points gagnables affichés avec le buteur", () => {
  it("« Nom · +N pts »", () => {
    const rows = buildMatchRows({
      ...base,
      preds: [{ userId: "moi", rennesGoals: 1, opponentGoals: 0, scorerName: "Arnaud Nordin", noScorerPick: false, scorerBonus: 2 }],
    });
    expect(rows[0].scorer?.label).toBe("Arnaud Nordin · +2 pts");
  });
});

describe("Couleurs et points en direct (Rennes mène 2-1 à l'extérieur)", () => {
  const live = (score: { rennes: number; opponent: number }, scorers: string[] = []) =>
    buildMatchRows({
      ...base,
      isPublic: true,
      users: [...users.slice(0, 2), { id: "x", pseudo: "X", createdAt: new Date("2030-01-01") }, { id: "y", pseudo: "Y", createdAt: new Date("2030-01-01") }],
      preds: [
        { userId: "moi", rennesGoals: 2, opponentGoals: 1, scorerName: "Dia", scorerId: "dia", noScorerPick: false, scorerBonus: 2 },
        { userId: "ami", rennesGoals: 3, opponentGoals: 2, scorerName: null, noScorerPick: true, scorerBonus: 2 },
        { userId: "x", rennesGoals: 1, opponentGoals: 0, scorerName: null, noScorerPick: false },
        { userId: "y", rennesGoals: 0, opponentGoals: 0, scorerName: null, noScorerPick: false },
      ],
      live: { score, rennesScorerIds: scorers, rennesPlayerScored: scorers.length > 0, rules: DEFAULT_RULES },
    });

  it("vert (exact), vert clair (écart), jaune (vainqueur), rouge (faux)", () => {
    const rows = live({ rennes: 2, opponent: 1 }, ["dia"]);
    expect(rows.map((r) => r.score?.tone)).toEqual(["exact", "diff", "diff", "wrong"]);
    const rows2 = live({ rennes: 3, opponent: 1 }, ["dia"]);
    expect(rows2.find((r) => r.userId === "x")?.score?.tone).toBe("outcome");
  });
  it("buteur exact en vert, points calculés en direct et marqués provisoires", () => {
    const rows = live({ rennes: 2, opponent: 1 }, ["dia"]);
    expect(rows[0]).toMatchObject({ scorer: { tone: "exact" }, total: 6, provisional: true });
    expect(rows[1]).toMatchObject({ scorer: { label: "Aucun buteur · +2 pts", tone: "wrong" }, total: 2 });
  });
  it("tant qu'aucun Rennais n'a marqué, « Aucun buteur » est vert", () => {
    const rows = live({ rennes: 0, opponent: 0 });
    expect(rows[1].scorer?.tone).toBe("exact");
  });
});

describe("Pronostics et points : après le match", () => {
  const rows = buildMatchRows({
    ...base,
    isPublic: true,
    results: [
      { userId: "moi", category: "EXACT", scorePoints: 4, scorerPoints: 2, totalPoints: 6 },
      { userId: "ami", category: "WRONG", scorePoints: 0, scorerPoints: 0, totalPoints: 0 },
      { userId: "absent", category: "MISSING", scorePoints: -1, scorerPoints: 0, totalPoints: -1 },
    ],
  });
  it("tout est visible avec les couleurs de résultat", () => {
    expect(rows[0]).toMatchObject({ total: 6, score: { tone: "exact" }, scorer: { label: "Dia", tone: "exact" } });
    expect(rows[1]).toMatchObject({ visible: true, score: { label: "0 - 0", tone: "wrong" }, scorer: { label: "Aucun buteur", tone: "wrong" } });
  });
  it("sans pronostic : « — » et -1 ; inscrit après le match : absent de la liste", () => {
    expect(rows[2]).toMatchObject({ status: "missing", total: -1 });
    expect(rows.find((r) => r.userId === "tardif")).toBeUndefined();
  });
});
