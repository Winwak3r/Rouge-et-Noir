import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_AVATAR_BYTES, sniffImageType } from "@/lib/avatar";
import { isLeagueAdmin } from "@/lib/leagues";

const json = (body: object, status = 200) => Response.json(body, { status });

/** Image de la ligue (même traitement que la photo de profil), réservée aux admins de la ligue. */
export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await ctx.params;
  if (!user || !(await isLeagueAdmin(user.id, id))) return json({ error: "Réservé aux administrateurs de la ligue." }, 403);
  let file: FormDataEntryValue | null = null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    // corps invalide
  }
  if (!(file instanceof File)) return json({ error: "Aucun fichier reçu." }, 400);
  if (file.size > MAX_AVATAR_BYTES) return json({ error: "Image trop lourde." }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return json({ error: "Format non accepté : JPEG, PNG ou WebP." }, 415);
  const now = new Date();
  await prisma.$transaction([
    prisma.leagueImage.upsert({ where: { leagueId: id }, create: { leagueId: id, data: bytes, type }, update: { data: bytes, type } }),
    prisma.league.update({ where: { id }, data: { imageUpdatedAt: now } }),
  ]);
  return json({ ok: true, at: now.getTime() });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const { id } = await ctx.params;
  if (!user || !(await isLeagueAdmin(user.id, id))) return json({ error: "Réservé aux administrateurs de la ligue." }, 403);
  await prisma.$transaction([
    prisma.leagueImage.deleteMany({ where: { leagueId: id } }),
    prisma.league.update({ where: { id }, data: { imageUpdatedAt: null } }),
  ]);
  return json({ ok: true });
}
