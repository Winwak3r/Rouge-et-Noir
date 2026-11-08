import { PlayerPhoto } from "./PlayerPhoto";
/**
 * Encart à la place de la photo du buteur :
 * - « unknown » : pas encore de buteur choisi → silhouette et point d'interrogation ;
 * - « none » : pari « Aucun buteur rennais » → silhouette plus foncée, barrée d'une diagonale rouge.
 */
export function ScorerPlaceholder({ mode, size = 112, caption = true }: { mode: "unknown" | "none"; size?: number; caption?: boolean }) {
  const none = mode === "none";
  // « Aucun buteur rennais » : le joueur rennais abattu, dans son badge
  if (none) {
    // Présenté comme la photo d'un joueur de l'équipe, avec le numéro 0
    return (
      <figure className="flex shrink-0 flex-col items-center gap-1 self-center" style={{ width: size }}>
        <PlayerPhoto name="Aucun buteur rennais" url="/brand/aucun-buteur.png" size={size} shape="card" number={0} />
        {caption && <figcaption className="text-center text-[11px] font-semibold leading-tight text-neutral-600">Aucun buteur rennais</figcaption>}
      </figure>
    );
  }
  return (
    <figure className="flex shrink-0 flex-col items-center gap-1 self-center" style={{ width: size }}>
      <div
        role="img"
        aria-label={none ? "Aucun buteur rennais" : "Buteur pas encore choisi"}
        className={`relative overflow-hidden rounded-xl ring-1 ${none ? "bg-neutral-700 ring-neutral-800" : "bg-neutral-200 ring-neutral-300"}`}
        style={{ width: size, height: size }}
      >
        {/* Silhouette */}
        <svg viewBox="0 0 100 100" className="absolute inset-0 h-full w-full" aria-hidden>
          <circle cx="50" cy="38" r="17" fill={none ? "#3f3f3f" : "#b5b5b5"} />
          <path d="M14 100c2-22 17-34 36-34s34 12 36 34z" fill={none ? "#3f3f3f" : "#b5b5b5"} />
        </svg>
        {none ? (
          // Barre rouge en diagonale
          <span aria-hidden className="absolute left-1/2 top-1/2 h-[7px] w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-45 bg-[#E53935] shadow" />
        ) : (
          <span aria-hidden className="absolute inset-0 grid place-items-center pb-3 font-display text-5xl font-bold text-white drop-shadow">
            ?
          </span>
        )}
      </div>
      {none && caption && <figcaption className="text-center text-[11px] font-semibold leading-tight text-neutral-600">Aucun buteur rennais</figcaption>}
    </figure>
  );
}
