import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_AVATAR_BYTES, sniffImageType } from "@/lib/avatar";

const json = (body: object, status = 200) => Response.json(body, { status });

/** Enregistre la photo du joueur connecté (déjà réduite par le navigateur). Contrôles : taille et vrai format. */
export async function PUT(req: Request) {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Connexion requise." }, 401);
  let file: FormDataEntryValue | null = null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    // corps invalide
  }
  if (!(file instanceof File)) return json({ error: "Aucun fichier reçu." }, 400);
  if (file.size > MAX_AVATAR_BYTES) return json({ error: "Image trop lourde (150 Ko maximum après réduction)." }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return json({ error: "Format non accepté : utilise une photo JPEG, PNG ou WebP." }, 415);
  const now = new Date();
  await prisma.$transaction([
    prisma.userAvatar.upsert({ where: { userId: user.id }, create: { userId: user.id, data: bytes, type }, update: { data: bytes, type } }),
    prisma.user.update({ where: { id: user.id }, data: { avatarUpdatedAt: now } }),
  ]);
  return json({ ok: true, at: now.getTime() });
}

/** Supprime la photo du joueur connecté. */
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return json({ error: "Connexion requise." }, 401);
  await prisma.$transaction([
    prisma.userAvatar.deleteMany({ where: { userId: user.id } }),
    prisma.user.update({ where: { id: user.id }, data: { avatarUpdatedAt: null } }),
  ]);
  return json({ ok: true });
}
