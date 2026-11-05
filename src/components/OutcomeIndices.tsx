import type { ReactNode } from "react";
import { LEVEL_COLORS, outcomeIndices, type OutcomeIndex } from "@/lib/match-odds";
import { TeamLabel } from "./TeamLabel";

/** Probabilité d'une issue, en gros et en couleur (rouge = peu probable → vert = très probable). */
function Chance({ title, idx }: { title: ReactNode; idx: OutcomeIndex }) {
  return (
    <div className="min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-center">
      <p className="flex items-center justify-center gap-1 truncate text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500">{title}</p>
      <p className="mt-0.5 font-display text-3xl font-bold leading-none tabular-nums" style={{ color: LEVEL_COLORS[idx.level] }}>
        {Math.round(idx.probability * 100)}
        <span className="ml-0.5 text-lg">%</span>
      </p>
    </div>
  );
}

const Logo = ({ url }: { url?: string | null }) =>
  // eslint-disable-next-line @next/next/no-img-element
  url ? <img src={url} alt="" className="h-4 w-4 shrink-0 object-contain" /> : null;

/** Ligne « victoire domicile · nul · victoire extérieur » d'après les cotes du match. */
export function OutcomeIndices(props: {
  odds: { home: number | null; draw: number | null; away: number | null };
  home: { name: string; rennes: boolean; logo?: string | null };
  away: { name: string; rennes: boolean; logo?: string | null };
}) {
  const { home, draw, away } = props.odds;
  if (!home || !draw || !away) {
    return <p className="text-xs text-neutral-500">Les chances de victoire apparaîtront avec les cotes du match, environ 48 h avant le coup d’envoi.</p>;
  }
  const i = outcomeIndices({ home, draw, away });
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-3 gap-2">
        <Chance
          title={
            <>
              <Logo url={props.home.logo} /> Victoire <TeamLabel name={props.home.name} rennes={props.home.rennes} />
            </>
          }
          idx={i.home}
        />
        <Chance title="Match nul" idx={i.draw} />
        <Chance
          title={
            <>
              <Logo url={props.away.logo} /> Victoire <TeamLabel name={props.away.name} rennes={props.away.rennes} />
            </>
          }
          idx={i.away}
        />
      </div>
      <p className="text-[11px] text-neutral-500">Probabilités d’après les cotes du match.</p>
    </div>
  );
}
