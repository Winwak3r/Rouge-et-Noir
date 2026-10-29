import type { RankPoint } from "@/lib/rank-history";

/** Graphique épuré de la position sur les derniers matchs (1er en haut). */
export function RankSparkline({ points }: { points: RankPoint[] }) {
  if (points.length < 2) {
    return <p className="text-xs text-neutral-500">L’évolution s’affichera après 2 matchs notés.</p>;
  }
  const W = 180;
  const H = 64;
  const padX = 12;
  const top = 14;
  const bottom = 16;
  const of = Math.max(...points.map((p) => p.of), 2);
  const x = (i: number) => padX + (i * (W - 2 * padX)) / (points.length - 1);
  const y = (rank: number) => top + ((rank - 1) * (H - top - bottom)) / (of - 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.rank).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} role="img" aria-label={`Position sur les ${points.length} derniers matchs : ${points.map((p) => p.rank).join(", ")}`} className="max-w-full">
      <line x1={padX} x2={W - padX} y1={y(1)} y2={y(1)} stroke="currentColor" strokeOpacity="0.12" strokeDasharray="2 3" />
      <path d={path} fill="none" stroke="#e1001a" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((p, i) => (
        <g key={p.matchId}>
          <title>{`${p.label} : ${p.rank}${p.rank === 1 ? "er" : "e"} sur ${p.of}`}</title>
          <circle cx={x(i)} cy={y(p.rank)} r={p === last ? 4 : 2.8} fill={p === last ? "#e1001a" : "var(--color-surface)"} stroke="#e1001a" strokeWidth="1.6" />
          <text x={x(i)} y={y(p.rank) - 6} textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">
            {p.rank}
          </text>
          <text x={x(i)} y={H - 3} textAnchor="middle" fontSize="8" fill="currentColor" fillOpacity="0.55">
            {p.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
