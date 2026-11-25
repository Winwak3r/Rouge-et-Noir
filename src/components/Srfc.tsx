import { Fragment, type ReactNode } from "react";

/** « Stade Rennais » sur téléphone, « Stade Rennais F.C. » sur ordinateur. */
export function Srfc() {
  return (
    <>
      Stade Rennais<span className="max-sm:hidden"> F.C.</span>
    </>
  );
}

/** Remplace chaque « Stade Rennais » (ou « Stade Rennais FC ») d'un texte par <Srfc />. */
export function srfcText(text: string): ReactNode {
  const parts = text.split(/Stade Rennais(?: F\.?C\.?)?/);
  if (parts.length === 1) return text;
  return parts.map((p, i) => (
    <Fragment key={i}>
      {i > 0 && <Srfc />}
      {p}
    </Fragment>
  ));
}
