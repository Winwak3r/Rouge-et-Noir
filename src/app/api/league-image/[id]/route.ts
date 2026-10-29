import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

/** Image d'une ligue, réservée aux joueurs connectés (mise en cache longue : l'adresse contient sa date). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  if (!(await getCurrentUser())) return new Response(null, { status: 401 });
  const { id } = await ctx.params;
  const row = await prisma.leagueImage.findUnique({ where: { leagueId: id } });
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
