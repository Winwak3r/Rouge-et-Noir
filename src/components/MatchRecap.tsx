"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { RecapData } from "@/lib/match-recap";
import { teamAbbr } from "@/lib/team-abbr";
import { BonusIcon } from "./BonusIcon";
import { LeagueAvatar } from "./LeagueAvatar";
import { PlayerPhoto } from "./PlayerPhoto";

/**
 * Élément qui « se range » : il apparaît en grand au centre de l'écran, puis glisse jusqu'à sa place (réservée
 * d'avance dans la mise en page : rien ne bouge autour). « big » = agrandissement au centre.
 */
function Settle({ show, children, className = "", big = 1.6, hold = 0.45 }: { show: boolean; children: ReactNode; className?: string; big?: number; hold?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vars, setVars] = useState<Record<string, string> | null>(null);
  useLayoutEffect(() => {
    if (!show || !ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setVars({
      "--dx": `${window.innerWidth / 2 - (r.left + r.width / 2)}px`,
      "--dy": `${window.innerHeight / 2 - (r.top + r.height / 2)}px`,
      "--big": String(big),
      "--hold": `${Math.round(hold * 100)}%`,
    });
  }, [show, big, hold]);
  return (
    <div ref={ref} className={`${className} ${show && vars ? "recap-settle" : "invisible"}`} style={(vars ?? {}) as CSSProperties}>
      {children}
    </div>
  );
}

/** Simple apparition (fondu + léger glissement), à sa place. */
const pop = (show: boolean) => (show ? "recap-pop" : "invisible");

/**
 * Animation « fin de match », sur toute la page (au-dessus des menus), sans défilement, une seule fois par appareil
 * et par compte à chaque publication d'un résultat. Sans son.
 */
export function MatchRecap({ data, userId }: { data: RecapData; userId: string }) {
  const storageKey = `rn-recap:${userId}:${data.key}`;
  const [show, setShow] = useState(false);
  const [t, setT] = useState(0); // horloge de l'animation (ms écoulées, par paliers)
  const [closing, setClosing] = useState(false);
  const nL = data.leagues.length;

  // Chronologie (ms)
  const T_SCORE = 2400;
  const T_PRONO = T_SCORE + 1800;
  const T_PTS_SCORE = T_PRONO + 1600;
  const T_PTS_SCORER = T_PTS_SCORE + 1400;
  const T_LEAGUES = T_PTS_SCORER + 1400;
  const T_BONUS = T_LEAGUES + Math.max(1, nL) * 350 + 400;
  const T_RANK = T_BONUS + 1000;
  const T_DONE = T_RANK + 900;

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, String(Date.now())); // vue : ne sera plus rejouée sur cet appareil
    } catch {
      return;
    }
    setShow(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const marks = [T_SCORE, T_PRONO, T_PTS_SCORE, T_PTS_SCORER, ...data.leagues.map((_, i) => T_LEAGUES + i * 350), T_BONUS, T_RANK, T_DONE];
    const ids = marks.map((m) => window.setTimeout(() => setT(m), reduce ? 50 : m));
    return () => ids.forEach(clearTimeout);
  }, [storageKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!show) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [show]);

  if (!show) return null;
  const done = t >= T_DONE;
  const close = () => {
    if (!done) return;
    setClosing(true);
    window.setTimeout(() => setShow(false), 450);
  };
  const my = data.my;
  const cols = nL <= 1 ? "grid-cols-1" : nL === 2 ? "grid-cols-2" : "grid-cols-3";
  const pts = (n: number) => (n > 0 ? `+${n}` : String(n));
  const ptsColor = (n: number) => (n > 0 ? "text-green-400" : n < 0 ? "text-red-400" : "text-white/70");
  const bonusOf = (leagueId: string) => data.bonuses.find((b) => b.leagueId === leagueId);
  const team = (s: RecapData["home"], side: "home" | "away") => (
    <div className={`flex min-w-0 flex-col items-center gap-[0.6vh]`}>
      {s.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.logo} alt="" className="h-[7vh] w-[7vh] object-contain" />
      )}
      <span className="font-display text-[3vh] font-bold uppercase leading-none tracking-wide">{teamAbbr(s.name)}</span>
      <span className="max-w-full space-y-0 text-center text-[1.5vh] leading-tight text-white/75">
        {data.scorers[side].map((g, i) => (
          <span key={i} className="block truncate">
            ⚽ {g}
          </span>
        ))}
      </span>
    </div>
  );

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Résultat du match"
      onClick={close}
      onKeyDown={(e) => (e.key === "Enter" || e.key === "Escape" || e.key === " ") && close()}
      tabIndex={-1}
      className={`recap-bg fixed inset-0 z-[200] overflow-hidden text-white transition-opacity duration-500 ${closing ? "opacity-0" : "opacity-100"} ${
        done ? "cursor-pointer" : ""
      }`}
    >
      {/* Sifflet de fin de match (sans son) */}
      {t < T_PRONO && (
        <div className={`pointer-events-none fixed inset-0 z-10 grid place-items-center ${t >= T_SCORE ? "recap-whistle-out" : ""}`}>
          <div className="recap-whistle relative">
            <svg viewBox="0 0 120 80" width="180" height="120" aria-hidden>
              <rect x="4" y="22" width="40" height="18" rx="6" fill="#f5f5f5" />
              <circle cx="70" cy="44" r="30" fill="#f5f5f5" />
              <circle cx="70" cy="44" r="12" fill="#111" />
              <rect x="40" y="24" width="20" height="10" fill="#f5f5f5" />
              <circle cx="96" cy="20" r="6" fill="none" stroke="#f5f5f5" strokeWidth="4" />
            </svg>
            {[0, 1, 2].map((i) => (
              <span key={i} className="recap-wave absolute left-[-10px] top-[22px] h-6 w-6 rounded-full border-4 border-white/70" style={{ animationDelay: `${i * 0.35}s` }} />
            ))}
          </div>
        </div>
      )}

      {/* Écran unique, sans défilement : chaque élément a sa place réservée */}
      <div className="mx-auto flex h-[100dvh] max-w-3xl flex-col justify-between gap-[1.2vh] px-4 py-[2.5vh]">
        {/* 1. Score final (avec les buteurs), rangé tout en haut */}
        <Settle show={t >= T_SCORE} className="rounded-2xl bg-black/45 px-4 py-[1.6vh] ring-1 ring-white/15">
          <p className="mb-[0.8vh] text-center text-[1.4vh] font-bold uppercase tracking-[0.25em] text-white/70">Score final</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-3">
            {team(data.home, "home")}
            <span className="self-center font-club text-[8vh] font-semibold leading-none tabular-nums">
              {data.home.goals} – {data.away.goals}
            </span>
            {team(data.away, "away")}
          </div>
        </Settle>

        {/* 2. Ton prono, rangé sous le score final */}
        {my && (
          <Settle show={t >= T_PRONO} big={1.4} className="rounded-2xl bg-black/35 px-4 py-[1.2vh] ring-1 ring-white/10">
            <p className="mb-[0.6vh] text-center text-[1.4vh] font-bold uppercase tracking-[0.25em] text-white/70">Ton prono</p>
            <div className="flex items-center justify-center gap-4">
              <span className="font-club text-[5vh] font-semibold leading-none tabular-nums">{my.score}</span>
              {my.scorer ? (
                <span className="flex min-w-0 items-center gap-2">
                  <PlayerPhoto name={my.scorer.name} url={my.scorer.photo} size={44} shape="card" />
                  <span className="truncate text-[2vh] font-semibold">{my.scorer.name}</span>
                </span>
              ) : my.noScorer ? (
                <span className="text-[2vh] font-semibold">Aucun buteur rennais</span>
              ) : null}
            </div>
          </Settle>
        )}

        {/* 3. Points du score, puis du buteur : en grand au centre, puis rangés en petit */}
        {my && (
          <div className="flex items-center justify-center gap-6">
            <Settle show={t >= T_PTS_SCORE} big={4} hold={0.5} className="text-center">
              <span className={`block font-club text-[4.5vh] font-semibold leading-none tabular-nums ${ptsColor(my.scorePoints)}`}>{pts(my.scorePoints)}</span>
              <span className="text-[1.4vh] uppercase tracking-widest text-white/70">Score</span>
            </Settle>
            <Settle show={t >= T_PTS_SCORER} big={4} hold={0.5} className="text-center">
              <span className={`block font-club text-[4.5vh] font-semibold leading-none tabular-nums ${ptsColor(my.scorerPoints)}`}>{pts(my.scorerPoints)}</span>
              <span className="text-[1.4vh] uppercase tracking-widest text-white/70">Buteur</span>
            </Settle>
          </div>
        )}

        {/* 4. Mes ligues, une par une ; 5. spécialités et points du match par ligue ; 6. classement */}
        {nL > 0 && (
          <div className={`grid gap-3 ${cols}`}>
            {data.leagues.map((l, i) => {
              const b = bonusOf(l.leagueId);
              const matchPts = (my?.total ?? 0) + (b?.points ?? 0);
              return (
                <div key={l.leagueId} className={`flex min-w-0 flex-col items-center gap-[0.8vh] ${pop(t >= T_LEAGUES + i * 350)}`}>
                  <div className="relative">
                    <LeagueAvatar leagueId={l.leagueId} name={l.name} at={l.imageAt} size={64} radius={12} className="!h-[8vh] !w-[8vh] ring-2 ring-white/30" />
                    {b && (
                      <span className={`absolute -bottom-2 -right-3 ${pop(t >= T_BONUS)}`}>
                        <BonusIcon kind={b.kind} size={34} />
                      </span>
                    )}
                  </div>
                  <span className="w-full truncate text-center text-[1.7vh] font-semibold">{l.name}</span>
                  <span className={`font-club text-[3vh] font-semibold leading-none tabular-nums ${ptsColor(matchPts)} ${pop(t >= T_BONUS)}`}>
                    {pts(matchPts)} pts
                  </span>
                  <span className={`w-full rounded-xl bg-white/10 px-2 py-[0.8vh] text-center font-display text-[2.6vh] font-bold uppercase leading-none ${pop(t >= T_RANK)}`}>
                    {l.rank ? (l.rank === 1 ? "1er" : `${l.rank}e`) : "—"} <span className="text-white/50">·</span> {l.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p className={`text-center text-[1.8vh] text-white/80 transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`}>Touche l’écran pour continuer</p>
      </div>
    </div>
  );
  // Rendue directement dans <body> : au-dessus de l'en-tête, des menus et du pied de page
  return createPortal(content, document.body);
}
