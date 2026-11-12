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

/** Nombre qui s'incrémente (3 › 4 › 5 …) dès que « start » devient vrai. */
function CountUp({ from, to, start, ms = 900 }: { from: number; to: number; start: boolean; ms?: number }) {
  const [v, setV] = useState(from);
  useEffect(() => {
    if (!start) {
      setV(from);
      return;
    }
    const steps = Math.abs(to - from);
    if (steps === 0) return setV(to);
    const dir = to > from ? 1 : -1;
    let i = 0;
    const id = window.setInterval(() => {
      i++;
      setV(from + dir * i);
      if (i >= steps) clearInterval(id);
    }, Math.max(60, ms / steps));
    return () => clearInterval(id);
  }, [start, from, to, ms]);
  return <>{v}</>;
}

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
  const my = data.my;

  // ─── Chronologie (ms) ───
  const T_SCORE = 2400; // score final (après le sifflet)
  const T_PRONO = T_SCORE + 1700; // ton prono
  const T_PTS_SCORE = T_PRONO + 1600; // points du score
  const T_PTS_SCORER = T_PTS_SCORE + 1400; // points du buteur
  const T_TOTAL = T_PTS_SCORER + 1500; // mon total (incrémentation)
  const T_LEAGUES = T_TOTAL + 1300; // ligues une par une, avec ce total sous chacune
  const LEAGUE_STEP = 450;
  const bonusLeagues = data.leagues.filter((l) => data.bonuses.some((b) => b.leagueId === l.leagueId));
  const T_BONUS0 = T_LEAGUES + Math.max(1, nL) * LEAGUE_STEP + 300;
  const BONUS_STEP = 2400; // par spécialité : icône (0) › « ×2 » (+500, 1 s) › nouveau total (+1500)
  const bonusStart = (leagueId: string) => {
    const i = bonusLeagues.findIndex((l) => l.leagueId === leagueId);
    return i < 0 ? null : T_BONUS0 + i * BONUS_STEP;
  };
  const T_RANK = T_BONUS0 + bonusLeagues.length * BONUS_STEP + (bonusLeagues.length ? 200 : 0);
  const T_DONE = T_RANK + 1000;

  useEffect(() => {
    try {
      if (localStorage.getItem(storageKey)) return;
      localStorage.setItem(storageKey, String(Date.now())); // vue : ne sera plus rejouée sur cet appareil
    } catch {
      return;
    }
    setShow(true);
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const marks = new Set<number>([T_SCORE, T_PRONO, T_PTS_SCORE, T_PTS_SCORER, T_TOTAL, T_RANK, T_DONE]);
    data.leagues.forEach((_, i) => marks.add(T_LEAGUES + i * LEAGUE_STEP));
    bonusLeagues.forEach((_, i) => {
      const s0 = T_BONUS0 + i * BONUS_STEP;
      [s0, s0 + 500, s0 + 1500].forEach((m) => marks.add(m));
    });
    const last = Math.max(...marks);
    const ids = [...marks].map((m) => window.setTimeout(() => setT((c) => Math.max(c, m)), reduce ? Math.round((m / last) * 1500) : m));
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
  const cols = nL <= 1 ? "grid-cols-1" : nL === 2 ? "grid-cols-2" : "grid-cols-3";
  const pts = (n: number) => (n > 0 ? `+${n}` : String(n));
  const ptsColor = (n: number) => (n > 0 ? "text-green-400" : n < 0 ? "text-red-400" : "text-white/70");
  const pill = (n: number) =>
    `rounded-full px-3 py-[0.4vh] font-club text-[2.6vh] font-semibold leading-none tabular-nums shadow-lg ring-2 ring-black/30 ${
      n > 0 ? "bg-green-600 text-white" : n < 0 ? "bg-red-600 text-white" : "bg-neutral-600 text-white"
    }`;
  const team = (s: RecapData["home"], side: "home" | "away") => (
    <div className="flex min-w-0 flex-col items-center gap-[0.5vh]">
      {s.logo && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={s.logo} alt="" className="h-[5vh] w-[5vh] object-contain sm:h-[7vh] sm:w-[7vh]" />
      )}
      <span className="font-display text-[2.4vh] font-bold uppercase leading-none tracking-wide sm:text-[3vh]">{teamAbbr(s.name)}</span>
      {/* buteurs du match : en entier, quitte à passer à la ligne */}
      <span className="max-w-full text-center text-[1.35vh] leading-tight text-white/80 sm:text-[1.5vh]">
        {data.scorers[side].map((g, i) => (
          <span key={i} className="block break-words">
            ⚽ {g}
          </span>
        ))}
      </span>
    </div>
  );
  const base = my?.total ?? 0;

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
      <div className="mx-auto flex h-[100dvh] max-w-3xl flex-col gap-[1.4vh] px-4 py-[2vh]">
        {/* 1. Score final (avec les buteurs), rangé tout en haut */}
        <Settle show={t >= T_SCORE} className="rounded-2xl bg-black/45 px-3 py-[1.3vh] ring-1 ring-white/15">
          <p className="mb-[0.6vh] text-center text-[1.3vh] font-bold uppercase tracking-[0.25em] text-white/70">Score final</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            {team(data.home, "home")}
            <span className="self-center font-club text-[5.5vh] font-semibold leading-none tabular-nums sm:text-[8vh]">
              {data.home.goals} – {data.away.goals}
            </span>
            {team(data.away, "away")}
          </div>
        </Settle>

        {/* 2. Ton prono (juste sous le score final), avec ses points à cheval sur le bas de la tuile */}
        {my && (
          <Settle show={t >= T_PRONO} big={1.4} className="relative mb-[2vh] rounded-2xl bg-black/35 px-4 pb-[2.4vh] pt-[1vh] ring-1 ring-white/10">
            <p className="mb-[0.6vh] text-center text-[1.3vh] font-bold uppercase tracking-[0.25em] text-white/70">Ton prono</p>
            <div className="grid grid-cols-2 items-center gap-3">
              <div className="relative flex justify-center">
                <span className="font-club text-[4.5vh] font-semibold leading-none tabular-nums">{my.score}</span>
              </div>
              <div className="relative flex min-w-0 items-center justify-center gap-2">
                {my.scorer ? (
                  <>
                    <PlayerPhoto name={my.scorer.name} url={my.scorer.photo} size={40} shape="card" />
                    <span className="truncate text-[1.9vh] font-semibold">{my.scorer.name}</span>
                  </>
                ) : my.noScorer ? (
                  <span className="text-[1.9vh] font-semibold">Aucun buteur rennais</span>
                ) : (
                  <span className="text-[1.9vh] italic text-white/70">Pas de buteur</span>
                )}
              </div>
            </div>
            {/* Points du score et du buteur : en grand au centre, puis rangés sous chacun, à cheval sur la tuile */}
            <div className="absolute inset-x-4 -bottom-[1.6vh] grid grid-cols-2 gap-3">
              <div className="flex justify-center">
                <Settle show={t >= T_PTS_SCORE} big={4}>
                  <span className={pill(my.scorePoints)}>{pts(my.scorePoints)}</span>
                </Settle>
              </div>
              <div className="flex justify-center">
                <Settle show={t >= T_PTS_SCORER} big={4}>
                  <span className={pill(my.scorerPoints)}>{pts(my.scorerPoints)}</span>
                </Settle>
              </div>
            </div>
          </Settle>
        )}

        {/* 3. Mon total de points (score + buteur), sans tuile, avec incrémentation */}
        {my && (
          <p className={`text-center text-[2.2vh] font-semibold ${pop(t >= T_TOTAL)}`}>
            Mon total : <span className={`font-club text-[3.6vh] tabular-nums ${ptsColor(base)}`}>
              <CountUp from={0} to={base} start={t >= T_TOTAL} />
            </span>{" "}
            point{Math.abs(base) > 1 ? "s" : ""}
          </p>
        )}

        {/* 4. Ligues une par une (avec ce total) ; 5. spécialités et nouveaux totaux ; 6. classement */}
        {nL > 0 && (
          <div className={`grid gap-3 ${cols}`}>
            {data.leagues.map((l, i) => {
              const b = data.bonuses.find((x) => x.leagueId === l.leagueId);
              const s0 = bonusStart(l.leagueId);
              const iconOn = s0 !== null && t >= s0;
              const flashOn = s0 !== null && t >= s0 + 500 && t < s0 + 1500;
              const newOn = s0 !== null && t >= s0 + 1500;
              const after = base + (b?.points ?? 0);
              return (
                <div key={l.leagueId} className={`flex min-w-0 flex-col items-center gap-[0.7vh] ${pop(t >= T_LEAGUES + i * LEAGUE_STEP)}`}>
                  <div className="relative">
                    <LeagueAvatar leagueId={l.leagueId} name={l.name} at={l.imageAt} size={64} radius={12} className="!h-[7.5vh] !w-[7.5vh] ring-2 ring-white/30" />
                    {b && (
                      <span className={`absolute -bottom-2 -right-3 ${iconOn ? "recap-stamp" : "invisible"}`}>
                        <BonusIcon kind={b.kind} size={34} />
                      </span>
                    )}
                  </div>
                  <span className="w-full truncate text-center text-[1.6vh] font-semibold">{l.name}</span>
                  <span className="relative flex items-center gap-2">
                    <span className={`font-club text-[3vh] font-semibold leading-none tabular-nums ${ptsColor(newOn ? after : base)}`}>
                      <CountUp from={base} to={after} start={newOn} ms={800} /> pts
                    </span>
                    {b && (
                      <span
                        className={`absolute left-full ml-2 whitespace-nowrap rounded-md bg-amber-400 px-1.5 py-0.5 text-[1.5vh] font-bold uppercase text-black shadow ${
                          flashOn ? "recap-flash" : "invisible"
                        }`}
                      >
                        {b.kind === "KOUIGN_AMANN" ? "Total ×2" : "Buteur ×2"}
                      </span>
                    )}
                  </span>
                  <span className={`w-full rounded-xl bg-white/10 px-2 py-[0.7vh] text-center font-display text-[2.4vh] font-bold uppercase leading-none ${pop(t >= T_RANK)}`}>
                    {l.rank ? (l.rank === 1 ? "1er" : `${l.rank}e`) : "—"} <span className="text-white/50">·</span> {l.points} pts
                  </span>
                </div>
              );
            })}
          </div>
        )}

        <p className={`mt-auto text-center text-[1.8vh] text-white/80 transition-opacity duration-500 ${done ? "opacity-100" : "opacity-0"}`}>
          Touche l’écran pour continuer
        </p>
      </div>
    </div>
  );
  // Rendue directement dans <body> : au-dessus de l'en-tête, des menus et du pied de page
  return createPortal(content, document.body);
}
