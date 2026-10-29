import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

/** Retire l'appareil du joueur connecté. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint !== "string") return Response.json({ error: "Abonnement invalide." }, { status: 400 });
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
  return Response.json({ ok: true });
}
