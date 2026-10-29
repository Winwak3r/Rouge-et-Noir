"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Rubriques de l'administration, en vrais boutons ; la rubrique ouverte est mise en évidence. */
export function AdminNav({ links }: { links: ReadonlyArray<readonly [string, string]> }) {
  const path = usePathname();
  return (
    <nav aria-label="Rubriques de l’administration" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
      {links.map(([href, label]) => {
        const on = href === "/admin" ? path === "/admin" : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={on ? "page" : undefined}
            className={`${on ? "btn-primary" : "btn-secondary"} min-h-11 px-2 text-center text-xs sm:text-sm`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
