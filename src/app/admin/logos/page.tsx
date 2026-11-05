import { CompetitionLogoEditor } from "@/components/CompetitionLogoEditor";
import { ActionForm } from "@/components/ActionForm";
import { ClubColorsForm } from "@/components/ClubColorsForm";
import { setClubLogosModeAction } from "@/app/actions/admin";
import { clubColors } from "@/lib/club-logo";
import { clubLogosMode } from "@/lib/club-logo-mode";
import { prisma } from "@/lib/db";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import { getLeagueLogos } from "@/lib/league-logos";

export default async function LogosPage() {
  const [logos, custom] = await Promise.all([getLeagueLogos(), prisma.competitionLogo.findMany({ select: { code: true } })]);
  const customSet = new Set(custom.map((c) => c.code));
  const [mode, teams] = await Promise.all([clubLogosMode(), prisma.team.findMany({ orderBy: { name: "asc" } })]);
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

      <section className="space-y-3 pt-4">
        <h2 className="font-display text-2xl font-bold uppercase tracking-wide">Écussons des clubs</h2>
        <p className="text-sm text-neutral-600">
          Choisis d’afficher les écussons officiels des clubs ou des <strong>logos factices</strong> : un rond partagé verticalement aux
          deux couleurs dominantes du club. Le changement s’applique partout (calendrier, avant-match, classements officiels).
        </p>
        <div className="card">
          <ActionForm
            action={setClubLogosModeAction}
            className="flex flex-wrap items-center gap-2"
            submits={[
              { label: "Logos officiels", value: "official", primary: mode === "official" },
              { label: "Logos factices", value: "generic", primary: mode === "generic" },
            ]}
          >
            <span className="text-sm">
              Actuellement : <strong>{mode === "generic" ? "logos factices" : "logos officiels"}</strong>
            </span>
          </ActionForm>
        </div>
        <div className="card divide-y divide-neutral-100">
          <p className="pb-2 text-xs text-neutral-500">
            Couleurs des logos factices (fournies par ESPN ou connues pour les clubs français, modifiables ici). {teams.length} club(s).
          </p>
          {teams.map((t) => (
            <ClubColorsForm key={t.id} teamId={t.id} name={t.name} official={t.logoUrl} colors={clubColors(t)} />
          ))}
        </div>
      </section>
    </div>
  );
}
