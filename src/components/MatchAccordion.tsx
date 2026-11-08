"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { BonusIcon } from "./BonusIcon";
import { LeagueAvatar } from "./LeagueAvatar";
import { PlayerPhoto } from "./PlayerPhoto";
import { BONUS_INFO, type BonusKind } from "@/lib/scoring/bonus";
import type { CompetitionCode } from "@/lib/competitions";
import type { Tone } from "@/lib/match-view";
import { useAccordionGroup } from "./AccordionGroup";
import { CompetitionBadge } from "./CompetitionBadge";
import { TeamLabel } from "./TeamLabel";

const BORDER: Record<CompetitionCode, string> = {
  LIGUE_1: "border-l-l1",
  EUROPA_LEAGUE: "border-l-uel",
  COUPE_DE_FRANCE: "border-l-cdf",
};
const TEXT: Record<CompetitionCode, string> = { LIGUE_1: "text-l1-txt", EUROPA_LEAGUE: "text-uel-txt", COUPE_DE_FRANCE: "text-cdf-txt" };
// Match ouvert : l'en-tête et le cadre prennent la couleur de la compétition.
const OPEN: Record<CompetitionCode, { bg: string; border: string; text: string }> = {
  LIGUE_1: { bg: "bg-l1", border: "border-y-l1 border-r-l1", text: "text-l1" },
  EUROPA_LEAGUE: { bg: "bg-[#EA7600]", border: "border-y-[#EA7600] border-r-[#EA7600]", text: "text-[#c2410c]" },
  COUPE_DE_FRANCE: { bg: "bg-cdf", border: "border-y-cdf border-r-cdf", text: "text-cdf" },
};

export interface MatchHeader {
  id: string;
  code: string; // « J9 », « 32e »…
  competition: CompetitionCode;
  competitionLabel: string; // « Ligue 1 · J9 », « Europa League · Phase de ligue »
  competitionLogo: string | null;
  dateLabel: string;
  home: { name: string; logo: string | null; rennes: boolean };
  away: { name: string; logo: string | null; rennes: boolean };
  score: { home: number; away: number; pens: string | null } | null;
  statusLabel: string;
  statusShort?: string; // libellé court sur mobile (« Pronos ouverts »)
  statusTone: Tone;
  live: string | null; // « En direct · 67’ »
  isNext: boolean;
  cancelled: boolean;
  playersCount: number;
  /** complete : tout validé · score : score validé, aucun buteur à choisir · scorer : buteurs disponibles, à choisir · incomplete : rien */
  mine: "complete" | "score" | "scorer" | "incomplete" | null;
  /** Mon pronostic, rappelé dans l'en-tête : score, buteur (photo) et spécialités jouées (avec la ligue) */
  myPick?: {
    score: string;
    scorer: { name: string; short: string; photo: string | null; number: number | null } | null;
    noScorer: boolean;
    bonuses: Array<{ kind: BonusKind; leagueId: string; leagueName: string; leagueImageAt: number | null }>;
  } | null;
}

/** Spécialités jouées : l'icône du bonus, avec la photo de la ligue en médaillon. */
function PickBonuses({ list, size }: { list: NonNullable<MatchHeader["myPick"]>["bonuses"]; size: number }) {
  return (
    <span className="flex items-center gap-1">
      {list.map((b) => (
        <span key={b.leagueId} className="relative" title={`${BONUS_INFO[b.kind].name} · ${b.leagueName}`}>
          <BonusIcon kind={b.kind} size={size} />
          <LeagueAvatar
            leagueId={b.leagueId}
            name={b.leagueName}
            at={b.leagueImageAt}
            size={Math.round(size * 0.5)}
            className="absolute -bottom-1 -right-1 rounded-md ring-2 ring-[var(--color-surface)]"
          />
        </span>
      ))}
    </span>
  );
}

/** Rappel de mon pronostic. Ordinateur : bloc compact à côté du match ; mobile : ligne sous la date. */
function MyPick({ p, open, variant }: { p: NonNullable<MatchHeader["myPick"]>; open: boolean; variant: "pc" | "mobile" }) {
  const muted = open ? "text-white/80" : "text-neutral-500";
  if (variant === "pc") {
    return (
      <span className="flex shrink-0 items-center gap-3">
        {p.scorer ? (
          <PlayerPhoto name={p.scorer.name} url={p.scorer.photo} size={40} shape="card" number={p.scorer.number} />
        ) : null}
        <span className="min-w-0">
          <span className={`block text-[10px] font-bold uppercase tracking-wide ${muted}`}>Mon prono</span>
          <span className="block font-club text-xl font-semibold leading-none tabular-nums">{p.score}</span>
          <span className={`block max-w-[9rem] truncate text-xs ${muted}`}>{p.scorer ? p.scorer.name : p.noScorer ? "Aucun buteur rennais" : "Sans buteur"}</span>
        </span>
        {p.bonuses.length > 0 && <PickBonuses list={p.bonuses} size={30} />}
      </span>
    );
  }
  // Mobile : « Mon prono : 2 - 2 · (photo) M. Nagida · bonus »
  return (
    <span className={`mt-1.5 flex min-w-0 items-center gap-1.5 text-xs ${muted}`}>
      <span className={`shrink-0 font-bold ${open ? "text-white" : "text-noir"}`}>Mon prono :</span>
      <strong className={`shrink-0 font-club text-sm font-semibold tabular-nums ${open ? "text-white" : "text-noir"}`}>{p.score}</strong>
      {(p.scorer || p.noScorer) && <span aria-hidden>·</span>}
      {p.scorer && <PlayerPhoto name={p.scorer.name} url={p.scorer.photo} size={22} />}
      {p.scorer ? <span className="min-w-0 truncate">{p.scorer.short}</span> : p.noScorer ? <span className="truncate">Aucun buteur</span> : null}
      {p.bonuses.length > 0 && (
        <>
          <span aria-hidden>·</span>
          <PickBonuses list={p.bonuses} size={20} />
        </>
      )}
    </span>
  );
}

/** Équipe : à domicile, le logo vient APRÈS le nom (symétrie avec l'équipe à l'extérieur, logo avant le nom). */
function Team({ t, open, home = false }: { t: MatchHeader["home"]; open: boolean; home?: boolean }) {
  const logo = t.logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={t.logo} alt="" width={20} height={20} loading="lazy" className={`shrink-0 object-contain ${open ? "h-6 w-6 rounded-md bg-white p-0.5" : "h-5 w-5"}`} />
  ) : null;
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${t.rennes ? "font-extrabold" : "font-semibold"}`}>
      {!home && logo}
      <TeamLabel name={t.name} rennes={t.rennes} className="truncate" />
      {home && logo}
    </span>
  );
}

export function MatchAccordion({ h, children, href }: { h: MatchHeader; children: ReactNode; href?: string }) {
  const group = useAccordionGroup();
  const router = useRouter();
  const onHeaderClick = () => {
    // Match à pronostiquer : page dédiée ; sinon l'accordéon s'ouvre
    if (href) router.push(href);
    else group?.toggle(h.id);
  };
  const open = !h.cancelled && group?.openId === h.id;
  const ref = useRef<HTMLElement>(null);
  const wasOpen = useRef(open);
  // À l'ouverture par un clic, on recadre sur le match (pas au chargement de la page).
  useEffect(() => {
    let t: ReturnType<typeof setTimeout> | undefined;
    if (open && !wasOpen.current) t = setTimeout(() => ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 320);
    wasOpen.current = open;
    return () => clearTimeout(t);
  }, [open]);

  const tone = open
    ? h.statusTone === "orange"
      ? "bg-white text-[#c2410c]"
      : "bg-black/25 text-white"
    : {
        green: "bg-green-100 text-green-800",
        red: "bg-red-100 text-red-700",
        grey: "bg-neutral-200 text-neutral-700",
        orange: "bg-orange-100 text-orange-800",
      }[h.statusTone];

  const badges = (mobile: boolean) => (
    <>
      {h.live && (
        <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 font-semibold ${open ? "bg-white text-rouge" : "bg-rouge text-white"}`}>
          <span aria-hidden className={`animate-blink-slow h-1.5 w-1.5 rounded-full ${open ? "bg-rouge" : "bg-white"}`} />
          {h.live}
        </span>
      )}
      <span className={`whitespace-nowrap rounded px-2 py-0.5 font-medium ${tone}`}>{mobile && h.statusShort ? h.statusShort : h.statusLabel}</span>
      {h.mine === "complete" && <span className="rounded bg-[#097D42] px-2 py-0.5 font-medium text-white">Complété</span>}
      {(h.mine === "score" || h.mine === "scorer") && (
        <span className="whitespace-nowrap rounded bg-[#FBBF24] px-2 py-0.5 font-medium text-[#3b2600]">Buteur à saisir</span>
      )}
      {h.mine === "incomplete" && (
        <span className={`rounded px-2 py-0.5 font-medium ${open ? `bg-white ${OPEN[h.competition].text}` : "bg-rouge text-white"}`}>À compléter</span>
      )}
      <span className={open ? "text-white/85" : "text-neutral-500"}>
        {mobile ? `${h.playersCount} J.` : `${h.playersCount} joueur${h.playersCount > 1 ? "s" : ""}`}
      </span>
    </>
  );

  return (
    <section
      ref={ref}
      id={`match-${h.id}`}
      className={`scroll-mt-40 rounded-lg border-y border-r border-l-[6px] bg-surface shadow-sm ${BORDER[h.competition]} ${
        open ? OPEN[h.competition].border : "border-y-neutral-200 border-r-neutral-200"
      }`}
    >
      <button
        type="button"
        onClick={onHeaderClick}
        aria-expanded={open}
        disabled={h.cancelled}
        className={`relative flex w-full items-start gap-3 p-3 text-left transition-colors sm:p-4 ${
          open
            ? `rounded-tr-lg text-white ${OPEN[h.competition].bg}`
            : h.cancelled
              ? "cursor-default"
              : `match-head match-head-${h.competition.toLowerCase()} rounded-r-lg hover:bg-neutral-50`
        }`}
      >
        <span className={`flex w-full items-start gap-3 ${h.cancelled ? "opacity-35" : ""}`}>
          <span className={`mt-0.5 w-10 shrink-0 font-display text-2xl font-black ${open ? "text-white/60" : "match-code"}`}>{h.code}</span>
          <span className={`min-w-0 flex-1 ${h.myPick ? "md:flex-initial" : ""}`}>
            <span className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:hidden">{badges(true)}</span>
            <span className={`mb-1 flex items-center gap-1.5 text-sm ${open ? "text-white/85" : "text-neutral-600"}`}>
              <CompetitionBadge code={h.competition} logo={h.competitionLogo} className={open ? "ring-1 ring-white/60" : ""} />
              <span className={open ? "" : `font-medium ${TEXT[h.competition]}`}>{h.competitionLabel}</span>
              {h.score?.pens && <span>· {h.score.pens}</span>}
            </span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Team t={h.home} open={open} home />
              <span className="font-display text-lg font-bold tabular-nums">
                {h.score ? `${h.score.home} - ${h.score.away}` : "–"}
              </span>
              <Team t={h.away} open={open} />
            </span>
            <span className={`mt-1 block text-xs ${open ? "text-white/80" : "text-neutral-500"}`}>{h.dateLabel}</span>
            {h.myPick && (
              <span className="md:hidden">
                <MyPick p={h.myPick} open={open} variant="mobile" />
              </span>
            )}
          </span>
          {h.myPick && (
            // à égale distance des infos du match et des statuts
            <span className="hidden flex-1 justify-center self-center md:flex">
              <MyPick p={h.myPick} open={open} variant="pc" />
            </span>
          )}
          <span className="hidden shrink-0 flex-col items-end gap-1 text-xs sm:flex">{badges(false)}</span>
          {/* Flèche seulement pour un accordéon (pas pour un match qui ouvre sa page) */}
          {!href && (
            <span aria-hidden className={`mt-1 transition-transform ${open ? "rotate-180" : ""}`}>
              ▾
            </span>
          )}
        </span>
        {h.cancelled && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-3 rounded border-2 border-rouge bg-surface/80 px-4 py-1 text-xl font-black uppercase tracking-[0.3em] text-rouge">
              Annulé
            </span>
          </span>
        )}
      </button>
      {/* Ouverture : la hauteur se déploie, puis les rubriques apparaissent l'une après l'autre (dévoilement progressif) */}
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} inert={!open}>
        <div className="overflow-hidden">
          <div className={`space-y-6 border-t border-neutral-200 p-4 ${open ? "disclose" : "opacity-0"}`}>
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
