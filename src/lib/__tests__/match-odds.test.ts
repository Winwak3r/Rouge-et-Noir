// Données FICTIVES aux formats ESPN.
import { describe, expect, it } from "vitest";
import { americanToDecimal, parseMatchOdds } from "../providers/espn-parse";
import { impliedProbabilities, indexLevel, outcomeIndices } from "../match-odds";

describe("Cotes du match (1-N-2) : lecture ESPN", () => {
  it("format Bet365 (fractionnaires)", () => {
    const o = parseMatchOdds({
      odds: [
        {
          provider: { name: "Bet 365" },
          bettingOdds: {
            teamOdds: { preMatchMoneyLineHome: { value: "6/5" }, preMatchMoneyLineDraw: { value: "12/5" }, preMatchMoneyLineAway: { value: "9/4" } },
          },
        },
      ],
    });
    expect(o).toEqual({ home: 2.2, draw: 3.4, away: 3.25 });
  });
  it("format américain (moneyLine)", () => {
    const o = parseMatchOdds({ odds: [{ homeTeamOdds: { moneyLine: -150 }, drawOdds: { moneyLine: 260 }, awayTeamOdds: { moneyLine: 400 } }] });
    expect(o?.home.toFixed(3)).toBe("1.667");
    expect(o?.draw).toBe(3.6);
    expect(o?.away).toBe(5);
  });
  it("format moneyline.{home,draw,away}", () => {
    const o = parseMatchOdds({ odds: [{ moneyline: { home: { close: { odds: "+120" } }, draw: { close: { odds: "+230" } }, away: { close: { odds: "+210" } } } }] });
    expect(o).toEqual({ home: 2.2, draw: 3.3, away: 3.1 });
  });
  it("cotes incomplètes : rien", () => {
    expect(parseMatchOdds({ odds: [{ provider: { name: "Bet 365" }, bettingOdds: { playerOdds: {} } }] })).toBeNull();
    expect(americanToDecimal("abc")).toBeNull();
  });
});

describe("Indices de 1 à 5", () => {
  it("probabilités sans la marge du bookmaker (total 100 %)", () => {
    const p = impliedProbabilities({ home: 2.2, draw: 3.4, away: 3.25 });
    expect(Math.round((p.home + p.draw + p.away) * 1000)).toBe(1000);
  });
  it("seuils", () => {
    expect([0.1, 0.2, 0.4, 0.5, 0.7].map(indexLevel)).toEqual([1, 2, 3, 4, 5]);
  });
  it("favori net : 5 / nul 2 / outsider 1", () => {
    const i = outcomeIndices({ home: 1.3, draw: 5.5, away: 10 });
    expect([i.home.level, i.draw.level, i.away.level]).toEqual([5, 2, 1]);
  });
});
