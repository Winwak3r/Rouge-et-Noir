// Génère les clés VAPID des notifications push. À lancer UNE fois :
//   node scripts/generate-vapid.mjs
// puis copier les deux lignes affichées dans .env (et dans les variables d'environnement de Vercel).
import { generateKeyPairSync } from "node:crypto";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "P-256" });
const jwk = privateKey.export({ format: "jwk" });
const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, "base64url"), Buffer.from(jwk.y, "base64url")]);
console.log(`VAPID_PUBLIC_KEY="${pub.toString("base64url")}"`);
console.log(`VAPID_PRIVATE_KEY="${jwk.d}"`);
console.log('VAPID_SUBJECT="mailto:ton-adresse@exemple.fr"');
console.log("\nGarde la clé privée secrète. Ne la change plus ensuite : les abonnements existants deviendraient invalides.");
