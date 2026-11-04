import type { MatchCard, MatchEvent, MatchGoal } from "@prisma/client";
import { TeamLabel } from "./TeamLabel";
import { PlayerName } from "./PlayerName";

/** « Résultat officiel » (ou score en direct) avec les buteurs. */
export function MatchResult(props: {
  title: string;
  homeName: string;
  awayName: string;
  score: { home: number; away: number; pens: string | null };
  goals: MatchGoal[];
  cards: MatchCard[];
  /** Cartons jaunes et remplacements */
  events?: MatchEvent[];
  rennesIsHome: boolean;
}) {
  const byTime = <T extends { minute: number | null; extraMinute: number | null }>(a: T, b: T) =>
    (a.minute ?? 0) - (b.minute ?? 0) || (a.extraMinute ?? 0) - (b.extraMinute ?? 0);
  const events = [...(props.events ?? [])].sort(byTime);
  const side = (home: boolean) => events.filter((e) => e.forRennes === (home ? props.rennesIsHome : !props.rennesIsHome));
  const mn = (e: { minute: number | null; extraMinute: number | null }) => `${e.minute ?? "?"}’${e.extraMinute ? `+${e.extraMinute}` : ""}`;
  const YellowCard = () => <span aria-label="carton jaune" className="mr-1 inline-block h-3 w-2 rounded-[1px] bg-[#FBC02D] align-[-1px]" />;
  // Jaunes puis remplacements, chacun dans l'ordre du match
  const extras = (home: boolean) => (
    <>
      {side(home)
        .filter((e) => e.kind === "YELLOW")
        .map((e) => (
          <li key={e.id}>
            <YellowCard />
            <PlayerName name={e.playerName} /> {mn(e)}
          </li>
        ))}
      {side(home)
        .filter((e) => e.kind === "SUB")
        .map((e) => (
          <li key={e.id} title={`${e.playerName} remplace ${e.playerOutName ?? "?"}`}>
            <span aria-label="remplacement">🔁 </span>
            <PlayerName name={e.playerName} className="text-green-700" />
            <span aria-hidden> ↔ </span>
            <span className="sr-only"> remplace </span>
            {e.playerOutName && <PlayerName name={e.playerOutName} className="text-red-700" />} {mn(e)}
          </li>
        ))}
    </>
  );
  const goals = [...props.goals].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0) || (a.extraMinute ?? 0) - (b.extraMinute ?? 0));
  // Un but est affiché du côté de l'équipe qui en profite (csc compris).
  const homeGoals = goals.filter((g) => g.forRennes === props.rennesIsHome);
  const awayGoals = goals.filter((g) => g.forRennes !== props.rennesIsHome);
  // Cartons rouges, du côté de l'équipe du joueur exclu
  const cards = [...props.cards].sort((a, b) => (a.minute ?? 0) - (b.minute ?? 0) || (a.extraMinute ?? 0) - (b.extraMinute ?? 0));
  const homeCards = cards.filter((c) => c.forRennes === props.rennesIsHome);
  const awayCards = cards.filter((c) => c.forRennes !== props.rennesIsHome);
  const cardLine = (c: MatchCard) => (
    <>
      <PlayerName name={c.playerName} /> {c.minute ?? "?"}’{c.extraMinute ? `+${c.extraMinute}` : ""}
      {c.secondYellow ? " (2e jaune)" : ""}
    </>
  );
  const RedCard = () => <span aria-label="carton rouge" className="mr-1 inline-block h-3 w-2 rounded-[1px] bg-[#E53935] align-[-1px]" />;
  const line = (g: MatchGoal) => (
    <>
      <PlayerName name={g.scorerName} /> {g.minute ?? "?"}’{g.extraMinute ? `+${g.extraMinute}` : ""}
      {g.isPenalty ? " (pen.)" : ""}
      {g.isOwnGoal ? " (c.s.c.)" : ""}
    </>
  );

  return (
    <div>
      <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-neutral-500">{props.title}</h3>
      <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3">
        <div className="min-w-0 text-right">
          <p className="truncate font-semibold">
            <TeamLabel name={props.homeName} rennes={props.rennesIsHome} />
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-neutral-600">
            {homeGoals.map((g) => (
              <li key={g.id}>⚽ {line(g)}</li>
            ))}
            {homeCards.map((c) => (
              <li key={c.id}>
                <RedCard />
                {cardLine(c)}
              </li>
            ))}
            {extras(true)}
          </ul>
        </div>
        <div className="text-center">
          <p className="font-display text-3xl font-black tabular-nums">
            {props.score.home} - {props.score.away}
          </p>
          {props.score.pens && <p className="text-xs text-neutral-500">{props.score.pens}</p>}
        </div>
        <div className="min-w-0">
          <p className="truncate font-semibold">
            <TeamLabel name={props.awayName} rennes={!props.rennesIsHome} />
          </p>
          <ul className="mt-1 space-y-0.5 text-xs text-neutral-600">
            {awayGoals.map((g) => (
              <li key={g.id}>⚽ {line(g)}</li>
            ))}
            {awayCards.map((c) => (
              <li key={c.id}>
                <RedCard />
                {cardLine(c)}
              </li>
            ))}
            {extras(false)}
          </ul>
        </div>
      </div>
    </div>
  );
}
