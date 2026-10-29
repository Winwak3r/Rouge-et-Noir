import { runSmartSync } from "@/lib/sync/sync";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Appelée par Vercel Cron (une fois par jour) et par cron-job.org (chaque minute).
// Protégée par l'en-tête « Authorization: Bearer <CRON_SECRET> ».
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  const report = await runSmartSync({ reason: "auto" });
  return Response.json(report);
}
