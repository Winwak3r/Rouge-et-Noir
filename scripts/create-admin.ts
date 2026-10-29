// Crée le premier compte administrateur, ou promeut un compte existant.
// PowerShell :
//   npm run admin:create -- --email toi@exemple.fr --pseudo TonPseudo
// Un mot de passe provisoire est affiché : change-le ensuite dans « Mon compte ».
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
const email = arg("email")?.trim().toLowerCase();
const pseudo = arg("pseudo")?.trim();
if (!email) {
  console.error("Usage : npm run admin:create -- --email toi@exemple.fr --pseudo TonPseudo");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    await prisma.user.update({ where: { email }, data: { role: "ADMIN", isActive: true } });
    console.log(`✅ ${existing.pseudo} (${email}) est maintenant administrateur. Mot de passe inchangé.`);
  } else {
    if (!pseudo) {
      console.error("Compte inexistant : ajoute --pseudo TonPseudo pour le créer.");
      process.exit(1);
    }
    const password = randomBytes(12).toString("base64url");
    await prisma.user.create({
      data: { email, pseudo, role: "ADMIN", passwordHash: await bcrypt.hash(password, 12), emailVerifiedAt: new Date() },
    });
    console.log(`✅ Administrateur créé : ${pseudo} (${email})`);
    console.log(`   Mot de passe provisoire : ${password}`);
    console.log("   Change-le dès ta première connexion, dans « Mon compte ».");
  }
} finally {
  await prisma.$disconnect();
}
}

main().catch((e) => {
  console.error("❌", e instanceof Error ? e.message : e);
  process.exit(1);
});
