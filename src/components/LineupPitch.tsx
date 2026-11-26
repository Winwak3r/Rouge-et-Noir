import type { LineupPlayer } from "@/lib/match-sheet";
import { PlayerPhoto } from "./PlayerPhoto";
import { shortPlayerName } from "@/lib/player-name";

const LINE: Record<string, number> = { G: 0, GK: 0, D: 1, DF: 1, M: 2, MF: 2, F: 3, FW: 3 };

/** Composition du Stade Rennais sur un demi-terrain : gardien en bas, attaquants en haut. */
export function LineupPitch({ players }: { players: LineupPlayer[] }) {
  const starters = players.filter((p) => p.starter);
  if (starters.length === 0) return null;
  const rows: LineupPlayer[][] = [[], [], [], []];
  for (const p of starters) rows[LINE[p.position ?? ""] ?? 2].push(p);
  const subs = players.filter((p) => !p.starter);

  return (
    <div className="space-y-2">
      {/* Terrain : toute la largeur sur téléphone, largeur limitée sur ordinateur */}
      <div className="relative mx-auto w-full max-w-lg overflow-hidden rounded-xl bg-[#2f7a3a] px-1 py-4 sm:px-2" style={{ backgroundImage: "repeating-linear-gradient(0deg, rgba(255,255,255,0.05) 0 28px, transparent 28px 56px)" }}>
        {/* Tracés du demi-terrain : ligne médiane et rond central en haut, surface et but en bas */}
        <svg aria-hidden viewBox="0 0 100 140" preserveAspectRatio="none" className="absolute inset-0 h-full w-full" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth="0.6">
          <rect x="2" y="2" width="96" height="136" />
          <path d="M30 2a20 16 0 0 0 40 0" />
          <rect x="22" y="110" width="56" height="28" />
          <rect x="37" y="128" width="26" height="10" />
          <path d="M40 110a10 7 0 0 1 20 0" />
        </svg>
        <div className="relative flex flex-col gap-3 sm:gap-4">
          {[...rows].reverse().map((row, i) =>
            row.length ? (
              <div key={i} className="flex justify-around gap-0.5">
                {/* Jusqu'à 5 joueurs par ligne : chacun prend au plus un cinquième de la largeur */}
                {row.map((p) => (
                  <div key={p.id} className="flex w-[19%] min-w-0 max-w-[4.5rem] flex-col items-center gap-0.5 text-center">
                    <PlayerPhoto name={p.name} url={p.photo} size={40} number={null} className="ring-2 ring-white" />
                    <span className="flex max-w-full items-center gap-1 rounded bg-black/55 px-1 text-[10px] font-semibold leading-tight text-white">
                      {p.number != null && <span className="shrink-0 font-display">{p.number}</span>}
                      <span className="min-w-0 truncate">{shortPlayerName(p.name)}</span>
                    </span>
                  </div>
                ))}
              </div>
            ) : null,
          )}
        </div>
      </div>
      {subs.length > 0 && (
        <p className="mx-auto max-w-lg text-xs text-neutral-600">
          <strong>Remplaçants :</strong> {subs.map((p) => shortPlayerName(p.name)).join(", ")}
        </p>
      )}
    </div>
  );
}
