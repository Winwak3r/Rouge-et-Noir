import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { sendTest } from "@/lib/push/send";

/** « Envoyer un test » vers l'appareil du joueur connecté. */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ error: "Connexion requise." }, { status: 401 });
  const { endpoint } = await req.json().catch(() => ({}));
  const sub = typeof endpoint === "string" ? await prisma.pushSubscription.findFirst({ where: { endpoint, userId: user.id } }) : null;
  if (!sub) return Response.json({ error: "Cet appareil n’est pas abonné." }, { status: 404 });
  const r = await sendTest(sub.id, sub.endpoint);
  if (r.skipped) return Response.json({ error: "Notifications non configurées sur le serveur (clés VAPID manquantes)." }, { status: 503 });
  if (r.removed) return Response.json({ error: "Abonnement expiré : réactive les notifications." }, { status: 410 });
  return r.sent ? Response.json({ ok: true }) : Response.json({ error: "Le service de notification a refusé l’envoi." }, { status: 502 });
}
