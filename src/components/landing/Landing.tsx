import Link from "next/link";
import { SitePreview } from "./SitePreview";

const title = "font-display font-bold uppercase leading-[0.95] tracking-wide";

function Buttons() {
  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <Link
        href="/inscription"
        className="inline-flex items-center justify-center rounded-xl bg-rouge px-7 py-3.5 text-base font-bold text-white shadow-lg shadow-rouge/30 transition-transform hover:scale-[1.03] hover:bg-rouge-fonce focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Je m’inscris
      </Link>
      <Link
        href="/connexion"
        className="inline-flex items-center justify-center rounded-xl bg-[#111111] px-7 py-3.5 text-base font-bold text-white ring-1 ring-white/25 transition-transform hover:scale-[1.03] hover:ring-white/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
      >
        Je me connecte
      </Link>
    </div>
  );
}

/**
 * Accueil des visiteurs sans compte (le site n'est accessible qu'une fois connecté) : deux « pages »
 * plein écran, sur des fonds bretons rouge & noir, avec « Je m'inscris » / « Je me connecte ».
 */
export function Landing() {
  return (
    // Pleine largeur, au-delà de la colonne centrale du site
    <div className="recap-bg relative left-1/2 w-screen -translate-x-1/2 text-white" style={{ marginTop: "calc(-1 * var(--main-pt, 1.5rem))" }}>
      {/* Page visiteur en plein écran : l'en-tête du site est masqué ici */}
      <style>{"body > header, header.site-header { display: none !important; }"}</style>
      {/* Fond animé rouge et noir : triskells et hermines qui défilent (le même que l'animation de fin de match) */}
      {/* ─── Page 1 ─── */}
      <section className="relative flex min-h-[100svh] items-start px-6 py-8 lg:items-center lg:py-16">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <h1 className={title}>
              {/* 1re ligne en blanc, sans retour à la ligne ; 2e ligne en noir */}
              <span className="block whitespace-nowrap text-[7.2vw] text-white sm:text-5xl lg:text-6xl">Le jeu de pronos du</span>
              {/* texte noir sur un bloc blanc incliné avec ombre ; une seule ligne (taille adaptée sur mobile) */}
              <span className="mt-2 block">
                <span className="inline-block -rotate-1 whitespace-nowrap bg-white px-3 pb-1 pt-2 text-[8.6vw] leading-none text-[#111111] shadow-[0_6px_20px_rgba(0,0,0,0.35)] sm:text-6xl lg:text-7xl">
                  Stade Rennais F.C.
                </span>
              </span>
            </h1>
            <p className="max-w-xl text-lg text-white/80 sm:text-xl">Rejoins les Rouge &amp; Noir : ici, on ne lâche rien… sauf parfois les points !</p>
            <Buttons />
          </div>
          {/* Logo (fond transparent) ; sur mobile, tout en haut de l'écran */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <div className="landing-fade order-first rounded-2xl bg-white p-3 shadow-[0_18px_50px_rgba(0,0,0,0.5)] ring-1 ring-white/60 sm:p-5 lg:order-none">
            <img src="/brand/logo-rouge-noir.png" alt="Roazhon Park — Rouge & Noir" className="w-full" />
          </div>
        </div>
        <a
          href="#challenge"
          aria-label="Découvrir le challenge"
          className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-bounce text-white/60 hover:text-white sm:block"
        >
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </a>
      </section>

      {/* ─── Page 2 ─── */}
      <section id="challenge" className="flex min-h-[100svh] items-center px-6 py-16">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="order-2 lg:order-1">
            <SitePreview />
          </div>
          <div className="order-1 space-y-6 lg:order-2">
            <h2 className={`${title} text-5xl sm:text-6xl lg:text-7xl`}>
              Le challenge
              <br />
              <span className="text-rouge">Rouge</span> &amp; Noir
            </h2>
            <p className="text-xl font-semibold sm:text-2xl">Du foot, des potes et un classement à défendre !</p>
            <p className="max-w-xl text-lg text-white/75">
              Rejoins une ligue pour défier tes amis, ta famille ou tes collègues sur toutes les compétitions du Stade Rennais.
            </p>
            <Buttons />
          </div>
        </div>
      </section>
    </div>
  );
}
