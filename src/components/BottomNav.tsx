"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar } from "./Avatar";
import { setNavDirection } from "@/lib/nav-direction";

interface L {
  id: string;
  name: string;
  imageAt: number | null;
}

const icon = (d: ReactNode) => (
  <svg aria-hidden viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

/**
 * Barre de navigation du bas (mobile) : ligue affichée · ligues · CALENDRIER (bouton central) · classements · compte.
 * Règles, thème et classement de la ligue restent en haut.
 */
export function BottomNav(props: { user: { id: string; pseudo: string; avatarAt: number | null }; rennesLogo: string | null }) {
  const path = usePathname();
  const on = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  const item = (href: string, label: string, glyph: ReactNode, tour?: string) => (
    <Link
      href={href}
      onClick={() => setNavDirection(path, href)}
      data-tour={tour}
      aria-current={on(href) ? "page" : undefined}
      className={`flex flex-col items-center gap-0.5 pt-1.5 text-[10px] font-semibold transition-colors ${on(href) ? "text-rouge" : "text-neutral-600"}`}
    >
      {glyph}
      <span>{label}</span>
    </Link>
  );

  return (
    <nav
      aria-label="Navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-[var(--header-bg)] pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.08)] sm:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-start px-1">
        {/* 1. SRFC : classements officiels du Stade Rennais */}
        {item(
          "/classements-srfc",
          "SRFC",
          props.rennesLogo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={props.rennesLogo} alt="" className="h-6 w-6 object-contain" />
          ) : (
            icon(<circle cx="12" cy="12" r="9" />)
          ),
          "standings",
        )}

        {/* 2. Ligues (rejoindre, créer, gérer) */}
        {item(
          "/ligues",
          "Ligues",
          icon(
            <>
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
            </>,
          ),
          "leagues",
        )}

        {/* 3. Calendrier : bouton central, qui dépasse de la barre */}
        <Link
          href="/"
          onClick={() => setNavDirection(path, "/")}
          data-tour="calendar"
          aria-current={on("/") ? "page" : undefined}
          aria-label="Calendrier"
          className="flex flex-col items-center"
        >
          <span
            className={`-mt-6 grid h-14 w-14 place-items-center rounded-full shadow-lg ring-4 ring-[var(--header-bg)] transition-colors transition-transform active:scale-95 ${
              on("/") ? "bg-rouge text-white" : "border-2 border-rouge bg-[var(--header-bg)] text-rouge"
            }`}
          >
            <svg aria-hidden viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <path d="M16 2v4M8 2v4M3 10h18" />
              <path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" strokeWidth="2.6" />
            </svg>
          </span>
          <span className={`mt-0.5 text-[10px] font-semibold ${on("/") ? "text-rouge" : "text-neutral-600"}`}>Calendrier</span>
        </Link>

        {/* 4. Classement des ligues du joueur */}
        {item(
          "/classement",
          "Classement",
          icon(
            <>
              <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
              <path d="M17 6h3v1a4 4 0 0 1-3 3.87M7 6H4v1a4 4 0 0 0 3 3.87" />
            </>,
          ),
          "rank-mobile",
        )}

        {/* 5. Mon compte */}
        {item(
          "/compte",
          "Compte",
          <span className={`rounded-full ${on("/compte") ? "ring-2 ring-rouge" : ""}`}>
            <Avatar userId={props.user.id} pseudo={props.user.pseudo} at={props.user.avatarAt} size={24} />
          </span>,
          "user-menu",
        )}
      </div>
    </nav>
  );
}
