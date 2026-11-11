import type { BonusKind } from "@/lib/scoring/bonus";

const SRC: Record<BonusKind, string> = {
  KOUIGN_AMANN: "/brand/bonus-kouign-amann.png",
  GALETTE_SAUCISSE: "/brand/bonus-galette-saucisse.png",
};

/** Icônes des « Spécialités Maison » (illustrations fournies, fond transparent). */
export function BonusIcon({ kind, size = 36, className = "" }: { kind: BonusKind; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={SRC[kind]} alt="" aria-hidden width={size} height={size} className={`shrink-0 object-contain ${className}`} style={{ width: size, height: size }} />
  );
}
