// Extrait RÉEL d'une réponse ESPN (Juventus 2-2 Stade Rennais, Europa League, 22/10/2026).
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  fillMatchdays,
  mapStatus,
  parseClock,
  parseScheduleEvent,
  parseSummary,
} from "../espn-parse";
import { matchPlayerName, normalizeName } from "../names";

const summary = JSON.parse(
  readFileSync(new URL("./fixtures/espn-summary-juventus-rennes.json", import.meta.url), "utf8"),
);

describe("ESPN : détail d'un match réel", () => {
  const d = parseSummary(summary);

  it("statut et score final", () => {
    expect(d.status).toBe("FINISHED");
    expect(d.homeScore).toBe(2);
    expect(d.awayScore).toBe(2);
    expect(d.regulation).toEqual({ home: 2, away: 2 });
    expect(d.afterExtraTime).toBeNull();
    expect(d.penalties).toBeNull();
  });

  it("quatre buts, le premier participant est le buteur (pas le passeur)", () => {
    expect(d.goals.map((g) => [g.minute, g.playerName, g.isPenalty])).toEqual([
      [5, "Zeki Çelik", false],
      [15, "Mousa Al-Tamari", false],
      [43, "Boulaye Dia", true],
      [67, "Nick Woltemade", true],
    ]);
  });

  it("buteurs rennais identifiés par l'identifiant ESPN de l'équipe", () => {
    const rennes = d.goals.filter((g) => g.teamExternalId === 169 && !g.isOwnGoal && !g.isShootout);
    expect(rennes.map((g) => g.playerExternalId)).toEqual([257489, 282381]);
  });

  it("feuille de match rennaise : 23 joueurs dont 11 titulaires, sans Esteban Lepaul", () => {
    const rennes = d.lineups[169];
    expect(rennes.length).toBe(23);
    expect(rennes.filter((p) => p.starter).length).toBe(11);
    expect(rennes.some((p) => p.name === "Boulaye Dia")).toBe(true);
    expect(rennes.some((p) => /Lepaul/.test(p.name))).toBe(false);
    expect(rennes.find((p) => p.name === "Anthony Rouault")?.position).toBe("D");
  });

  it("cotes buteur avant-match converties en décimal, « No Goalscorer » exclu", () => {
    const dia = d.scorerOdds.find((o) => o.playerName === "Boulaye Dia");
    expect(dia?.decimal).toBe(3.75);
    expect(d.scorerOdds.some((o) => /no goal/i.test(o.playerName))).toBe(false);
    expect(d.scorerOdds.length).toBe(42);
  });
});

describe("ESPN : statuts et horloge", () => {
  it("convertit les statuts", () => {
    expect(mapStatus({ name: "STATUS_SCHEDULED", state: "pre" })).toBe("SCHEDULED");
    expect(mapStatus({ name: "STATUS_FIRST_HALF", state: "in" })).toBe("LIVE");
    expect(mapStatus({ name: "STATUS_HALFTIME", state: "in" })).toBe("LIVE");
    expect(mapStatus({ name: "STATUS_FULL_TIME", state: "post", completed: true })).toBe("FINISHED");
    expect(mapStatus({ name: "STATUS_FINAL_PEN", state: "post", completed: true })).toBe("FINISHED");
    expect(mapStatus({ name: "STATUS_POSTPONED", state: "pre" })).toBe("POSTPONED");
    expect(mapStatus({ name: "STATUS_CANCELED", state: "post" })).toBe("CANCELLED");
    expect(mapStatus({ name: "STATUS_ABANDONED", state: "post" })).toBe("INTERRUPTED");
  });
  it("lit les minutes avec temps additionnel", () => {
    expect(parseClock("45'+2'")).toEqual({ minute: 45, extra: 2 });
    expect(parseClock("67'")).toEqual({ minute: 67, extra: null });
  });
});

describe("ESPN : prolongation et tirs au but (données fictives)", () => {
  it("sépare temps réglementaire, prolongation et tirs au but", () => {
    const d = parseSummary({
      header: {
        competitions: [
          {
            status: { type: { name: "STATUS_FINAL_PEN", state: "post", completed: true } },
            competitors: [
              { homeAway: "home", score: "2", shootoutScore: "4", team: { id: "169" } },
              { homeAway: "away", score: "2", shootoutScore: "3", team: { id: "999" } },
            ],
          },
        ],
      },
      keyEvents: [
        { id: "a", scoringPlay: true, period: { number: 1 }, clock: { displayValue: "10'" }, team: { id: "169" }, participants: [{ athlete: { id: "1", displayName: "A" } }], type: { type: "goal" } },
        { id: "b", scoringPlay: true, period: { number: 2 }, clock: { displayValue: "80'" }, team: { id: "999" }, participants: [{ athlete: { id: "2", displayName: "B" } }], type: { type: "goal" } },
        { id: "c", scoringPlay: true, period: { number: 3 }, clock: { displayValue: "100'" }, team: { id: "169" }, participants: [{ athlete: { id: "3", displayName: "C" } }], type: { type: "goal" } },
        { id: "d", scoringPlay: true, period: { number: 4 }, clock: { displayValue: "115'" }, team: { id: "999" }, participants: [{ athlete: { id: "4", displayName: "D" } }], type: { type: "goal" } },
        { id: "e", scoringPlay: true, shootout: true, period: { number: 5 }, team: { id: "169" }, participants: [{ athlete: { id: "5", displayName: "E" } }], type: { type: "penalty---scored" } },
        { id: "f", scoringPlay: false, period: { number: 2 }, type: { type: "goal", text: "Goal Disallowed" }, team: { id: "169" } },
      ],
    });
    expect(d.regulation).toEqual({ home: 1, away: 1 });
    expect(d.afterExtraTime).toEqual({ home: 2, away: 2 });
    expect(d.penalties).toEqual({ home: 4, away: 3 });
    expect(d.goals.filter((g) => g.isShootout).map((g) => g.key)).toEqual(["e"]);
    expect(d.goals.map((g) => g.key)).not.toContain("f");
  });
});

describe("ESPN : cartons rouges (données fictives)", () => {
  it("rouge direct et deuxième jaune, sans les simples jaunes", () => {
    const d = parseSummary({
      header: { competitions: [{ status: { type: { name: "STATUS_SECOND_HALF", state: "in" } }, competitors: [] }] },
      keyEvents: [
        { id: "1", type: { type: "yellow-card", text: "Yellow Card" }, clock: { displayValue: "12'" }, team: { id: "169" }, participants: [{ athlete: { id: "9", displayName: "A" } }] },
        { id: "2", type: { type: "red-card", text: "Red Card" }, clock: { displayValue: "34'" }, team: { id: "999" }, participants: [{ athlete: { id: "8", displayName: "Défenseur Adverse" } }] },
        { id: "3", type: { type: "yellow-red-card", text: "Yellow Card - Red" }, clock: { displayValue: "90'+2'" }, team: { id: "169" }, participants: [{ athlete: { id: "7", displayName: "Milieu Rennais" } }] },
      ],
    });
    expect(d.redCards.map((c) => [c.playerName, c.minute, c.extraMinute, c.secondYellow, c.teamExternalId])).toEqual([
      ["Défenseur Adverse", 34, null, false, 999],
      ["Milieu Rennais", 90, 2, true, 169],
    ]);
  });
  it("aucun carton rouge sur Juventus-Rennes (match réel)", () => {
    expect(parseSummary(summary).redCards).toEqual([]);
  });
});

describe("ESPN : calendrier (données fictives)", () => {
  const ev = (id: string, date: string, extra: object = {}) => ({
    id,
    date,
    competitions: [
      {
        status: { type: { name: "STATUS_SCHEDULED", state: "pre" } },
        competitors: [
          { homeAway: "home", team: { id: "169", displayName: "Stade Rennais", logos: [{ href: "x.png" }] } },
          { homeAway: "away", team: { id: "174", displayName: "Strasbourg" } },
        ],
        ...extra,
      },
    ],
  });
  it("lit un match à venir sans score", () => {
    const m = parseScheduleEvent(ev("1", "2030-10-25T15:15Z"), "LIGUE_1");
    expect(m).toMatchObject({ externalId: 1, status: "SCHEDULED", homeScore: null, isKnockout: false });
    expect(m?.home.logoUrl).toBe("x.png");
  });
  it("Coupe de France : phase traduite et élimination directe", () => {
    const m = parseScheduleEvent(ev("2", "2030-12-20T15:00Z", { notes: [{ headline: "Round of 64" }] }), "COUPE_DE_FRANCE");
    expect(m).toMatchObject({ stage: "32e de finale", isKnockout: true });
  });
  it("numérote les journées de Ligue 1 dans l'ordre chronologique", () => {
    const list = fillMatchdays([
      parseScheduleEvent(ev("10", "2030-09-01T15:00Z"), "LIGUE_1")!,
      parseScheduleEvent(ev("11", "2030-08-20T15:00Z"), "LIGUE_1")!,
    ]);
    expect(list.map((m) => [m.externalId, m.matchday])).toEqual([[10, 2], [11, 1]]);
  });
});

describe("Rapprochement des noms (cotes ↔ effectif)", () => {
  const squad = [
    { id: "a", name: "Mousa Al-Tamari" },
    { id: "b", name: "Issa Soumaré" },
    { id: "c", name: "Abdelhamid Aït Boudlal" },
    { id: "d", name: "Boulaye Dia" },
    { id: "e", name: "Lucas Dia" }, // homonyme fictif
  ];
  it("normalise accents et tirets", () => {
    expect(normalizeName("Aït-Boudlal")).toBe("ait boudlal");
  });
  it("retrouve les joueurs malgré les variantes", () => {
    expect(matchPlayerName("Mousa Tamari", squad)?.id).toBe("a");
    expect(matchPlayerName("Issa Soumare", squad)?.id).toBe("b");
    expect(matchPlayerName("Abdelhamid Ait Boudlal", squad)?.id).toBe("c");
    expect(matchPlayerName("Boulaye Dia", squad)?.id).toBe("d");
  });
  it("refuse un cas ambigu plutôt que de deviner", () => {
    expect(matchPlayerName("Dia", squad)).toBeNull();
    expect(matchPlayerName("Nick Woltemade", squad)).toBeNull();
  });
});
