import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { MAX_AVATAR_BYTES, sniffImageType } from "@/lib/avatar";

const json = (body: object, status = 200) => Response.json(body, { status });

/** Photo d'un joueur déposée par l'admin (réservée aux joueurs connectés). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const row = await prisma.playerImage.findUnique({ where: { playerId: id } });
  if (!row) return new Response(null, { status: 404 });
  return new Response(row.data as unknown as BodyInit, {
    headers: {
      "Content-Type": row.type,
      "Cache-Control": "private, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

export async function PUT(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return json({ error: "Réservé à l’administrateur." }, 403);
  const { id } = await ctx.params;
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
    prisma.playerImage.upsert({ where: { playerId: id }, create: { playerId: id, data: bytes, type }, update: { data: bytes, type } }),
    prisma.player.update({ where: { id }, data: { customPhotoAt: now } }),
    prisma.adminAuditLog.create({ data: { adminId: user.id, action: "SET_PLAYER_PHOTO", entity: "Player", entityId: id } }),
  ]);
  return json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return json({ error: "Réservé à l’administrateur." }, 403);
  const { id } = await ctx.params;
  await prisma.$transaction([
    prisma.playerImage.deleteMany({ where: { playerId: id } }),
    prisma.player.update({ where: { id }, data: { customPhotoAt: null } }),
  ]);
  return json({ ok: true });
}
