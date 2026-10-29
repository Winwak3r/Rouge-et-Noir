"use client";

import { useState } from "react";
import { dismissWelcomeAction } from "@/app/actions/leagues";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import { CompetitionBadge } from "./CompetitionBadge";
import { LeagueAvatar } from "./LeagueAvatar";

/** Fenêtre affichée juste après avoir rejoint une ligue (code ou lien d'invitation). */
export function LeagueWelcome(props: {
  league: { id: string; name: string; description: string | null; imageAt: number | null; players: number; competitions: CompetitionCode[] };
  logos: Partial<Record<CompetitionCode, string>>;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;
  const close = () => {
    setOpen(false);
    void dismissWelcomeAction();
  };
  const l = props.league;
  return (
    <div role="dialog" aria-modal="true" aria-label={`Bienvenue dans la ligue ${l.name}`} className="fixed inset-0 z-[95] flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-sm space-y-4 rounded-2xl border border-neutral-200 bg-surface p-6 text-center shadow-2xl">
        <p className="font-display text-2xl font-bold uppercase tracking-wide text-rouge">Bienvenue dans la ligue</p>
        <div className="flex items-center justify-center gap-3">
          <LeagueAvatar leagueId={l.id} name={l.name} at={l.imageAt} size={56} />
          <p className="min-w-0 text-left font-display text-2xl font-bold uppercase leading-tight">{l.name}</p>
        </div>
        {l.description && <p className="text-sm italic text-neutral-700">{l.description}</p>}
        <div className="space-y-2 border-t border-neutral-200 pt-3 text-sm text-neutral-600">
          <p>
            <strong className="text-noir">{l.players}</strong> joueur{l.players > 1 ? "s" : ""} inscrit{l.players > 1 ? "s" : ""}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <span>Compétitions jouées :</span>
            {l.competitions.map((c) => (
              <span key={c} title={COMPETITIONS[c].label} className="inline-flex items-center">
                <CompetitionBadge code={c} logo={props.logos[c]} size="md" />
                <span className="sr-only">{COMPETITIONS[c].label}</span>
              </span>
            ))}
          </div>
        </div>
        <button type="button" onClick={close} className="btn-primary w-full">
          C’est parti !
        </button>
      </div>
    </div>
  );
}
