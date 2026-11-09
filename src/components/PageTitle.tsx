"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Titre de page, avec la flèche de retour.
 *  - En haut de page : « ← Retour » au-dessus du grand titre.
 *  - Dès que le titre sort de l'écran : une barre compacte glisse sous l'en-tête du site, avec une flèche plus grosse
 *    (sans le mot « Retour ») et le titre en plus petit, même police et même couleur.
 * La barre est posée par-dessus la page : elle ne déplace pas le contenu (pas de va-et-vient au défilement).
 */
export function PageTitle({ children, className = "page-title" }: { children: ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLHeadingElement>(null);
  const [compact, setCompact] = useState(false);
  const [top, setTop] = useState(0);

  const back = () => {
    const fromSite = document.referrer.startsWith(window.location.origin);
    if (fromSite && window.history.length > 1) router.back();
    else router.push("/");
  };

  // Hauteur de l'en-tête du site (la barre compacte se place juste dessous)
  useEffect(() => {
    const head = document.querySelector("header");
    if (!head) return;
    const measure = () => setTop(head.getBoundingClientRect().height);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(head);
    return () => ro.disconnect();
  }, []);

  // Barre compacte dès que le grand titre passe sous l'en-tête
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setCompact(!e.isIntersecting && e.boundingClientRect.top < 0 + top + 1), {
      rootMargin: `-${Math.round(top)}px 0px 0px 0px`,
    });
    io.observe(el);
    return () => io.disconnect();
  }, [top]);

  // Les onglets figés (page Actus…) se placent sous la barre compacte
  useEffect(() => {
    document.documentElement.style.setProperty("--page-bar-h", compact ? "3rem" : "0px");
    return () => {
      document.documentElement.style.setProperty("--page-bar-h", "0px");
    };
  }, [compact]);

  const arrow = (size: number) => (
    <svg aria-hidden viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );

  return (
    <>
      <div className="space-y-1">
        {pathname !== "/" && (
          <button
            type="button"
            onClick={back}
            className={`-ml-1 inline-flex items-center gap-1.5 rounded-lg px-1 py-1 text-sm font-semibold text-neutral-600 transition-opacity duration-300 hover:text-rouge ${
              compact ? "opacity-0" : "opacity-100"
            }`}
          >
            {arrow(18)}
            Retour
          </button>
        )}
        <h1 ref={ref} className={`${className} transition-opacity duration-300 ${compact ? "opacity-0" : "opacity-100"}`}>
          {children}
        </h1>
      </div>

      {/* Barre compacte : flèche plus grosse et titre réduit, sous l'en-tête du site */}
      <div
        aria-hidden={!compact}
        className={`fixed inset-x-0 z-[25] border-b border-neutral-200 bg-[var(--header-bg)] shadow-sm transition-all duration-300 ${
          compact ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-2 opacity-0"
        }`}
        style={{ top }}
      >
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-2 px-4">
          {pathname !== "/" && (
            <button type="button" onClick={back} aria-label="Retour" tabIndex={compact ? 0 : -1} className="-ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full text-noir hover:bg-neutral-100 hover:text-rouge">
              {arrow(24)}
            </button>
          )}
          <p className={`${className} !mb-0 truncate !text-xl sm:!text-2xl`}>{children}</p>
        </div>
      </div>
    </>
  );
}
