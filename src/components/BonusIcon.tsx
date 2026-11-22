import type { BonusKind } from "@/lib/scoring/bonus";

const SRC: Record<BonusKind, string> = {
  MENHIRS: "/brand/bonus-menhirs.png",
  CREPE_FLAMBEE: "/brand/bonus-crepe-flambee.png",
  BIGOUDEN: "/brand/bonus-bigouden.png",
};

/** Icônes des « Trésors du Terroir » (illustrations fournies, avec leur fond, coins légèrement arrondis). */
export function BonusIcon({ kind, size = 36, className = "" }: { kind: BonusKind; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={SRC[kind]} alt="" aria-hidden width={size} height={size} className={`shrink-0 object-cover ${className}`} style={{ width: size, height: size, borderRadius: Math.max(3, Math.round(size * 0.18)) }} />
  );
}
