"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { teamAbbr } from "@/lib/team-abbr";

type Side = { name: string; logo: string | null; rennes: boolean };

/**
 * Accueil : quand le match à la une sort de l'écran, une barre fixe glisse sous l'en-tête du site :
 * [titre] [J10 · logo de la compétition] [Rennes 1 - 2 Lille] [statut]. Un clic remonte en haut de la page.
 */
export function HomeStickyMatch(props: {
  /** « mobile » : petits écrans seulement ; « desktop » : ordinateur seulement */
  only?: "mobile" | "desktop";
  /** noms complets des équipes (sinon sigles) */
  fullNames?: boolean;
  watchId: string;
  title: string;
  code: string;
  competitionLogo: string | null;
  home: Side;
  away: Side;
  score: string | null;
  status: string;
  live: boolean;
}) {
  const [top, setTop] = useState(0);
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const head = document.querySelector("header");
    if (!head) return;
    const measure = () => setTop(head.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);

  // Visible dès que le bloc du match est passé sous l'en-tête
  useEffect(() => {
    const el = document.getElementById(props.watchId);
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setShow(!e.isIntersecting && e.boundingClientRect.top < top), {
      rootMargin: `-${Math.round(top)}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [props.watchId, top]);

  if (!mounted) return null;
  const logo = (s: Side) =>
    s.logo ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={s.logo} alt="" className="h-5 w-5 shrink-0 object-contain" />
    ) : null;

  return createPortal(
    <button
      type="button"
      aria-hidden={!show}
      tabIndex={show ? 0 : -1}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      title="Revenir en haut"
      className={`fixed inset-x-0 z-[25] w-full border-b ${props.only === "mobile" ? "block lg:hidden" : props.only === "desktop" ? "hidden lg:block" : "block"} border-neutral-200 bg-[var(--header-bg)] text-left shadow-sm transition-all duration-300 ${
        show ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
      }`}
      style={{ top }}
    >
      <span className="mx-auto flex h-12 max-w-5xl items-center gap-2 px-4 text-sm sm:gap-3">
        {/* Titre */}
        <span className="hidden shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-noir sm:flex">
          {props.live && <span aria-hidden className="h-2 w-2 animate-pulse rounded-full bg-rouge" />}
          {props.title}
        </span>
        <span aria-hidden className="hidden h-6 w-px shrink-0 bg-neutral-300 sm:block" />
        {/* Journée · compétition */}
        <span className="flex shrink-0 items-center gap-1 text-xs font-bold text-neutral-500">
          {props.code}
          {props.competitionLogo && (
            <>
              <span aria-hidden>·</span>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={props.competitionLogo} alt="" className="h-5 w-5 rounded bg-white object-contain p-px" />
            </>
          )}
        </span>
        {/* Le match */}
        <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 font-semibold">
          <span className="font-display text-base font-bold uppercase tracking-wide">{props.fullNames ? props.home.name : teamAbbr(props.home.name)}</span>
          {logo(props.home)}
          <span className="shrink-0 px-1 font-club text-base font-semibold tabular-nums">{props.score ?? "–"}</span>
          {logo(props.away)}
          <span className="font-display text-base font-bold uppercase tracking-wide">{props.fullNames ? props.away.name : teamAbbr(props.away.name)}</span>
        </span>
        {/* Statut */}
        <span
          className={`shrink-0 rounded px-2 py-0.5 text-[11px] font-semibold ${
            props.live ? "bg-rouge text-white" : "bg-neutral-100 text-neutral-700"
          }`}
        >
          {props.status}
        </span>
      </span>
    </button>,
    document.body,
  );
}
