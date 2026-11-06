import Link from "next/link";

/** Pied de page : liens centrés sur une ligne (mentions légales, données et partenaires, contact). */
export function Footer() {
  const links = [
    ["/mentions-legales", "Mentions légales"],
    ["/donnees-partenaires", "Données et partenaires"],
    ["/contact", "Contact"],
  ] as const;
  return (
    <footer className="border-t border-neutral-200 bg-[var(--header-bg)] pb-28 pt-5 text-xs text-neutral-500 sm:pb-6">
      <nav aria-label="Informations" className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-x-2 gap-y-1 px-4">
        {links.map(([href, label], i) => (
          <span key={href} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden className="text-neutral-300">·</span>}
            <Link href={href} className="font-bold uppercase tracking-wide text-neutral-600 underline-offset-2 hover:text-rouge hover:underline">
              {label}
            </Link>
          </span>
        ))}
      </nav>
      <p className="mt-2 text-center">© {new Date().getFullYear()} Rouge &amp; Noir — Les Pronostics</p>
    </footer>
  );
}
