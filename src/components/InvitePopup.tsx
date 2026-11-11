"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** Bouton bleu « Inviter » : ouvre une fenêtre « Inviter des joueurs » (fond flouté et assombri, clic à côté pour fermer). */
export function InvitePopup({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="invite-blue-bg rounded-lg px-2.5 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90">
        Inviter
      </button>
      {mounted &&
        open &&
        createPortal(
          <div className="fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Inviter des joueurs"
              onClick={(e) => e.stopPropagation()}
              className="hub-fade-in w-full max-w-lg space-y-3 rounded-2xl bg-[var(--color-surface)] p-5 shadow-2xl"
            >
              <h2 className="font-display text-2xl font-bold uppercase tracking-wide invite-blue-text">Inviter des joueurs</h2>
              {children}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
