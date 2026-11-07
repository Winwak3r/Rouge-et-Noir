import type { BonusKind } from "@/lib/scoring/bonus";

/** Icônes des « Spécialités Maison » (dessins originaux, en rond). */
export function BonusIcon({ kind, size = 36, className = "" }: { kind: BonusKind; size?: number; className?: string }) {
  const common = { width: size, height: size, viewBox: "0 0 48 48", className: `shrink-0 ${className}`, "aria-hidden": true } as const;
  if (kind === "KOUIGN_AMANN") {
    // Kouign-amann doré, feuilletage en spirale, « ×2 » en beurre fondu
    return (
      <svg {...common}>
        <circle cx="24" cy="24" r="23" fill="#FFF4DC" stroke="#E2B04A" strokeWidth="1.5" />
        <path d="M24 9c8 0 15 6 15 14s-6 15-15 15S9 32 9 24s7-15 15-15z" fill="#D9932A" />
        <path d="M24 13c5 0 10 4 10 9s-4 10-10 10-9-4-9-9 4-10 9-10z" fill="#F0B548" />
        <path d="M24 17c3 0 6 2 6 5s-3 6-6 6-5-2-5-5 2-6 5-6z" fill="#F7CF6E" />
        <path d="M14 19c4-1 7 1 10 0M15 28c5 1 8-1 12 1" stroke="#B9741C" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <rect x="27" y="29" width="17" height="12" rx="6" fill="#FFE27A" stroke="#E2B04A" />
        <text x="35.5" y="38.5" textAnchor="middle" fontSize="9" fontWeight="800" fill="#8A5A00" fontFamily="system-ui, sans-serif">×2</text>
      </svg>
    );
  }
  if (kind === "GALETTES_SAUCISSES") {
    // Deux galettes roulées, chacune avec sa saucisse : ketchup et moutarde
    const galette = (x: number, sauce: string) => (
      <g transform={`translate(${x} 0)`}>
        <rect x="0" y="16" width="14" height="24" rx="6" fill="#B9773A" />
        <rect x="2" y="17" width="10" height="22" rx="5" fill="#CF8C4A" />
        <rect x="3" y="7" width="8" height="14" rx="4" fill="#8E3B1E" />
        <path d="M4 10l2 2-2 2 2 2-2 2" stroke={sauce} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
    );
    return (
      <svg {...common}>
        <circle cx="24" cy="24" r="23" fill="#FDECE6" stroke="#D96B4A" strokeWidth="1.5" />
        {galette(8, "#E1001A")}
        {galette(26, "#F2C200")}
      </svg>
    );
  }
  // Pile de crêpes avec compteur « ×N »
  return (
    <svg {...common}>
      <circle cx="24" cy="24" r="23" fill="#FFF6E5" stroke="#E0A85A" strokeWidth="1.5" />
      <ellipse cx="22" cy="37" rx="15" ry="4" fill="#E9E1D3" />
      {[33, 29, 25, 21].map((y) => (
        <ellipse key={y} cx="22" cy={y} rx="13" ry="3.6" fill="#EDB765" stroke="#C98A35" strokeWidth="0.8" />
      ))}
      <path d="M14 20c2 2 4 1 6 2" stroke="#7A4A12" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <circle cx="36" cy="13" r="8" fill="#E1001A" />
      <text x="36" y="16.2" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">×N</text>
    </svg>
  );
}
