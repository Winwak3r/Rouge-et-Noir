import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";

const SHORT: Record<CompetitionCode, string> = { LIGUE_1: "L1", EUROPA_LEAGUE: "UEL", COUPE_DE_FRANCE: "CdF" };

/** Logo de la compétition (sur fond blanc, lisible partout), ou pastille de couleur s'il n'est pas disponible. */
export function CompetitionBadge(props: { code: CompetitionCode; logo?: string | null; className?: string; size?: "sm" | "md" }) {
  const box = props.size === "md" ? "h-7 w-7" : "h-6 w-6";
  if (props.logo) {
    return (
      <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded bg-white p-0.5 ${box} ${props.className ?? ""}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={props.logo} alt="" className="h-full w-full object-contain" loading="lazy" />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-flex shrink-0 items-center justify-center rounded px-1 text-[10px] font-bold text-white ${box} ${COMPETITIONS[props.code].bgClass} ${props.className ?? ""}`}
    >
      {SHORT[props.code]}
    </span>
  );
}
