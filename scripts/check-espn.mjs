// Teste ce que l'API (non officielle) d'ESPN donne pour le Stade Rennais.
// Aucune clé nécessaire.
//
// PowerShell, depuis C:\xampp\rouge-noir :
//   node scripts/check-espn.mjs
// Copie-colle tout ce qui s'affiche dans la conversation.
// Les réponses brutes sont aussi enregistrées dans scripts/espn-samples/.

import { mkdirSync, writeFileSync } from "node:fs";

const BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer";
const LEAGUES = {
  "fra.1": "Ligue 1",
  "uefa.europa": "Europa League",
  "fra.coupe_de_france": "Coupe de France",
};
const OUT = "scripts/espn-samples";
mkdirSync(OUT, { recursive: true });

const line = (t) => console.log("\n── " + t + " " + "─".repeat(Math.max(0, 60 - t.length)));
const save = (name, data) => writeFileSync(`${OUT}/${name}.json`, JSON.stringify(data, null, 2));

async function get(path) {
  try {
    const res = await fetch(BASE + path, { signal: AbortSignal.timeout(15000) });
    if (!res.ok) return { error: `HTTP ${res.status}` };
    return { data: await res.json() };
  } catch (e) {
    return { error: e.message };
  }
}

const scoreOf = (c) =>
  typeof c?.score === "object" ? c.score?.displayValue ?? c.score?.value : c?.score;

function describe(ev) {
  const comp = ev.competitions?.[0];
  const home = comp?.competitors?.find((c) => c.homeAway === "home");
  const away = comp?.competitors?.find((c) => c.homeAway === "away");
  const st = comp?.status?.type ?? ev.status?.type;
  const score = st?.completed ? ` ${scoreOf(home) ?? "?"}-${scoreOf(away) ?? "?"}` : "";
  const when = new Date(ev.date).toLocaleString("fr-FR", { timeZone: "Europe/Paris" });
  return `${when} | ${home?.team?.displayName} -${score} ${away?.team?.displayName} | ${st?.description ?? st?.name ?? "?"}`;
}

// 1. Identifiant ESPN du Stade Rennais
line("1. Équipe");
const teams = await get("/fra.1/teams");
if (teams.error) {
  console.log("❌ Liste des équipes de Ligue 1 inaccessible :", teams.error);
  process.exit(1);
}
const all = teams.data.sports?.[0]?.leagues?.[0]?.teams?.map((t) => t.team) ?? [];
const rennes = all.find((t) => /rennais|rennes/i.test(t.displayName ?? t.name ?? ""));
if (!rennes) {
  console.log("❌ Rennes introuvable. Équipes reçues :", all.map((t) => t.displayName).join(", "));
  process.exit(1);
}
console.log(`${rennes.displayName} → id ESPN ${rennes.id}`);

// 2. Calendrier par compétition (matchs joués + à venir)
const finished = [];
for (const [slug, label] of Object.entries(LEAGUES)) {
  line(`2. ${label} (${slug})`);
  const past = await get(`/${slug}/teams/${rennes.id}/schedule`);
  const next = await get(`/${slug}/teams/${rennes.id}/schedule?fixture=true`);
  if (past.error && next.error) {
    console.log("❌", past.error);
    continue;
  }
  if (past.data) save(`schedule-${slug}`, past.data);
  if (next.data) save(`fixtures-${slug}`, next.data);
  const season = past.data?.requestedSeason ?? past.data?.season;
  if (season) console.log("Saison renvoyée :", season.displayName ?? season.year);

  const pastEvents = past.data?.events ?? [];
  const nextEvents = next.data?.events ?? [];
  console.log(`Matchs joués : ${pastEvents.length} | à venir : ${nextEvents.length}`);
  for (const ev of pastEvents.slice(-3)) console.log("  ✓", describe(ev));
  for (const ev of nextEvents.slice(0, 3)) console.log("  →", describe(ev));
  for (const ev of pastEvents) {
    if (ev.competitions?.[0]?.status?.type?.completed) finished.push({ slug, ev });
  }
}

// 3. Buteurs du dernier match terminé
line("3. Détail du dernier match terminé");
finished.sort((a, b) => new Date(a.ev.date) - new Date(b.ev.date));
const last = finished.at(-1);
let summary = null;
if (!last) {
  console.log("Aucun match terminé trouvé.");
} else {
  console.log(describe(last.ev));
  const sum = await get(`/${last.slug}/summary?event=${last.ev.id}`);
  if (sum.error) {
    console.log("❌", sum.error);
  } else {
    summary = sum.data;
    save(`summary-${last.ev.id}`, summary);
    const goals = (summary.keyEvents ?? []).filter(
      (k) => k.scoringPlay || /goal|but/i.test(k.type?.text ?? ""),
    );
    if (!goals.length) console.log("Aucun but trouvé dans keyEvents.");
    for (const g of goals) {
      const who = g.participants?.map((p) => p.athlete?.displayName).filter(Boolean).join(", ");
      console.log(
        `  ⚽ ${g.clock?.displayValue ?? "?"} | ${g.type?.text} | ${g.team?.displayName ?? "?"} | ${who || "?"}`,
      );
    }
    console.log("Types d'événements vus :", [...new Set((summary.keyEvents ?? []).map((k) => k.type?.text))].join(", "));
  }
}

// 4. Effectif
line("4. Effectif");
const roster = await get(`/fra.1/teams/${rennes.id}/roster`);
if (roster.error) {
  console.log("❌", roster.error);
} else {
  save("roster", roster.data);
  const athletes = roster.data.athletes ?? [];
  console.log("Joueurs :", athletes.length);
  console.log("Exemples :", athletes.slice(0, 5).map((a) => `${a.displayName} (${a.position?.abbreviation ?? "?"})`).join(", "));
}

// 5. Cotes
line("5. Cotes");
const keys = summary ? Object.keys(summary).filter((k) => /odd|pick/i.test(k)) : [];
console.log(keys.length ? `Rubriques de cotes trouvées : ${keys.join(", ")}` : "Aucune rubrique de cotes dans le détail du match.");

console.log(`\nTerminé. Réponses brutes enregistrées dans ${OUT}/`);
