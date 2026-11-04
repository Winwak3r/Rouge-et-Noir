import { shortPlayerName } from "@/lib/player-name";

/** Nom d'un joueur : « V. Rongier » sur mobile, « Valentin Rongier » ailleurs. */
export function PlayerName({ name, className = "" }: { name: string; className?: string }) {
  const short = shortPlayerName(name);
  if (short === name) return <span className={className}>{name}</span>;
  return (
    <span className={className} title={name}>
      <span className="sm:hidden">{short}</span>
      <span className="hidden sm:inline">{name}</span>
    </span>
  );
}
