import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { sniffImageType } from "@/lib/avatar";

const CODES = ["LIGUE_1", "EUROPA_LEAGUE", "COUPE_DE_FRANCE"];
const MAX_BYTES = 300_000;
const json = (body: object, status = 200) => Response.json(body, { status });

/** Logo d'une compétition déposé par l'admin (public : il s'affiche aussi aux visiteurs). */
export async function GET(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const row = CODES.includes(code) ? await prisma.competitionLogo.findUnique({ where: { code } }) : null;
  if (!row) return new Response(null, { status: 404 });
  return new Response(row.data as unknown as BodyInit, {
    headers: {
      "Content-Type": row.type,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; sandbox",
    },
  });
}

/** Dépôt (administrateur du site) : PNG, JPEG ou WebP, 300 Ko au plus. */
export async function PUT(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return json({ error: "Réservé à l’administrateur." }, 403);
  const { code } = await ctx.params;
  if (!CODES.includes(code)) return json({ error: "Compétition inconnue." }, 400);
  let file: FormDataEntryValue | null = null;
  try {
    file = (await req.formData()).get("file");
  } catch {
    // corps invalide
  }
  if (!(file instanceof File)) return json({ error: "Aucun fichier reçu." }, 400);
  if (file.size > MAX_BYTES) return json({ error: "Image trop lourde (300 Ko maximum)." }, 413);
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return json({ error: "Format non accepté : PNG (idéal, fond transparent), JPEG ou WebP." }, 415);
  await prisma.competitionLogo.upsert({ where: { code }, create: { code, data: bytes, type }, update: { data: bytes, type } });
  await prisma.adminAuditLog.create({ data: { adminId: user.id, action: "SET_COMPETITION_LOGO", entity: "CompetitionLogo", entityId: code } });
  return json({ ok: true });
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (user?.role !== "ADMIN") return json({ error: "Réservé à l’administrateur." }, 403);
  const { code } = await ctx.params;
  await prisma.competitionLogo.deleteMany({ where: { code } });
  await prisma.adminAuditLog.create({ data: { adminId: user.id, action: "CLEAR_COMPETITION_LOGO", entity: "CompetitionLogo", entityId: code } });
  return json({ ok: true });
}
