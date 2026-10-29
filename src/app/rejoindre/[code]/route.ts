import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { JOIN_COOKIE, VIEW_COOKIE, WELCOME_COOKIE, normalizeInviteCode } from "@/lib/league-rules";
import { joinLeague } from "@/lib/leagues";

/**
 * Lien d'invitation (ou QR code) : connecté, on rejoint la ligue tout de suite ;
 * sinon le code est gardé 7 jours, le temps de s'inscrire et de confirmer son adresse.
 */
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const code = normalizeInviteCode((await ctx.params).code);
  const league = code ? await prisma.league.findUnique({ where: { inviteCode: code }, select: { name: true } }) : null;
  const url = (path: string) => new URL(path, req.url);
  if (!code || !league) return NextResponse.redirect(url("/ligues?invitation=invalide"));

  const user = await getCurrentUser();
  if (user) {
    const r = await joinLeague(user.id, code);
    if (r.ok) {
      const jar = await cookies();
      jar.set(VIEW_COOKIE, r.leagueId, { httpOnly: true, sameSite: "lax", path: "/" });
      jar.set(WELCOME_COOKIE, r.leagueId, { sameSite: "lax", path: "/", maxAge: 600 });
    }
    return NextResponse.redirect(url(r.ok ? "/" : "/ligues?invitation=suspendu"));
  }
  (await cookies()).set(JOIN_COOKIE, code, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 7 * 24 * 3600, secure: process.env.NODE_ENV === "production" });
  return NextResponse.redirect(url(`/inscription?ligue=${encodeURIComponent(league.name)}`));
}
