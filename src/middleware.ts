import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, readSession } from "@/lib/auth/token";

// Premier filtre rapide. Chaque page protégée revérifie en base (requireUser / requireAdmin).
export async function middleware(req: NextRequest) {
  const session = await readSession(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  if (!session) {
    const url = new URL("/connexion", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname.startsWith("/admin") && session.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", req.url));
  }
  return NextResponse.next();
}

// Tout le site, sauf : l'accueil (présentation aux visiteurs), connexion / inscription et leurs suites,
// les invitations, les pages d'information, l'API et les fichiers.
export const config = {
  matcher: [
    "/((?!_next/|api/|.*\\..*|connexion|inscription|mot-de-passe-oublie|reinitialiser|verifier-email|rejoindre|mentions-legales|donnees-partenaires|contact|$).*)",
  ],
};
