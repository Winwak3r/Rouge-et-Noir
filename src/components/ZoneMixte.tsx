// Zone mixte : blocs partagés entre les pages (transferts, effectif, liens du club).
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { prisma } from "@/lib/db";
import { formatShortNumeric } from "@/lib/dates";
import { ageOn, nationalityFr } from "@/lib/nationality";
import { playerPhotoUrl } from "@/lib/player-photo";
import { transferTypeLabel, type TransferItem } from "@/lib/transfers";

const T = "font-display text-xl font-bold uppercase tracking-wide text-rouge sm:text-2xl";

export const CLUB_LINKS = {
  shop: process.env.CLUB_SHOP_URL || "https://boutique.staderennais.com",
  tickets: process.env.CLUB_TICKETS_URL || "https://billetterie.staderennais.com/fr/",
  site: "https://www.staderennais.com",
  women: process.env.CLUB_WOMEN_URL || "https://epreuves.fff.fr/competition/club/500015-st-rennais-f-c/equipe/2026_166_SEF_19/equipe",
  bouge: process.env.CLUB_BOUGE_URL || "https://bouge.staderennais.com/",
};

export function Transfers({ official }: { official: TransferItem[] | null }) {
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h2 className={T}>Mouvements officiels</h2>
        {!official ? (
          <p className="card text-sm text-neutral-600">Transferts officiels indisponibles pour le moment.</p>
        ) : official.length === 0 ? (
          <p className="card text-sm text-neutral-600">Aucun mouvement officiel récent.</p>
        ) : (
          <ul className="card divide-y divide-neutral-100 p-0">
            {official.map((t, i) => (
              <li key={i} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                <span
                  className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold text-white ${t.direction === "in" ? "bg-green-600" : "bg-rouge"}`}
                  title={t.direction === "in" ? "Arrivée" : "Départ"}
                >
                  {t.direction === "in" ? "↓" : "↑"}
                </span>
                <span className="min-w-0 flex-1">
                  <strong>{t.player}</strong>
                  <span className="block text-xs text-neutral-500">
                    {t.direction === "in" ? "Arrivée depuis" : "Départ vers"} {t.otherTeam.name}
                    {transferTypeLabel(t.type) ? ` · ${transferTypeLabel(t.type)}` : ""}
                  </span>
                </span>
                {t.otherTeam.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.otherTeam.logo} alt="" className="h-7 w-7 shrink-0 object-contain" />
                )}
                <span className="shrink-0 text-xs tabular-nums text-neutral-500">{formatShortNumeric(t.date)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

    </div>
  );
}

const LINES: Array<[string, string[]]> = [
  ["Gardiens", ["G", "GK"]],
  ["Défenseurs", ["D", "DF"]],
  ["Milieux", ["M", "MF"]],
  ["Attaquants", ["F", "FW"]],
];

export async function Squad() {
  const season = await prisma.season.findFirst({ where: { isCurrent: true }, select: { id: true } });
  if (!season) return <p className="card text-sm text-neutral-600">Effectif indisponible.</p>;
  const [players, goals] = await Promise.all([
    prisma.player.findMany({
      where: { seasonId: season.id, isActive: true },
      orderBy: [{ shirtNumber: "asc" }, { name: "asc" }],
      select: {
        id: true,
        name: true,
        position: true,
        shirtNumber: true,
        photoUrl: true,
        externalId: true,
        officialPhotoUrl: true,
        customPhotoAt: true,
        birthDate: true,
        nationality: true,
        flagUrl: true,
        homegrown: true,
      },
    }),
    prisma.matchGoal.groupBy({ by: ["playerId"], where: { forRennes: true, isOwnGoal: false, match: { seasonId: season.id } }, _count: { _all: true } }),
  ]);
  const goalsOf = new Map(goals.map((g) => [g.playerId, g._count._all]));
  const other = players.filter((p) => !LINES.some(([, codes]) => codes.includes(p.position ?? "")));
  const groups: Array<[string, typeof players]> = [...LINES.map(([label, codes]) => [label, players.filter((p) => codes.includes(p.position ?? ""))] as [string, typeof players]), ["Autres", other]];
  return (
    <div className="space-y-5">
      {groups
        .filter(([, list]) => list.length > 0)
        .map(([label, list]) => (
          <section key={label} className="space-y-2">
            <h2 className={T}>{label}</h2>
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {list.map((p) => (
                <li key={p.id} className="card flex items-center gap-3 p-3">
                  <PlayerPhoto name={p.name} url={playerPhotoUrl(p)} size={56} shape="card" number={p.shirtNumber} />
                  <span className="min-w-0 space-y-0.5">
                    {/* nom plus petit, sur deux lignes au besoin : jamais coupé */}
                    <span className="block text-[13px] font-semibold leading-tight [overflow-wrap:anywhere] sm:text-sm">{p.name}</span>
                    <span className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-600">
                      {ageOn(p.birthDate) != null && <span>{ageOn(p.birthDate)} ans</span>}
                      {p.nationality && (
                        <span className="inline-flex items-center gap-1">
                          {p.flagUrl && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.flagUrl} alt="" className="h-3 w-4 rounded-[2px] object-cover" />
                          )}
                          {nationalityFr(p.nationality)}
                        </span>
                      )}
                    </span>
                    {p.homegrown && (
                      <span className="inline-block rounded bg-rouge/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-rouge">
                        Formé au club
                      </span>
                    )}
                    {(goalsOf.get(p.id) ?? 0) > 0 && (
                      <span className="block text-xs text-neutral-500">
                        ⚽ {goalsOf.get(p.id)} but{(goalsOf.get(p.id) ?? 0) > 1 ? "s" : ""} cette saison
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}

/** Liens permanents de la zone mixte (au-dessus du pied de page). */
export function ClubLinks() {
  const items = [
    { title: "La boutique", text: "Maillots et produits officiels", href: CLUB_LINKS.shop, icon: "🛍️" },
    { title: "La billetterie", text: "Places pour les matchs au Roazhon Park", href: CLUB_LINKS.tickets, icon: "🎟️" },
    { title: "Le site officiel", text: "staderennais.com", href: CLUB_LINKS.site, icon: "🔴" },
  ];
  return (
    <ul className="grid gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <li key={it.title}>
          <a href={it.href} target="_blank" rel="noopener noreferrer" className="card flex h-full items-center gap-3 p-3 transition-colors hover:border-rouge">
            <span aria-hidden className="text-2xl">
              {it.icon}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block font-display text-lg font-bold uppercase leading-tight tracking-wide text-rouge">{it.title}</span>
              <span className="block text-xs text-neutral-600">{it.text}</span>
            </span>
            <span aria-hidden className="text-neutral-400">
              ↗
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
