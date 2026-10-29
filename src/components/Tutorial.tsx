"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { completeTutorialAction } from "@/app/actions/auth";

interface Step {
  target: string; // valeur de l'attribut data-tour de l'élément à montrer
  title: string;
  text: string;
  /** Barème affiché sous le texte (étape « Les règles ») */
  scale?: boolean;
}

const STEPS: Step[] = [
  {
    target: "calendar",
    title: "Le calendrier",
    text: "Tous les matchs du Stade Rennais : Ligue 1, coupe d’Europe et Coupe de France. Ouvre un match pour pronostiquer le score et, si tu veux, un buteur rennais : plus il est improbable, plus il rapporte !",
  },
  {
    target: "user-menu",
    title: "Ton menu",
    text: "Clique sur ton pseudo pour gérer ton compte (photo, notifications, mot de passe) et tes ligues : en rejoindre une avec un code, ou en créer une.",
  },
  {
    target: "league",
    title: "Tes ligues",
    text: "Tu joues dans plusieurs ligues ? Passe de l’une à l’autre ici : ton classement et les pronostics des autres joueurs suivent la ligue choisie.",
  },
  {
    target: "rank",
    title: "Ton classement",
    text: "Ta position et tes points dans la ligue affichée. Touche ce bloc pour voir le classement complet des participants.",
  },
  {
    target: "rules",
    title: "Les règles",
    text: "Tout le fonctionnement du jeu est expliqué ici. Pour le score, voici ce que rapporte chaque pronostic :",
    scale: true,
  },
  {
    target: "standings",
    title: "Classements officiels",
    text: "Les classements officiels des compétitions du Stade Rennais, et les meilleurs buteurs.",
  },
];

const PAD = 6; // marge autour de l'élément éclairé
const GAP = 14; // distance entre l'élément et la bulle

type Box = { top: number; left: number; width: number; height: number };

/**
 * Visite guidée en 5 étapes : l'élément décrit reste éclairé, le reste de l'écran est grisé,
 * une bulle munie d'une flèche le désigne. Affichée une fois, sur l'accueil.
 * `waitForEvent` : attendre qu'une autre fenêtre (bienvenue dans la ligue) soit fermée.
 */
export interface TutorialPoints {
  exact: number;
  goalDiff: number;
  outcome: number;
  wrong: number;
  missing: number;
}

const fmt = (n: number) => `${n > 0 ? "+" : ""}${n} point${Math.abs(n) > 1 ? "s" : ""}`;

export function Tutorial({ waitForEvent, points }: { waitForEvent?: string; points: TutorialPoints }) {
  const pathname = usePathname();
  const [ready, setReady] = useState(!waitForEvent);
  const [steps, setSteps] = useState<Step[]>([]);
  const [index, setIndex] = useState(0);
  const [box, setBox] = useState<Box | null>(null);
  const [open, setOpen] = useState(true);
  const bubble = useRef<HTMLDivElement>(null);
  const [bubbleH, setBubbleH] = useState(160);

  useEffect(() => {
    if (!waitForEvent) return;
    const go = () => setReady(true);
    window.addEventListener(waitForEvent, go);
    return () => window.removeEventListener(waitForEvent, go);
  }, [waitForEvent]);

  // Étapes dont l'élément existe réellement à l'écran
  useEffect(() => {
    if (!ready || pathname !== "/") return;
    const t = setTimeout(() => setSteps(STEPS.filter((s) => document.querySelector(`[data-tour="${s.target}"]`))), 400);
    return () => clearTimeout(t);
  }, [ready, pathname]);

  const step = steps[index];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    if (!el) return;
    const r = el.getBoundingClientRect();
    // un élément très haut (calendrier) : on n'éclaire que le haut, visible à l'écran
    const height = Math.min(r.height, window.innerHeight * 0.45);
    setBox({ top: r.top - PAD, left: r.left - PAD, width: r.width + 2 * PAD, height: height + 2 * PAD });
  }, [step]);

  // Amener l'élément à l'écran, puis le mesurer (et suivre défilement / redimensionnement)
  useEffect(() => {
    if (!step) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [step, measure]);

  useLayoutEffect(() => {
    if (bubble.current) setBubbleH(bubble.current.offsetHeight);
  }, [box, index]);

  const finish = () => {
    setOpen(false);
    void completeTutorialAction();
  };

  if (!open || !ready || pathname !== "/" || !step || !box) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const width = Math.min(340, vw - 24);
  const below = box.top + box.height + GAP + bubbleH < vh - 8 || box.top < bubbleH + GAP + 8;
  const top = below ? box.top + box.height + GAP : box.top - GAP - bubbleH;
  const centerX = box.left + box.width / 2;
  const left = Math.min(Math.max(12, centerX - width / 2), vw - width - 12);
  const arrowX = Math.min(Math.max(18, centerX - left), width - 18); // la flèche vise le centre de l'élément
  const last = index === steps.length - 1;

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label={`Didacticiel, étape ${index + 1} sur ${steps.length} : ${step.title}`}>
      {/* Fond grisé avec une « fenêtre » sur l'élément décrit */}
      <div
        aria-hidden
        className="pointer-events-none absolute rounded-xl ring-2 ring-white transition-all duration-300 ease-out motion-reduce:transition-none"
        style={{ top: box.top, left: box.left, width: box.width, height: box.height, boxShadow: "0 0 0 9999px rgba(0,0,0,0.55)" }}
      />
      {/* La bulle et sa flèche */}
      <div
        ref={bubble}
        className="absolute rounded-xl border border-neutral-200 bg-surface p-4 shadow-2xl transition-all duration-300 ease-out motion-reduce:transition-none"
        style={{ top, left, width }}
      >
        <span
          aria-hidden
          className="absolute h-4 w-4 rotate-45 border-neutral-200 bg-surface"
          style={{
            left: arrowX - 8,
            ...(below ? { top: -8, borderLeftWidth: 1, borderTopWidth: 1 } : { bottom: -8, borderRightWidth: 1, borderBottomWidth: 1 }),
          }}
        />
        <p className="text-[11px] font-bold uppercase tracking-wide text-rouge">
          Étape {index + 1} sur {steps.length}
        </p>
        <h2 className="mt-0.5 font-display text-xl font-bold uppercase tracking-wide">{step.title}</h2>
        <p className="mt-1.5 text-sm text-neutral-700">{step.text}</p>
        {step.scale && (
          <table className="mt-2 w-full text-sm">
            <tbody className="divide-y divide-neutral-100">
              {[
                ["Score exact", points.exact],
                ["Bon résultat et bon écart de buts", points.goalDiff],
                ["Bon résultat, mauvais écart", points.outcome],
                ["Mauvais résultat", points.wrong],
                ["Aucun pronostic avant le coup d’envoi", points.missing],
              ].map(([label, n]) => (
                <tr key={label as string}>
                  <td className="py-1 pr-2 text-neutral-700">{label}</td>
                  <td
                    className={`whitespace-nowrap py-1 text-right font-bold tabular-nums ${
                      (n as number) > 0 ? "text-green-700" : (n as number) < 0 ? "text-red-700" : "text-neutral-500"
                    }`}
                  >
                    {fmt(n as number)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="mt-4 flex items-center justify-between gap-3">
          {/* Points de progression */}
          <span className="flex gap-1.5" aria-hidden>
            {steps.map((s, i) => (
              <span key={s.target} className={`h-1.5 w-1.5 rounded-full ${i === index ? "bg-rouge" : "bg-neutral-300"}`} />
            ))}
          </span>
          <span className="flex items-center gap-3">
            {!last && (
              <button type="button" onClick={finish} className="text-xs text-neutral-500 underline underline-offset-2">
                Passer
              </button>
            )}
            <button type="button" autoFocus onClick={() => (last ? finish() : setIndex((i) => i + 1))} className="btn-primary px-4 py-1.5">
              {last ? "C’est parti !" : "Suivant"}
            </button>
          </span>
        </div>
      </div>
    </div>
  );
}
