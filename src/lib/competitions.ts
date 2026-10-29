export type CompetitionCode = "LIGUE_1" | "EUROPA_LEAGUE" | "COUPE_DE_FRANCE";

export const COMPETITIONS: Record<
  CompetitionCode,
  { label: string; textClass: string; borderClass: string; bgClass: string }
> = {
  LIGUE_1: { label: "Ligue 1", textClass: "text-l1-txt", borderClass: "border-l1", bgClass: "bg-l1" },
  EUROPA_LEAGUE: { label: "Europa League", textClass: "text-uel-txt", borderClass: "border-uel", bgClass: "bg-uel" },
  COUPE_DE_FRANCE: { label: "Coupe de France", textClass: "text-cdf-txt", borderClass: "border-cdf", bgClass: "bg-cdf" },
};
