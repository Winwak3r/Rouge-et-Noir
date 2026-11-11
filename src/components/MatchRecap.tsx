"use client";

import { useEffect, useState } from "react";
import type { RecapData } from "@/lib/match-recap";
import { BONUS_INFO } from "@/lib/scoring/bonus";
import { teamAbbr } from "@/lib/team-abbr";
import { BonusIcon } from "./BonusIcon";
import { PlayerPhoto } from "./PlayerPhoto";

/**
 * Animation « fin de match », plein écran, une seule fois par appareil et par compte à chaque publication d'un résultat.
 * Sifflet (sans son), puis : score final · mon prono et ses points · mes spécialités par ligue · total et rang par ligue.
 * Une fois terminée, un clic (ou une touche) la ferme.
 */
export function MatchRecap({ data, userId }: { data: RecapData; userId: string }) {
  const storageKey = `rn-recap:${userId}:${data.key}`;
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0); // 0 sifflet · 1 score · 2 prono · 3 spécialités · 4 classement · 5 terminé
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, String(Date.now())); // vue : ne sera plus rejouée sur cet appareil
    } catch {
      return; // stockage indisponible : on ne risque pas de la rejouer en boucle
    }
    setShow(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const times = reduce ? [0, 200, 400, 600, 800, 1000] : [0, 2600, 3600, 4800, 6200, 7600];
    const ids = times.slice(1).map((t, i) => window.setTimeout(() => setStep(i + 1), t));
    return () => ids.forEach(clearTimeout);
  }, [storageKey]);

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (!show) return null;
  const done = step >= 5;
  const close = () => {
    if (!done) return;
    setClosing(true);
    window.setTimeout(() => setShow(false), 400);
  };
  const cols = (n: number) => (n <= 1 ? "grid-cols-1" : n === 2 ? "grid-cols-2" : "grid-cols-3");
  const block = (visible: boolean) =>
    `rounded-2xl bg-black/45 p-4 text-white ring-1 ring-white/15 backdrop-blur-sm transition-all duration-700 ease-out ${
      visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-6 opacity-0"
    }`;
  const team = (t: RecapData["home"]) => (
    <span className="flex min-w-0 flex-col items-center gap-1">
      {t.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.logo} alt="" className="h-12 w-12 object-contain sm:h-16 sm:w-16" />
      )}
      <span className="font-display text-lg font-bold uppercase tracking-wide sm:text-2xl">{teamAbbr(t.name)}</span>
    </span>
  );
  const my = data.my;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Résultat du match"
      onClick={close}
      onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape" || e.key === " ") && close()}
      tabIndex={-1}
      className={`recap-bg fixed inset-0 z-[95] overflow-y-auto text-white transition-opacity duration-400 ${closing ? "opacity-0" : "opacity-100"} ${
        done ? "cursor-pointer" : ""
      }`}
    >
      {/* 1. Sifflet de fin de match (sans son) */}
      {step < 2 && (
        <div className={`pointer-events-none fixed inset-0 grid place-items-center ${step === 1 ? "recap-whistle-out" : ""}`}>
          <div className="recap-whistle relative">
            <svg viewBox="0 0 120 80" width="180" height="120" aria-hidden>
              <rect x="4" y="22" width="40" height="18" rx="6" fill="#f5f5f5" />
              <circle cx="70" cy="44" r="30" fill="#f5f5f5" />
              <circle cx="70" cy="44" r="12" fill="#111" />
              <rect x="40" y="24" width="20" height="10" fill="#f5f5f5" />
              <circle cx="96" cy="20" r="6" fill="none" stroke="#f5f5f5" strokeWidth="4" />
            </svg>
            {/* « son » : ondes qui partent du sifflet */}
            {[0, 1, 2].map((i) => (
              <span key={i} className="recap-wave absolute left-[-10px] top-[22px] h-6 w-6 rounded-full border-4 border-white/70" style={{ animationDelay: `${i * 0.35}s` }} />
            ))}
          </div>
        </div>
      )}

      <div className="mx-auto flex min-h-full max-w-4xl flex-col justify-center gap-4 px-4 py-10">
        {/* 1. Score final */}
        <section className={block(step >= 1)}>
          <p className="mb-2 text-center text-xs font-bold uppercase tracking-[0.2em] text-white/70">Score final</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
            {team(data.home)}
            <span className="font-club text-6xl font-semibold tabular-nums sm:text-8xl">
              {data.home.goals} – {data.away.goals}
            </span>
            {team(data.away)}
          </div>
        </section>

        {/* 2. Mon prono et ses points (sans les spécialités) */}
        {my && (
          <section className={block(step >= 2)}>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">Mon prono</p>
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-club text-4xl font-semibold tabular-nums">{my.score}</span>
              {my.scorer ? (
                <span className="flex items-center gap-2">
                  <PlayerPhoto name={my.scorer.name} url={my.scorer.photo} size={40} shape="card" />
                  <span className="font-semibold">{my.scorer.name}</span>
                </span>
              ) : my.noScorer ? (
                <span className="font-semibold">Aucun buteur rennais</span>
              ) : null}
              <span className="ml-auto flex flex-wrap items-center gap-2 text-sm">
                <span className="rounded-lg bg-white/10 px-2.5 py-1">
                  Score <strong>+{my.scorePoints}</strong>
                </span>
                <span className="rounded-lg bg-white/10 px-2.5 py-1">
                  Buteur <strong>+{my.scorerPoints}</strong>
                </span>
                <span className="rounded-lg bg-green-600 px-2.5 py-1 font-bold">= {my.total} pts</span>
              </span>
            </div>
          </section>
        )}

        {/* 3. Spécialités jouées, par ligue */}
        {data.bonuses.length > 0 && (
          <section className={block(step >= 3)}>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">Mes spécialités maison</p>
            <div className={`grid gap-3 ${cols(data.bonuses.length)}`}>
              {data.bonuses.map((b) => (
                <div key={b.leagueId} className="flex items-center gap-3 rounded-xl bg-white/10 p-3">
                  <BonusIcon kind={b.kind} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{b.leagueName}</span>
                    <span className="block text-xs text-white/70">{BONUS_INFO[b.kind].name}</span>
                  </span>
                  <span className={`font-club text-2xl font-semibold tabular-nums ${b.points > 0 ? "text-green-400" : "text-white/60"}`}>+{b.points}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. Total et rang dans chaque ligue */}
        {data.leagues.length > 0 && (
          <section className={block(step >= 4)}>
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/70">Classement</p>
            <div className={`grid gap-3 ${cols(data.leagues.length)}`}>
              {data.leagues.map((l) => (
                <div key={l.leagueId} className="rounded-xl bg-white/10 p-3 text-center">
                  <p className="truncate text-sm font-semibold">{l.name}</p>
                  <p className="mt-1 font-display text-2xl font-bold uppercase sm:text-3xl">
                    {l.rank ? (l.rank === 1 ? "1er" : `${l.rank}e`) : "—"} <span className="text-white/50">·</span> {l.points} pts
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}

        <p className={`text-center text-sm text-white/80 transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`}>
          Touche l’écran pour continuer
        </p>
      </div>
    </div>
  );
}
