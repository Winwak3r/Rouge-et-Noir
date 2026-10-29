"use client";

import { useEffect, useRef, type ReactNode } from "react";
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
}

function Team({ t, open }: { t: MatchHeader["home"]; open: boolean }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-1.5 ${t.rennes ? "font-extrabold" : "font-semibold"}`}>
      {t.logo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={t.logo} alt="" width={20} height={20} loading="lazy" className={`h-5 w-5 shrink-0 object-contain ${open ? "rounded-full bg-white p-px" : ""}`} />
      ) : null}
      <TeamLabel name={t.name} rennes={t.rennes} className="truncate" />
    </span>
  );
}

export function MatchAccordion({ h, children }: { h: MatchHeader; children: ReactNode }) {
  const group = useAccordionGroup();
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
        onClick={() => group?.toggle(h.id)}
        aria-expanded={open}
        disabled={h.cancelled}
        className={`relative flex w-full items-start gap-3 p-3 text-left transition-colors sm:p-4 ${
          open ? `rounded-tr-lg text-white ${OPEN[h.competition].bg}` : h.cancelled ? "cursor-default" : "rounded-r-lg hover:bg-neutral-50"
        }`}
      >
        <span className={`flex w-full items-start gap-3 ${h.cancelled ? "opacity-35" : ""}`}>
          <span className={`mt-0.5 w-10 shrink-0 font-display text-2xl font-black ${open ? "text-white/60" : "text-neutral-300"}`}>{h.code}</span>
          <span className="min-w-0 flex-1">
            <span className="mb-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs sm:hidden">{badges(true)}</span>
            <span className={`mb-1 flex items-center gap-1.5 text-sm ${open ? "text-white/85" : "text-neutral-600"}`}>
              <CompetitionBadge code={h.competition} logo={h.competitionLogo} className={open ? "ring-1 ring-white/60" : ""} />
              <span className={open ? "" : `font-medium ${TEXT[h.competition]}`}>{h.competitionLabel}</span>
              {h.score?.pens && <span>· {h.score.pens}</span>}
            </span>
            <span className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Team t={h.home} open={open} />
              <span className="font-display text-lg font-bold tabular-nums">
                {h.score ? `${h.score.home} - ${h.score.away}` : "–"}
              </span>
              <Team t={h.away} open={open} />
            </span>
            <span className={`mt-1 block text-xs ${open ? "text-white/80" : "text-neutral-500"}`}>{h.dateLabel}</span>
          </span>
          <span className="hidden shrink-0 flex-col items-end gap-1 text-xs sm:flex">{badges(false)}</span>
          <span aria-hidden className={`mt-1 transition-transform ${open ? "rotate-180" : ""}`}>
            ▾
          </span>
        </span>
        {h.cancelled && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="-rotate-3 rounded border-2 border-rouge bg-surface/80 px-4 py-1 text-xl font-black uppercase tracking-[0.3em] text-rouge">
              Annulé
            </span>
          </span>
        )}
      </button>
      {/* Ouverture : hauteur, puis contenu qui glisse de gauche à droite en apparaissant */}
      <div className={`grid transition-all duration-300 ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`} inert={!open}>
        <div className="overflow-hidden">
          <div
            className={`space-y-6 border-t border-neutral-200 p-4 transition-[opacity,transform] duration-300 ease-out motion-reduce:transition-none ${
              open ? "translate-x-0 opacity-100" : "-translate-x-3 opacity-0"
            }`}
          >
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
