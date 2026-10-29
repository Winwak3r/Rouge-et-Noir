import { messageForEndpoint } from "@/lib/push/send";

/**
 * Texte d'une notification, demandé par le service worker après un « réveil ».
 * Pas de connexion requise : l'adresse de l'abonnement, secrète et propre à l'appareil, tient lieu de preuve.
 */
export async function POST(req: Request) {
  const { endpoint } = await req.json().catch(() => ({}));
  if (typeof endpoint !== "string" || endpoint.length > 2000) return Response.json({ error: "Requête invalide." }, { status: 400 });
  return Response.json(await messageForEndpoint(endpoint), { headers: { "Cache-Control": "no-store" } });
}
