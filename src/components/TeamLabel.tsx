import { desktopTeamName, mobileTeamName } from "@/lib/team-names";

/** Nom d'équipe : nom court sur mobile (SRFC, PSG, OM…), nom complet ailleurs. */
export function TeamLabel({ name, rennes = false, className = "" }: { name: string; rennes?: boolean; className?: string }) {
  const short = mobileTeamName(name, rennes) ?? name;
  const full = desktopTeamName(name, rennes);
  if (short === full) return <span className={className}>{full}</span>;
  return (
    <span className={className} title={full}>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{full}</span>
    </span>
  );
}
