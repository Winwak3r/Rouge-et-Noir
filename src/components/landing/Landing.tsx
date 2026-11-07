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
    <div className="relative -mt-6 left-1/2 w-screen -translate-x-1/2 text-white">
      {/* ─── Page 1 ─── */}
      <section className="landing-bg-1 relative flex min-h-[calc(100svh-5rem)] items-center px-6 py-16">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[1.1fr_1fr]">
          <div className="space-y-6">
            <h1 className={`${title} text-5xl sm:text-6xl lg:text-7xl`}>
              Le jeu de pronos
              <br />
              du <span className="text-rouge">Stade Rennais F.C.</span>
            </h1>
            <p className="max-w-xl text-lg text-white/80 sm:text-xl">Rejoins les Rouge &amp; Noir : ici, on ne lâche rien… sauf parfois les points !</p>
            <Buttons />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-sombre.png" alt="Roazhon Park — Rouge & Noir" className="landing-fade w-full opacity-95" />
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
      <section id="challenge" className="landing-bg-2 flex min-h-[100svh] items-center px-6 py-16">
        <div className="mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1fr_1.1fr]">
          <div className="order-2 lg:order-1">
            <SitePreview />
          </div>
          <div className="order-1 space-y-6 lg:order-2">
            <h2 className={`${title} text-5xl sm:text-6xl lg:text-7xl`}>
              <span className="text-rouge">Rouge</span> &amp; Noir
              <br />
              Challenge
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
