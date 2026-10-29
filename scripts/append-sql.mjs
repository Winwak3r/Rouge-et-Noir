// Ajoute un fichier SQL à la fin d'une migration créée avec --create-only.
//   node scripts/append-sql.mjs <nom_de_migration> <fichier.sql>
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [name, file] = process.argv.slice(2);
if (!name || !file) {
  console.error("Usage : node scripts/append-sql.mjs <nom_de_migration> <fichier.sql>");
  process.exit(1);
}
const folder = readdirSync("prisma/migrations").filter((d) => d.endsWith(`_${name}`)).sort().at(-1);
if (!folder) {
  console.error(`❌ Migration introuvable. Lance d'abord : npx prisma migrate dev --create-only --name ${name}`);
  process.exit(1);
}
const target = join("prisma/migrations", folder, "migration.sql");
const sql = readFileSync(file, "utf8");
if (readFileSync(target, "utf8").includes(sql.trim())) console.log("ℹ️  Déjà présent dans", target);
else {
  appendFileSync(target, "\n" + sql);
  console.log("✅ Ajouté à", target);
}
