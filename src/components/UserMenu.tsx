"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "./Avatar";

/** Menu du pseudo : se ferme au clic ailleurs, avec Échap, ou au changement de page. */
export function UserMenu(props: {
  userId: string;
  avatarAt: number | null;
  pseudo: string;
  isAdmin: boolean;
  canCreateLeague: boolean;
  isLeagueAdmin: boolean;
  logoutAction: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const item = "block w-full rounded px-3 py-2 text-left hover:bg-neutral-100";
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-haspopup="menu" className="hbtn-pseudo">
        <Avatar userId={props.userId} pseudo={props.pseudo} at={props.avatarAt} size={20} className="ring-white/60" />
        <span className="max-w-[3.5rem] truncate sm:max-w-none">{props.pseudo}</span>
        <span aria-hidden>▾</span>
      </button>
      {open && (
        <div role="menu" className="absolute left-0 z-40 mt-2 w-48 rounded-lg border border-neutral-200 bg-surface p-1 text-sm shadow-lg">
          <Link href="/compte" role="menuitem" className={item}>
            Mon compte
          </Link>
          <Link href="/ligues" role="menuitem" className={item}>
            Ligues
          </Link>
          {props.isAdmin && (
            <Link href="/admin" role="menuitem" className={item}>
              Administration
            </Link>
          )}
          <form action={props.logoutAction}>
            <button role="menuitem" className={item}>
              Se déconnecter
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
