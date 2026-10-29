import { CompetitionLogoEditor } from "@/components/CompetitionLogoEditor";
import { prisma } from "@/lib/db";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import { getLeagueLogos } from "@/lib/league-logos";

export default async function LogosPage() {
  const [logos, custom] = await Promise.all([getLeagueLogos(), prisma.competitionLogo.findMany({ select: { code: true } })]);
  const customSet = new Set(custom.map((c) => c.code));
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Logos des compétitions</h1>
        <p className="mt-1 text-sm text-neutral-600">
          Par défaut, les logos viennent d’ESPN et ne sont pas toujours à jour. Dépose ici le logo officiel de la saison (PNG à fond
          transparent idéalement) : il remplace celui d’ESPN partout sur le site (calendrier, accordéons, classements). N’utilise que
          des logos dont l’usage est autorisé.
        </p>
      </div>
      {(Object.keys(COMPETITIONS) as CompetitionCode[]).map((code) => (
        <CompetitionLogoEditor key={code} code={code} label={COMPETITIONS[code].label} current={logos[code] ?? null} custom={customSet.has(code)} />
      ))}
    </div>
  );
}
