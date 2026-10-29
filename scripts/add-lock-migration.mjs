// Copie le trigger de verrouillage dans une migration créée avec --create-only.
//   npm run db:lock                 → migration « prediction_lock »
//   npm run db:lock -- aucun_buteur → migration « aucun_buteur »
import { appendFileSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const dir = "prisma/migrations";
const name = process.argv[2] ?? "prediction_lock";
const folder = readdirSync(dir).filter((d) => d.endsWith(`_${name}`)).sort().at(-1);
if (!folder) {
  console.error(`❌ Migration introuvable. Lance d'abord :\n   npx prisma migrate dev --create-only --name ${name}`);
  process.exit(1);
}
const target = join(dir, folder, "migration.sql");
const current = readFileSync(target, "utf8");
if (current.includes("enforce_prediction_lock")) {
  console.log("ℹ️  Le trigger est déjà présent dans", target);
} else {
  appendFileSync(target, "\n" + readFileSync("prisma/sql/prediction_lock_trigger.sql", "utf8"));
  console.log("✅ Trigger ajouté à", target);
  console.log("   Applique-le maintenant avec : npx prisma migrate dev");
}
