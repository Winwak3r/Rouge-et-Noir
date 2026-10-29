import { hueOf, initials } from "@/lib/avatar";
import { leagueImageUrl } from "@/lib/league-url";

/** Image de la ligue, ou ses initiales sur une couleur propre à son nom. */
export function LeagueAvatar(props: { leagueId: string; name: string; at: number | null; size?: number; className?: string }) {
  const size = props.size ?? 32;
  if (props.at) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={leagueImageUrl(props.leagueId, props.at)}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-lg object-cover ring-1 ring-neutral-300 ${props.className ?? ""}`}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className={`inline-grid shrink-0 place-items-center rounded-lg font-bold text-white ring-1 ring-neutral-300 ${props.className ?? ""}`}
      style={{ width: size, height: size, fontSize: Math.max(10, Math.round(size * 0.38)), background: `hsl(${hueOf(props.name)} 50% 35%)` }}
    >
      {initials(props.name)}
    </span>
  );
}
