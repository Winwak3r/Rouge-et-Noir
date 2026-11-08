"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { completeTutorialAction } from "@/app/actions/auth";

interface Step {
  group: number; // numéro d'étape affiché (1 à 7)
  page: "home" | "match"; // accueil, ou page du prochain match à pronostiquer
  tab?: "pre" | "scorer" | "bonus"; // onglet à ouvrir sur la page du match
  target: string; // repère (attribut data-tour) de l'élément à montrer sur ordinateur
  mobileTarget?: string; // … et sur mobile, s'il est différent
  title: string;
  text: string;
  mobileText?: string;
  /** Barème affiché sous le texte (étape « Les règles ») */
  scale?: boolean;
}

const GROUPS = 7;
const STEPS: Step[] = [
  {
    group: 1,
    page: "home",
    target: "calendar",
    title: "Le calendrier",
    text: "La page d’accueil de Rouge & Noir. Accède au calendrier et aux résultats des matchs du Stade Rennais : Ligue 1, coupe d’Europe (si qualifié) et Coupe de France. Le match en direct et le prochain match du club s’affichent en tête.",
  },
  {
    group: 2,
    page: "home",
    target: "next-match",
    title: "Les pronostics",
    text: "Ouvre un match du calendrier pour connaître les stats de la rencontre, pronostiquer le score, et un buteur rennais : plus il est improbable, plus il rapporte ! Si tu es gourmand, tu peux aussi goûter aux spécialités maison ! 😋",
  },
  { group: 3, page: "home", target: "leagues", title: "Les ligues", text: "Crée une ligue, rejoins-en une avec un code et gère les tiennes." },
  {
    group: 4,
    page: "home",
    target: "rank",
    mobileTarget: "rank-mobile",
    title: "Les classements",
    text: "Consulte le classement complet de la ligue sélectionnée.",
  },
  {
    group: 5,
    page: "home",
    target: "user-menu",
    title: "Ton compte",
    text: "Photo de profil, mot de passe, notifications, déconnexion… Tu peux tout gérer depuis cet espace.",
  },
  {
    group: 6,
    page: "home",
    target: "standings",
    title: "Les actus du SRFC",
    text: "Toute l’actualité du Stade Rennais FC : les infos, les transferts, les classements officiels, l’effectif complet, et les liens vers le site et la boutique du club.",
  },
  {
    group: 7,
    page: "home",
    target: "rules",
    title: "Les règles du jeu",
    text: "Tout le fonctionnement du jeu y est expliqué. Pour le score, voici ce que rapporte chaque pronostic :",
    scale: true,
  },
];

const isMobile = () => typeof window !== "undefined" && !window.matchMedia("(min-width: 640px)").matches;
const targetOf = (s: Step) => (isMobile() && s.mobileTarget ? s.mobileTarget : s.target);
const textOf = (s: Step) => (isMobile() && s.mobileText ? s.mobileText : s.text);

/** Premier élément visible portant ce repère (certains existent en double : en-tête et barre du bas). */
const findTarget = (t: string) =>
  [...document.querySelectorAll<HTMLElement>(`[data-tour="${t}"]`)].find((el) => el.getClientRects().length > 0) ?? null;

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

  // Étapes retenues : celles de la page du match seulement s'il y a un match à pronostiquer
  useEffect(() => {
    if (!ready) return;
    setSteps(STEPS);
  }, [ready]);

  const step = steps[index];
  // Toutes les étapes passées (dernières introuvables) : visite terminée
  useEffect(() => {
    if (steps.length && index >= steps.length) {
      setOpen(false);
      void completeTutorialAction();
    }
  }, [index, steps.length]);
  const where = step ? "/" : null;
  const onPage = Boolean(where && pathname === where);

  // Aller sur la bonne page (accueil ou page du match), ouvrir l'onglet voulu, puis attendre que l'élément
  // apparaisse ; s'il n'apparaît pas (bouton absent sur cet écran), on passe à l'étape suivante.
  const [found, setFound] = useState(false);
  useEffect(() => {
    if (!step || !where) return;
    setFound(false);
    setBox(null);
    if (pathname !== where) return; // visite guidée seulement sur l'accueil
    let tries = 0;
    const id = setInterval(() => {
      if (findTarget(targetOf(step))) {
        clearInterval(id);
        setFound(true);
      } else if (++tries > 25) {
        clearInterval(id);
        setIndex((i) => i + 1);
      }
    }, 160);
    return () => clearInterval(id);
  }, [step, where, pathname]); // eslint-disable-line react-hooks/exhaustive-deps

  const measure = useCallback(() => {
    if (!step) return;
    const el = findTarget(targetOf(step));
    if (!el) return;
    // Union de l'élément et de ses enfants : le bouton rond du calendrier dépasse de son lien
    const rects = [el, ...el.querySelectorAll<HTMLElement>("*")].map((x) => x.getBoundingClientRect()).filter((x) => x.width && x.height);
    const r = {
      top: Math.min(...rects.map((x) => x.top)),
      left: Math.min(...rects.map((x) => x.left)),
      bottom: Math.max(...rects.map((x) => x.bottom)),
      right: Math.max(...rects.map((x) => x.right)),
      get width() {
        return this.right - this.left;
      },
      get height() {
        return this.bottom - this.top;
      },
    };
    const pad = el.closest("nav") ? 10 : PAD; // barre du bas : marge plus large autour du bouton
    // un élément très haut (calendrier) : on n'éclaire que le haut, visible à l'écran
    const height = Math.min(r.height, window.innerHeight * 0.45);
    setBox({ top: r.top - pad, left: r.left - pad, width: r.width + 2 * pad, height: height + 2 * pad });
  }, [step]);

  // Amener l'élément à l'écran, puis le mesurer (et suivre défilement / redimensionnement)
  useEffect(() => {
    if (!step || !found) return;
    const el = findTarget(targetOf(step));
    // éléments de la barre du bas ou de l'en-tête : toujours visibles, inutile de faire défiler
    if (el && !el.closest("nav, header")) el.scrollIntoView({ block: "center", behavior: "smooth" });
    const t = setTimeout(measure, 350);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, { passive: true });
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure);
    };
  }, [step, measure, found]);

  useLayoutEffect(() => {
    if (bubble.current) setBubbleH(bubble.current.offsetHeight);
  }, [box, index]);

  const finish = () => {
    setOpen(false);
    void completeTutorialAction();
  };

  if (!open || !ready || !onPage || !found || !step || !box) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const width = Math.min(340, vw - 24);
  const below = box.top + box.height + GAP + bubbleH < vh - 8 || box.top < bubbleH + GAP + 8;
  const top = below ? box.top + box.height + GAP : box.top - GAP - bubbleH;
  const centerX = box.left + box.width / 2;
  const left = Math.min(Math.max(12, centerX - width / 2), vw - width - 12);
  const arrowX = Math.min(Math.max(18, centerX - left), width - 18); // la flèche vise le centre de l'élément
  const last = index === steps.length - 1;
  const groups = Math.min(GROUPS, Math.max(...steps.map((x) => x.group)));

  return (
    <div className="fixed inset-0 z-[120]" role="dialog" aria-modal="true" aria-label={`Didacticiel, étape ${step.group} sur ${groups} : ${step.title}`}>
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
          Étape {step.group} sur {groups}
        </p>
        <h2 className="mt-0.5 font-display text-xl font-bold uppercase tracking-wide">{step.title}</h2>
        <p className="mt-1.5 text-sm text-neutral-700">{textOf(step)}</p>
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
            {Array.from({ length: groups }, (_, g) => (
              <span key={g} className={`h-1.5 w-1.5 rounded-full ${g + 1 === step.group ? "bg-rouge" : "bg-neutral-300"}`} />
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
