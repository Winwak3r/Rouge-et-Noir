import { runSmartSync } from "@/lib/sync/sync";
import { shouldSync } from "@/lib/sync/wake-gate";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Appelée par Vercel Cron (une fois par jour) et par cron-job.org (chaque minute).
// Protégée par l'en-tête « Authorization: Bearer <CRON_SECRET> ».
// Avant de toucher à la base, le « portier » vérifie qu'il y a quelque chose à faire (match proche…) :
// en dehors des matchs, la base Neon peut ainsi rester en veille (et ne consomme pas de quota).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  const force = new URL(req.url).searchParams.get("force") === "1";
  if (!force) {
    const gate = await shouldSync();
    if (!gate.run) return Response.json({ skipped: `base en veille (mode ${gate.mode})`, steps: [], errors: [] });
  }
  const report = await runSmartSync({ reason: force ? "manuel" : "auto", force });
  return Response.json(report);
}
