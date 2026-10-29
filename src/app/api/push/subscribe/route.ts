import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

/** Enregistre l'appareil du joueur connecté pour les notifications. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint !== "string" || !/^https:\/\//.test(endpoint) || endpoint.length > 2000) {
    return Response.json({ error: "Abonnement invalide." }, { status: 400 });
  }
  await prisma.pushSubscription.upsert({ where: { endpoint }, create: { userId: user.id, endpoint }, update: { userId: user.id } });
  return Response.json({ ok: true });
}
