"use client";

import { useEffect, useState } from "react";
import { hueOf, initials } from "@/lib/avatar";

/** Photo du joueur dans une bulle ronde ; initiales si la photo est absente ou introuvable. */
export function PlayerPhoto({
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
