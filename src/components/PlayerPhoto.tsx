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
        className="absolute right-1 top-0.5 font-display font-bold leading-none text-white"
        style={{
          fontSize: Math.max(11, Math.round(size * 0.17)),
          textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000, 0 0 3px #000",
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
        className={`shrink-0 ${radius} bg-neutral-100 object-cover object-top ring-1 ring-neutral-300 ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center ${radius} font-bold text-white ring-1 ring-neutral-300 ${className}`}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.4)), background: `hsl(${hueOf(name)} 35% 40%)` }}
    >
      {initials(name)}
    </span>
  );
}
