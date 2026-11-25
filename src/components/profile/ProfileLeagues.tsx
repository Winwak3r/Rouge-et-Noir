"use client";

import { useState } from "react";
import type { RankPoint } from "@/lib/rank-history";
import { LeagueAvatar } from "@/components/LeagueAvatar";
import { RankSparkline } from "@/components/RankSparkline";

export interface ProfileLeagueRow {
  key: string;
  name: string;
  general: boolean;
  imageAt: number | null;
  rank: number | null;
  of: number;
  points: number;
  history: RankPoint[];
}

const ordinal = (n: number) => (n === 1 ? "1er" : `${n}e`);

/** Ligues du joueur (image, nom, position « 3e sur 17 j. ») et, à côté, l'évolution dans la ligue choisie. */
export function ProfileLeagues({ rows }: { rows: ProfileLeagueRow[] }) {
  const [sel, setSel] = useState(rows[0]?.key);
  const current = rows.find((r) => r.key === sel) ?? rows[0];
  if (!current) return null;
  return (
    <section aria-label="Classements" className="card grid gap-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
      <ul className="space-y-2">
        {rows.map((r) => {
          const on = r.key === current.key;
          return (
            <li key={r.key}>
              <button
                type="button"
                onClick={() => setSel(r.key)}
                aria-pressed={on}
                className={`grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-xl border-2 p-2 text-left transition-colors ${
                  on ? "border-rouge" : "border-transparent hover:border-neutral-300"
                }`}
              >
                {r.general ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src="/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-lg object-cover ring-1 ring-neutral-300" />
                ) : (
                  <LeagueAvatar leagueId={r.key} name={r.name} at={r.imageAt} size={48} />
                )}
                <span className="min-w-0">
                  <span className="block truncate font-display text-lg font-bold leading-tight">{r.name}</span>
                  <span className="block text-xs font-semibold text-green-700">{r.points} pts</span>
                </span>
                <span className="whitespace-nowrap text-right">
                  {r.rank ? (
                    <>
                      <span className="font-display text-2xl font-bold">{ordinal(r.rank)}</span>
                      <span className="ml-1.5 text-sm text-neutral-500">sur {r.of} j.</span>
                    </>
                  ) : (
                    <span className="text-sm text-neutral-500">— sur {r.of} j.</span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="text-neutral-800 md:border-l md:border-neutral-200 md:pl-5">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.06em] text-neutral-500">
          Position · 5 derniers matchs
        </p>
        <RankSparkline points={current.history} />
      </div>
    </section>
  );
}
