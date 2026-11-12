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
    // agrandissement limité pour que tout l'élément reste visible (largeur et hauteur de l'écran)
    const fit = Math.min(big, (window.innerWidth * 0.94) / r.width, (window.innerHeight * 0.8) / r.height);
    setVars({
      "--dx": `${window.innerWidth / 2 - (r.left + r.width / 2)}px`,
      "--dy": `${window.innerHeight / 2 - (r.top + r.height / 2)}px`,
      "--big": String(Math.max(1, fit)),
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
  const ptsColor = (n: number) => (n > 0 ? "text-green-400" : n < 0 ? "text-red-400" : "text-white/70");
  const pillBase = "inline-block rounded-full px-3 py-[0.4vh] font-club text-[2.6vh] font-semibold leading-none tabular-nums shadow-lg ring-2 ring-black/30";
  // Score : −1 noir · 0 rouge · 1 jaune · 2 vert clair · 4 vert (+ « Bien joué ! »)
  const scoreColor = (n: number) =>
    n < 0 ? "bg-neutral-950 text-white" : n === 0 ? "bg-red-600 text-white" : n === 1 ? "bg-yellow-400 text-black" : n === 2 ? "bg-lime-400 text-black" : "bg-green-600 text-white";
  // Buteur : aucun prono noir · 0 rouge · 1 et plus vert
  const scorerColor = (n: number, none: boolean) => (none ? "bg-neutral-950 text-white" : n <= 0 ? "bg-red-600 text-white" : "bg-green-600 text-white");
  const signed = (n: number, start: boolean) => (
    <>
      {n > 0 ? "+" : ""}
      <CountUp from={0} to={n} start={start} ms={700} />
    </>
  );
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
  // « Vendredi 8 novembre · 17h30 » (ordinateur) ; « 08/11 · 17h30 » (mobile) — heure de Paris
  const ko = new Date(data.kickoff);
  const tz = { timeZone: "Europe/Paris" } as const;
  const hour = ko.toLocaleTimeString("fr-FR", { ...tz, hour: "2-digit", minute: "2-digit" }).replace(":", "h");
  const day = ko.toLocaleDateString("fr-FR", { ...tz, weekday: "long", day: "numeric", month: "long" });
  const dateLong = `${day.charAt(0).toUpperCase()}${day.slice(1)} · ${hour}`;
  const dateShort = `${ko.toLocaleDateString("fr-FR", { ...tz, day: "2-digit", month: "2-digit" })} · ${hour}`;

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
      {/* Sifflet de fin de match (sans son) : sifflet chromé en relief qui vibre, ondes sonores, « FIN DU MATCH ! » */}
      {t < T_PRONO && (
        <div className={`pointer-events-none fixed inset-0 z-10 flex flex-col items-center justify-center gap-[3vh] ${t >= T_SCORE ? "recap-whistle-out" : ""}`}>
          <div className="recap-whistle3d relative" style={{ perspective: "900px" }}>
            <div className="recap-whistle-body">
              <svg viewBox="0 0 340 230" className="h-[24vh] w-auto drop-shadow-[0_22px_28px_rgba(0,0,0,0.6)]" aria-hidden>
                <defs>
                  <linearGradient id="wTube" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#f7f8fa" />
                    <stop offset="0.12" stopColor="#ffffff" />
                    <stop offset="0.3" stopColor="#b9bfc6" />
                    <stop offset="0.52" stopColor="#6c737b" />
                    <stop offset="0.7" stopColor="#d4d8dd" />
                    <stop offset="0.88" stopColor="#555c63" />
                    <stop offset="1" stopColor="#26292d" />
                  </linearGradient>
                  <radialGradient id="wBall" cx="0.36" cy="0.3" r="0.78">
                    <stop offset="0" stopColor="#ffffff" />
                    <stop offset="0.18" stopColor="#eef0f2" />
                    <stop offset="0.45" stopColor="#a5abb2" />
                    <stop offset="0.72" stopColor="#5b6168" />
                    <stop offset="0.9" stopColor="#2e3236" />
                    <stop offset="1" stopColor="#1a1c1f" />
                  </radialGradient>
                  <linearGradient id="wSide" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#3a3f44" />
                    <stop offset="0.5" stopColor="#9aa1a8" />
                    <stop offset="1" stopColor="#30353a" />
                  </linearGradient>
                  <linearGradient id="wGrip" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#2a2d31" />
                    <stop offset="0.5" stopColor="#111214" />
                    <stop offset="1" stopColor="#2a2d31" />
                  </linearGradient>
                  <linearGradient id="wSlot" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#050506" />
                    <stop offset="1" stopColor="#2b2f33" />
                  </linearGradient>
                  <radialGradient id="wGround" cx="0.5" cy="0.5" r="0.5">
                    <stop offset="0" stopColor="rgba(0,0,0,0.5)" />
                    <stop offset="1" stopColor="rgba(0,0,0,0)" />
                  </radialGradient>
                  <linearGradient id="wCord" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0" stopColor="#ff3347" />
                    <stop offset="1" stopColor="#8a000f" />
                  </linearGradient>
                </defs>
                <ellipse cx="180" cy="216" rx="128" ry="11" fill="url(#wGround)" />
                {/* épaisseur de la chambre (cylindre vu de trois quarts) */}
                <ellipse cx="214" cy="132" rx="80" ry="80" fill="url(#wSide)" />
                {/* embout avec bague de prise noire */}
                <path d="M30 84 Q16 84 16 98 L16 116 Q16 130 30 130 L160 130 L160 84 Z" fill="url(#wTube)" />
                <path d="M16 98 Q16 84 30 84 L62 84 L62 130 L30 130 Q16 130 16 116 Z" fill="url(#wGrip)" />
                {[24, 34, 44, 54].map((x) => (
                  <line key={x} x1={x} y1="88" x2={x} y2="126" stroke="#3b3f44" strokeWidth="2" />
                ))}
                <rect x="66" y="89" width="92" height="5" rx="2.5" fill="#ffffff" opacity="0.7" />
                <rect x="66" y="120" width="92" height="3" rx="1.5" fill="#000000" opacity="0.25" />
                {/* jonction embout / chambre */}
                <path d="M150 84 L170 80 L170 134 L150 130 Z" fill="url(#wTube)" />
                {/* chambre ronde (face) */}
                <circle cx="204" cy="134" r="78" fill="url(#wBall)" />
                <circle cx="204" cy="134" r="78" fill="none" stroke="#14171a" strokeOpacity="0.6" strokeWidth="2" />
                <circle cx="204" cy="134" r="70" fill="none" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="3" />
                {/* lumière (fente d'air) avec sa profondeur */}
                <path d="M118 80 L172 80 L166 95 L124 95 Z" fill="url(#wSlot)" />
                <path d="M124 95 L166 95 L164 99 L126 99 Z" fill="#9aa1a8" opacity="0.6" />
                {/* reflets */}
                <ellipse cx="176" cy="98" rx="38" ry="15" fill="#ffffff" opacity="0.6" transform="rotate(-28 176 98)" />
                <ellipse cx="248" cy="182" rx="22" ry="7" fill="#ffffff" opacity="0.18" transform="rotate(-35 248 182)" />
                {/* anneau du cordon et cordon tressé */}
                <path d="M246 70 L262 54 L272 64 L256 80 Z" fill="url(#wTube)" />
                <circle cx="272" cy="46" r="16" fill="none" stroke="url(#wTube)" strokeWidth="8" />
                <path d="M286 52 Q326 86 318 152 Q314 186 296 208" fill="none" stroke="url(#wCord)" strokeWidth="7" strokeLinecap="round" />
                <path d="M286 52 Q326 86 318 152 Q314 186 296 208" fill="none" stroke="#ffffff" strokeOpacity="0.25" strokeWidth="2" strokeDasharray="3 5" />
              </svg>
            </div>
            {/* ondes sonores qui partent de la lumière */}
            {[0, 1, 2, 3].map((i) => (
              <span key={i} className="recap-sound absolute left-[38%] top-[8%] h-[6vh] w-[6vh] rounded-full border-[0.5vh] border-white/80 border-b-transparent border-l-transparent" style={{ animationDelay: `${i * 0.28}s` }} />
            ))}
          </div>
          <p className="recap-final font-display text-[7vh] font-bold uppercase leading-none tracking-wide text-white sm:text-[9vh]">Fin du match !</p>
        </div>
      )}

      {/* Écran unique, sans défilement : chaque élément a sa place réservée */}
      <div className="mx-auto flex h-[100dvh] max-w-3xl flex-col gap-[1.4vh] px-4 py-[2vh]">
        {/* 1. Score final (avec les buteurs), rangé tout en haut */}
        <Settle show={t >= T_SCORE} className="rounded-2xl bg-black/45 px-3 py-[1.3vh] ring-1 ring-white/15">
          <p className="mb-[0.6vh] text-center text-[1.3vh] font-bold uppercase tracking-[0.25em] text-white/70">Score final</p>
          <div className="grid grid-cols-[1fr_auto_1fr] items-start gap-2">
            {team(data.home, "home")}
            <div className="flex flex-col items-center gap-[0.5vh] self-start pt-[0.5vh] text-center">
              <span className="font-display text-[2vh] font-bold uppercase leading-none tracking-wide text-white/90">{data.competition}</span>
              <span className="text-[1.35vh] leading-none text-white/70">
                <span className="sm:hidden">{dateShort}</span>
                <span className="hidden sm:inline">{dateLong}</span>
              </span>
              <span className="mt-[0.4vh] font-club text-[5.5vh] font-semibold leading-none tabular-nums sm:text-[8vh]">
                {data.home.goals} – {data.away.goals}
              </span>
            </div>
            {team(data.away, "away")}
          </div>
        </Settle>

        {/* 2. Ton prono (juste sous le score final), avec ses points à cheval sur le bas de la tuile */}
        {my && (
          <Settle show={t >= T_PRONO} big={1.4} className="relative mb-[2vh] rounded-2xl bg-black/35 px-4 pb-[2.4vh] pt-[1vh] ring-1 ring-white/10">
            <p className="mb-[0.6vh] text-center text-[1.3vh] font-bold uppercase tracking-[0.25em] text-white/70">Mon prono</p>
            <div className="grid grid-cols-2 items-center gap-3">
              <div className="relative flex flex-col items-center gap-[0.4vh]">
                <span className="text-[1.3vh] font-semibold uppercase tracking-widest text-white/60">Score</span>
                <span className="font-club text-[4.5vh] font-semibold leading-none tabular-nums">{my.score}</span>
              </div>
              <div className="relative flex min-w-0 flex-col items-center gap-[0.4vh]">
                <span className="text-[1.3vh] font-semibold uppercase tracking-widest text-white/60">Buteur</span>
                <span className="flex min-w-0 items-center justify-center gap-2">
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
                </span>
              </div>
            </div>
            {/* Points du score et du buteur : en grand au centre, puis rangés sous chacun, à cheval sur la tuile */}
            <div className="absolute inset-x-4 -bottom-[1.6vh] grid grid-cols-2 gap-3">
              <div className="flex justify-center">
                <Settle show={t >= T_PTS_SCORE} big={4} className="relative">
                  <span className={`${pillBase} ${scoreColor(my.scorePoints)}`}>{signed(my.scorePoints, t >= T_PTS_SCORE)}</span>
                  {my.scorePoints >= 4 && (
                    <span className="absolute left-full top-1/2 ml-2 -translate-y-1/2 whitespace-nowrap rounded-md bg-green-600 px-1.5 py-0.5 text-[1.4vh] font-bold uppercase text-white shadow">
                      Bien joué !
                    </span>
                  )}
                </Settle>
              </div>
              <div className="flex justify-center">
                <Settle show={t >= T_PTS_SCORER} big={4}>
                  <span className={`${pillBase} ${scorerColor(my.scorerPoints, !my.scorer && !my.noScorer)}`}>
                    {!my.scorer && !my.noScorer ? "Aucun prono" : signed(my.scorerPoints, t >= T_PTS_SCORER)}
                  </span>
                </Settle>
              </div>
            </div>
          </Settle>
        )}

        {/* 3. Mon total de points (score + buteur), sans tuile, avec incrémentation */}
        {my && (
          <p className={`mb-[3.5vh] mt-[1.5vh] text-center font-display text-[3.6vh] font-bold uppercase leading-none tracking-wide sm:text-[4.5vh] ${pop(t >= T_TOTAL)}`}>
            Mon total :{" "}
            <span className={`font-club text-[5.5vh] tabular-nums sm:text-[7vh] ${ptsColor(base)}`}>
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
                        className={`absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-amber-400 px-1.5 py-0.5 text-[1.5vh] font-bold uppercase text-black shadow sm:left-full sm:top-auto sm:ml-2 sm:mt-0 sm:translate-x-0 ${
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
