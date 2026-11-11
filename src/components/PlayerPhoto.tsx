"use client";

import { useEffect, useState } from "react";
import { hueOf, initials } from "@/lib/avatar";

/** Photo du joueur dans une bulle ronde ; initiales si la photo est absente ou introuvable. */
export function PlayerPhoto(props: Parameters<typeof PhotoOnly>[0]) {
  if (props.number == null) return <PhotoOnly {...props} />;
  const size = props.size ?? 24;
  return (
    <span className={`relative inline-block shrink-0 ${props.className ?? ""}`} style={{ width: size, height: size }}>
      <PhotoOnly {...props} className="" />
      <span
        aria-label={`numéro ${props.number}`}
        className="absolute right-1 top-0.5 font-display font-bold leading-none tracking-tight text-[#1a1a1a]"
        style={{
          // Chiffres condensés, gras et foncés, comme sur les photos officielles (léger halo clair pour rester lisible)
          fontSize: Math.max(12, Math.round(size * 0.22)),
          textShadow: "0 0 3px rgba(255, 255, 255, 0.85)",
        }}
      >
        {props.number}
      </span>
    </span>
  );
}

function PhotoOnly({
  name,
  url,
  size = 24,
  className = "",
  shape = "round",
}: {
  name: string;
  url: string | null;
  size?: number;
  className?: string;
  /** « round » : bulle ; « card » : grande photo aux coins arrondis */
  shape?: "round" | "card";
  /** Numéro de maillot, affiché en haut à droite (blanc, liseré noir) */
  number?: number | null;
}) {
  const radius = shape === "card" ? "rounded-xl" : "rounded-full";
  // Arrondi aussi en style direct : certains navigateurs (Chrome) ignoraient la classe sur ces images
  const borderRadius = shape === "card" ? Math.max(6, Math.round(size * 0.18)) : 9999;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [url]);
  if (url && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt=""
        aria-hidden
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`shrink-0 ${radius} overflow-hidden bg-neutral-100 object-cover object-top ring-1 ring-neutral-300 ${className}`}
        style={{ width: size, height: size, borderRadius }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center ${radius} font-bold text-white ring-1 ring-neutral-300 ${className}`}
      style={{ width: size, height: size, borderRadius, fontSize: Math.max(9, Math.round(size * 0.4)), background: `hsl(${hueOf(name)} 35% 40%)` }}
    >
      {initials(name)}
    </span>
  );
}
