"use client";

import { useState } from "react";

/**
 * Téléphone qui montre le site. Dépose une capture d'écran du site (format portrait) dans
 * public/landing/apercu.png : elle remplace automatiquement l'aperçu dessiné.
 */
export function SitePreview() {
  const [hasShot, setHasShot] = useState(true);
  return (
    <div className="relative mx-auto w-[260px] sm:w-[290px]">
      {/* Coque du téléphone */}
      <div className="rounded-[2.6rem] border-[10px] border-[#1d1d1d] bg-[#0f0f0f] shadow-[0_30px_80px_rgba(0,0,0,0.6)] ring-1 ring-white/10">
        <div className="relative aspect-[9/19] overflow-hidden rounded-[1.9rem] bg-[#121212]">
          <div aria-hidden className="absolute left-1/2 top-2 z-10 h-5 w-24 -translate-x-1/2 rounded-full bg-black" />
          {hasShot ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/landing/apercu.png" alt="Aperçu du site Rouge & Noir" className="h-full w-full object-cover object-top" onError={() => setHasShot(false)} />
          ) : (
            <MiniSite />
          )}
        </div>
      </div>
    </div>
  );
}

/** Aperçu dessiné du site (en attendant une vraie capture). */
function MiniSite() {
  return (
    <div className="flex h-full flex-col gap-2.5 px-3 pb-3 pt-10 text-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/brand/logo-sombre.png" alt="" className="mx-auto h-6 w-auto" />
      <div className="rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10">
        <p className="text-[9px] font-bold uppercase tracking-wide text-white/50">Les potes du Roazhon</p>
        <p className="text-sm font-extrabold">
          1er <span className="text-[10px] font-semibold text-white/50">sur 8</span> · <span className="text-green-400">42 pts</span>
        </p>
      </div>
      <p className="text-[9px] font-bold uppercase tracking-wide text-white/60">Prochain match</p>
      <div className="space-y-2 rounded-xl border-l-4 border-[#1d4ed8] bg-white/5 p-2.5 ring-1 ring-white/10">
        <div className="flex gap-1">
          <span className="rounded bg-green-600/30 px-1.5 py-0.5 text-[8px] font-semibold text-green-300">Pronos ouverts</span>
          <span className="rounded bg-[#FBBF24] px-1.5 py-0.5 text-[8px] font-semibold text-[#3b2600]">Buteur à saisir</span>
        </div>
        <p className="text-[10px] font-semibold text-[#93b4ff]">Ligue 1 · 10e journée</p>
        <div className="flex items-center justify-between text-sm font-extrabold">
          <span>SRFC</span>
          <span className="font-display text-xl">2 – 1</span>
          <span>Lille</span>
        </div>
      </div>
      <div className="rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10">
        <p className="mb-1.5 text-[9px] font-bold uppercase tracking-wide text-white/50">Pronostics et points</p>
        {[
          ["Kévin", "6 pts"],
          ["Jérémy", "4 pts"],
          ["Michelle", "2 pts"],
          ["Yann", "1 pt"],
        ].map(([n, p]) => (
          <p key={n} className="flex justify-between border-t border-white/5 py-1 text-[11px]">
            <span>{n}</span>
            <span className="font-bold text-green-400">{p}</span>
          </p>
        ))}
      </div>
    </div>
  );
}
