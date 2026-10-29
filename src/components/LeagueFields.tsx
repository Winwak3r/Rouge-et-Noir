"use client";

import { useState } from "react";
import { COMPETITIONS, type CompetitionCode } from "@/lib/competitions";
import { CompetitionBadge } from "./CompetitionBadge";

const MAX = 120;
const CODES: CompetitionCode[] = ["LIGUE_1", "EUROPA_LEAGUE", "COUPE_DE_FRANCE"];

/** Phrase de description (120 caractères au plus, compteur en direct). */
export function DescriptionField({ defaultValue = "" }: { defaultValue?: string }) {
  const [v, setV] = useState(defaultValue);
  return (
    <label className="block text-sm">
      <span className="label">
        Description <span className="font-normal text-neutral-500">(facultatif)</span>
      </span>
      <input
        name="description"
        value={v}
        onChange={(e) => setV(e.target.value.slice(0, MAX))}
        maxLength={MAX}
        className="input"
        placeholder="Ex. Rejoins le groupe de l’association « Bouge ta classe ! » du SRFC"
      />
      <span className={`mt-1 block text-right text-xs ${v.length >= MAX ? "text-orange-700" : "text-neutral-500"}`}>
        {v.length}/{MAX}
      </span>
    </label>
  );
}

/** Compétitions jouées dans la ligue (au moins une). */
export function CompetitionsField({ defaultValue = CODES, logos = {} }: { defaultValue?: string[]; logos?: Partial<Record<CompetitionCode, string>> }) {
  const [checked, setChecked] = useState<string[]>(defaultValue);
  return (
    <fieldset className="text-sm">
      <legend className="label">Compétitions jouées</legend>
      <div className="flex flex-wrap gap-2">
        {CODES.map((code) => {
          const on = checked.includes(code);
          return (
            <label
              key={code}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-2.5 py-1.5 transition-colors ${
                on ? "border-noir bg-neutral-50 font-semibold" : "border-neutral-300 text-neutral-500"
              }`}
            >
              <input
                type="checkbox"
                name="competitions"
                value={code}
                checked={on}
                onChange={(e) => setChecked((c) => (e.target.checked ? [...c, code] : c.filter((x) => x !== code)))}
                className="sr-only"
              />
              <CompetitionBadge code={code} logo={logos[code]} />
              {COMPETITIONS[code].label}
              <span aria-hidden className={on ? "text-rouge" : "text-transparent"}>✓</span>
            </label>
          );
        })}
      </div>
      {checked.length === 0 && <p className="mt-1 text-xs text-orange-700">Coche au moins une compétition.</p>}
      <p className="mt-1 text-xs text-neutral-500">Seuls les matchs de ces compétitions comptent dans le classement de la ligue.</p>
    </fieldset>
  );
}
