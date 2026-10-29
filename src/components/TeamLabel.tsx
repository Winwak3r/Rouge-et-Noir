import { mobileTeamName } from "@/lib/team-names";

/** Nom d'équipe : nom court sur mobile (SRFC, PSG, OM…), nom complet ailleurs. */
export function TeamLabel({ name, rennes = false, className = "" }: { name: string; rennes?: boolean; className?: string }) {
  const short = mobileTeamName(name, rennes);
  if (!short || short === name) return <span className={className}>{name}</span>;
  return (
    <span className={className} title={name}>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{name}</span>
    </span>
  );
}
