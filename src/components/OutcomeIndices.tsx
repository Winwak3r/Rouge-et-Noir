import type { ReactNode } from "react";
import { LEVEL_COLORS, LEVEL_LABELS, outcomeIndices, type OutcomeIndex } from "@/lib/match-odds";
import { TeamLabel } from "./TeamLabel";

/** Indice de 1 à 5 : pastille colorée (rouge → vert), jauge et probabilité. */
function Index({ title, idx }: { title: ReactNode; idx: OutcomeIndex }) {
  const color = LEVEL_COLORS[idx.level];
  return (
    <div className="min-w-0 rounded-lg border border-neutral-200 bg-neutral-50 p-2 text-center">
      <p className="truncate text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500">{title}</p>
      <div className="mt-1 flex items-center justify-center gap-2">
        <span
          className="grid h-8 w-8 place-items-center rounded-full font-display text-lg font-bold text-white"
          style={{ backgroundColor: color }}
          title={LEVEL_LABELS[idx.level]}
        >
          {idx.level}
        </span>
        <span className="text-left">
          <span className="flex gap-0.5" aria-hidden>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} className="h-2 w-2.5 rounded-sm" style={{ backgroundColor: n <= idx.level ? color : "var(--color-neutral-200)" }} />
            ))}
          </span>
          <span className="mt-0.5 block text-[11px] font-semibold text-neutral-600">{Math.round(idx.probability * 100)} %</span>
        </span>
      </div>
      <p className="sr-only">
        Indice {idx.level} sur 5 ({LEVEL_LABELS[idx.level]}), probabilité {Math.round(idx.probability * 100)} %
      </p>
    </div>
  );
}

/** Ligne « victoire domicile · nul · victoire extérieur » d'après les cotes du match. */
export function OutcomeIndices(props: {
  odds: { home: number | null; draw: number | null; away: number | null };
  home: { name: string; rennes: boolean };
  away: { name: string; rennes: boolean };
}) {
  const { home, draw, away } = props.odds;
  if (!home || !draw || !away) {
    return <p className="text-xs text-neutral-500">Les indices de victoire apparaîtront avec les cotes du match, environ 48 h avant le coup d’envoi.</p>;
  }
  const i = outcomeIndices({ home, draw, away });
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-3 gap-2">
        <Index title={<>Victoire <TeamLabel name={props.home.name} rennes={props.home.rennes} /></>} idx={i.home} />
        <Index title="Match nul" idx={i.draw} />
        <Index title={<>Victoire <TeamLabel name={props.away.name} rennes={props.away.rennes} /></>} idx={i.away} />
      </div>
      <p className="text-[11px] text-neutral-500">Indice de 1 (très faible) à 5 (très probable), d’après les cotes du match.</p>
    </div>
  );
}
