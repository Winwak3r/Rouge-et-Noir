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
  // Galette-saucisse : la galette roulée autour de sa saucisse, un trait de moutarde et de ketchup
  return (
    <svg {...common}>
      <circle cx="24" cy="24" r="23" fill="#FDECE6" stroke="#D96B4A" strokeWidth="1.5" />
      <g transform="rotate(-20 24 26)">
        <rect x="15" y="14" width="18" height="28" rx="7" fill="#B9773A" />
        <rect x="17.5" y="15.5" width="13" height="25" rx="6" fill="#CF8C4A" />
        <rect x="19" y="5" width="10" height="17" rx="5" fill="#8E3B1E" />
        <path d="M21 8l3 2.5-3 2.5 3 2.5-3 2.5" stroke="#F2C200" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M26 8.5l2 2-2 2 2 2" stroke="#E1001A" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <rect x="29" y="31" width="16" height="11" rx="5.5" fill="#E1001A" />
      <text x="37" y="39.3" textAnchor="middle" fontSize="8.5" fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">×2</text>
    </svg>
  );
}
