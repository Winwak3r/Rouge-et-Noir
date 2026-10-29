"use client";

import { useEffect, useState } from "react";
import { avatarUrl, hueOf, initials } from "@/lib/avatar";

/** Bulle ronde : la photo du joueur, sinon ses initiales sur une couleur propre à son pseudo. Décorative (le pseudo est écrit à côté). */
export function Avatar(props: { userId: string; pseudo: string; at: number | null; size?: number; className?: string }) {
  const size = props.size ?? 24;
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [props.at, props.userId]);
  if (props.at && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={avatarUrl(props.userId, props.at)}
        alt=""
        aria-hidden
        width={size}
        height={size}
        loading="lazy"
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full object-cover ring-1 ring-neutral-300 ${props.className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-full font-bold leading-none text-white ring-1 ring-neutral-300 ${props.className ?? ""}`}
      style={{ width: size, height: size, fontSize: Math.max(9, Math.round(size * 0.42)), background: `hsl(${hueOf(props.pseudo)} 45% 38%)` }}
    >
      {initials(props.pseudo)}
    </span>
  );
}
