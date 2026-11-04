import type { ReactNode } from "react";

/**
 * Recréé à chaque changement de page (contrairement au layout) : la nouvelle page apparaît
 * avec un léger fondu, notamment en passant d'un onglet à l'autre de la barre du bas.
 */
export default function Template({ children }: { children: ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
