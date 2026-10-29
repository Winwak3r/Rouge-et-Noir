import { NextResponse } from "next/server";
import { joinPendingLeague } from "@/app/actions/auth";
import { createSession } from "@/lib/auth/session";
import { confirmEmailToken } from "@/lib/auth/verification";

/** Lien reçu par e-mail : l'adresse est confirmée, le joueur est connecté et arrive sur l'accueil. */
export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const confirmed = await confirmEmailToken(token);
  const user = confirmed?.user;
  if (!user || !user.isActive) return NextResponse.redirect(new URL("/connexion?verification=invalide", req.url));
  await createSession(user);
  await joinPendingLeague(user.id);
  return NextResponse.redirect(new URL(confirmed!.kind === "change" ? "/compte?email=ok" : "/?bienvenue=1", req.url));
}
