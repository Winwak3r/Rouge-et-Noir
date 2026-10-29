// Données FICTIVES au format API-Football.
import { describe, expect, it } from "vitest";
import { matchSquadPlayer, parseSquad } from "../squad-photos";

const ours = [
  { id: "a", name: "Boulaye Dia", shirtNumber: 9 },
  { id: "b", name: "Lucas Dia", shirtNumber: 30 }, // homonyme fictif
  { id: "c", name: "Mousa Al-Tamari", shirtNumber: 10 },
  { id: "d", name: "Anthony Rouault", shirtNumber: 4 },
  { id: "e", name: "Brice Samba", shirtNumber: 1 },
];
const sp = (name: string, number: number | null = null) => ({ id: 1, name, number, photo: "x.png" });

describe("Photos officielles : lecture de l'effectif", () => {
  it("garde les joueurs qui ont une photo", () => {
    const list = parseSquad({ response: [{ players: [{ id: 1, name: "B. Dia", number: 9, photo: "p1.png" }, { id: 2, name: "Sans photo" }] }] });
    expect(list).toEqual([{ id: 1, name: "B. Dia", number: 9, photo: "p1.png" }]);
  });
});

describe("Photos officielles : rapprochement des noms", () => {
  it("nom complet identique", () => {
    expect(matchSquadPlayer(sp("Anthony Rouault"), ours)?.id).toBe("d");
  });
  it("prénom abrégé : « B. Dia » → Boulaye Dia, pas Lucas Dia", () => {
    expect(matchSquadPlayer(sp("B. Dia"), ours)?.id).toBe("a");
    expect(matchSquadPlayer(sp("L. Dia"), ours)?.id).toBe("b");
  });
  it("nom composé avec tiret", () => {
    expect(matchSquadPlayer(sp("M. Al-Tamari"), ours)?.id).toBe("c");
  });
  it("même nom de famille sans initiale : départagé par le numéro", () => {
    expect(matchSquadPlayer(sp("Dia", 30), ours)?.id).toBe("b");
    expect(matchSquadPlayer(sp("Dia"), ours)).toBeNull(); // ambigu : on ne devine pas
  });
  it("inconnu → null", () => {
    expect(matchSquadPlayer(sp("Z. Inconnu"), ours)).toBeNull();
  });
});
