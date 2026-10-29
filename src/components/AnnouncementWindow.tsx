"use client";

import { useState } from "react";
import { Logo } from "./Logo";
import { PushToggle } from "./PushToggle";

/** Fenêtre du message de l'organisateur, une fois par appareil (« J'ai compris » pose un cookie). */
export function AnnouncementWindow(props: {
  userId: string;
  version: number;
  title: string;
  body: string;
  askNotifications: boolean;
  publicKey: string | null;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const close = () => {
    document.cookie = `announce_${props.userId}=${props.version}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    setOpen(false);
  };
  return (
    <div role="dialog" aria-modal="true" aria-label={props.title || "Message de l’organisateur"} className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md space-y-4 rounded-2xl border border-neutral-200 bg-surface p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <Logo className="h-10 w-10" />
          <h2 className="font-display text-2xl font-bold uppercase tracking-wide">{props.title}</h2>
        </div>
        {props.body && <p className="whitespace-pre-line text-sm text-neutral-700">{props.body}</p>}
        {props.askNotifications && <PushToggle publicKey={props.publicKey} compact />}
        <div className="flex justify-end">
          <button type="button" onClick={close} className="btn-primary">
            J’ai compris
          </button>
        </div>
      </div>
    </div>
  );
}
