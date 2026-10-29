// Vérifie ce que ta clé API-Football donne pour le Stade Rennais, saison 2026-2027.
// Consomme 5 requêtes au maximum (sur 100 par jour en formule gratuite).
//
// Windows (PowerShell) :
//   $env:API_FOOTBALL_KEY="ta_cle"; node scripts/check-api-football.mjs
// Puis copie-colle tout ce qui s'affiche dans la conversation.

const KEY = process.env.API_FOOTBALL_KEY;
const BASE = "https://v3.football.api-sports.io";
const SEASON = 2026; // API-Football désigne la saison 2026-2027 par 2026

if (!KEY) {
  console.error("❌ Variable API_FOOTBALL_KEY absente.");
  process.exit(1);
}

async function call(path) {
  const res = await fetch(BASE + path, { headers: { "x-apisports-key": KEY } });
  const json = await res.json();
  const errors = json.errors && Object.keys(json.errors).length ? json.errors : null;
  return { status: res.status, errors, results: json.results ?? 0, response: json.response ?? [] };
}

const line = (t) => console.log("\n── " + t + " " + "─".repeat(Math.max(0, 60 - t.length)));

// 1. Formule et quota
line("1. Compte");
const st = await call("/status");
if (st.errors) console.log("Erreurs :", st.errors);
const acc = st.response;
console.log("Formule :", acc?.subscription?.plan, "| actif :", acc?.subscription?.active);
console.log("Requêtes aujourd'hui :", acc?.requests?.current, "/", acc?.requests?.limit_day);

// 2. Identifiant du Stade Rennais
line("2. Équipe");
const teams = await call("/teams?search=Rennes");
const rennes = teams.response.find((t) => t.team?.country === "France")?.team;
if (!rennes) {
  console.log("❌ Stade Rennais introuvable.", teams.errors ?? "");
  process.exit(1);
}
console.log(`${rennes.name} → id ${rennes.id}`);

// 3. Matchs de la saison en cours (le test décisif)
line(`3. Matchs saison ${SEASON}`);
const fx = await call(`/fixtures?team=${rennes.id}&season=${SEASON}`);
if (fx.errors) {
  console.log("❌ Accès refusé ou limité :", fx.errors);
} else {
  console.log("Nombre de matchs :", fx.results);
  const byLeague = {};
  for (const f of fx.response) {
    const k = `${f.league.name} (id ${f.league.id})`;
    byLeague[k] = (byLeague[k] ?? 0) + 1;
  }
  console.table(byLeague);
  const sample = fx.response.find((f) => f.fixture.status.short === "FT");
  if (sample) {
    console.log(
      "Exemple de match terminé :",
      sample.teams.home.name, sample.goals.home, "-", sample.goals.away, sample.teams.away.name,
    );
  }
}

// 4. Cotes « buteur » sur le prochain match
line("4. Cotes buteur (prochain match)");
const next = fx.response
  .filter((f) => ["NS", "TBD"].includes(f.fixture.status.short))
  .sort((a, b) => a.fixture.timestamp - b.fixture.timestamp)[0];
if (!next) {
  console.log("Aucun match à venir trouvé (ou accès refusé à l'étape 3).");
} else {
  console.log(`${next.teams.home.name} - ${next.teams.away.name} (${next.fixture.date})`);
  const odds = await call(`/odds?fixture=${next.fixture.id}`);
  if (odds.errors) console.log("❌", odds.errors);
  const bets = new Map();
  for (const r of odds.response) {
    for (const bm of r.bookmakers ?? []) {
      for (const b of bm.bets ?? []) {
        if (/scorer|goalscorer|buteur/i.test(b.name)) {
          bets.set(b.name, (bets.get(b.name) ?? 0) + 1);
        }
      }
    }
  }
  console.log(
    bets.size ? Object.fromEntries(bets) : "Aucun marché « buteur » trouvé pour ce match.",
  );
}

// 5. Effectif
line("5. Effectif");
const sq = await call(`/players/squads?team=${rennes.id}`);
if (sq.errors) console.log("❌", sq.errors);
else console.log("Joueurs dans l'effectif :", sq.response[0]?.players?.length ?? 0);

console.log("\nTerminé.");
