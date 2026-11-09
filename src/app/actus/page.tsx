import type { Metadata } from "next";
import { OfficialStandings } from "@/components/OfficialStandings";
import { PageTabs } from "@/components/PageTabs";
import { PlayerPhoto } from "@/components/PlayerPhoto";
import { prisma } from "@/lib/db";
import { formatShortNumeric } from "@/lib/dates";
import { fetchNews, type NewsItem } from "@/lib/news";
import { playerPhotoUrl } from "@/lib/player-photo";
import { ageOn, nationalityFr } from "@/lib/nationality";
import { fetchOfficialTransfers, transferTypeLabel, type TransferItem } from "@/lib/transfers";
import { PageTitle } from "@/components/PageTitle";

export const metadata: Metadata = { title: "La zone mixte" };
export const revalidate = 600;

// Billetterie officielle du club (accès depuis le site du club)
const TICKETS_URL = process.env.CLUB_TICKETS_URL || "https://billetterie.staderennais.com/fr/";
const SHOP_URL = process.env.CLUB_SHOP_URL || "https://boutique.staderennais.com";
// Pages du site officiel (adresses exactes réglables sans toucher au code)
const WOMEN_URL = process.env.CLUB_WOMEN_URL || "https://www.staderennais.com";
const BOUGE_URL = process.env.CLUB_BOUGE_URL || "https://www.staderennais.com";
const T = "font-display text-xl font-bold uppercase tracking-wide text-rouge sm:text-2xl";
const ago = (d: Date | null) => {
  if (!d) return "";
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 60) return `il y a ${Math.max(1, min)} min`;
  if (min < 24 * 60) return `il y a ${Math.round(min / 60)} h`;
  return formatShortNumeric(d);
};

function NewsList({ items, empty }: { items: NewsItem[] | null; empty: string }) {
  if (!items) return <p className="card text-sm text-neutral-600">Fil indisponible pour le moment.</p>;
  if (items.length === 0) return <p className="card text-sm text-neutral-600">{empty}</p>;
  return (
    <ul className="space-y-3">
      {items.map((n) => (
        <li key={n.link}>
          <a href={n.link} target="_blank" rel="noopener noreferrer" className="card flex flex-col gap-3 p-3 transition-colors hover:border-neutral-400 sm:flex-row sm:gap-4">
            {n.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={n.image} alt="" loading="lazy" referrerPolicy="no-referrer" className="aspect-video w-full shrink-0 rounded-lg bg-neutral-100 object-cover sm:aspect-auto sm:h-24 sm:w-36" />
            ) : (
              <span aria-hidden className="hidden h-24 w-36 shrink-0 place-items-center rounded-lg bg-neutral-100 text-2xl sm:grid">
                📰
              </span>
            )}
            <span className="min-w-0">
              <span className="block font-semibold leading-snug">{n.title}</span>
              {n.summary && <span className="mt-1 line-clamp-2 block text-sm text-neutral-600">{n.summary}</span>}
              <span className="mt-1 block text-xs text-neutral-500">
                {n.source}
                {n.source && n.date ? " · " : ""}
                {ago(n.date)} ↗
              </span>
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}

function Transfers({ official }: { official: TransferItem[] | null }) {
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

async function Squad() {
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

/** « Voir plus… » : blocs en grille 2 × 2. */
function MoreLinks() {
  const items: Array<{ title: string; text: string; href: string; external: boolean; icon: string }> = [
    { title: "Effectif pro", text: "Joueurs, âges, nationalités, formés au club", href: "/actus?onglet=effectif", external: false, icon: "👕" },
    { title: "Féminines", text: "L’équipe féminine, sur le site officiel", href: WOMEN_URL, external: true, icon: "⚽" },
    { title: "Bouge !", text: "Le programme sport-santé du Stade Rennais", href: BOUGE_URL, external: true, icon: "🏃" },
    { title: "Boutique officielle", text: "Maillots et produits officiels", href: SHOP_URL, external: true, icon: "🛍️" },
    { title: "Billetterie", text: "Places pour les matchs au Roazhon Park", href: TICKETS_URL, external: true, icon: "🎟️" },
  ];
  return (
    <ul className="grid grid-cols-2 gap-3">
      {items.map((it) => (
        <li key={it.title}>
          <a
            href={it.href}
            {...(it.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
            className="card flex h-full flex-col gap-1 p-4 transition-colors hover:border-rouge"
          >
            <span aria-hidden className="text-2xl">
              {it.icon}
            </span>
            <span className="font-display text-lg font-bold uppercase tracking-wide text-rouge">
              {it.title} {it.external && <span aria-hidden className="text-sm">↗</span>}
            </span>
            <span className="text-xs text-neutral-600">{it.text}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

export default async function ActusPage({ searchParams }: { searchParams: Promise<{ onglet?: string }> }) {
  const { onglet } = await searchParams;
  const [news, official] = await Promise.all([fetchNews().catch(() => null), fetchOfficialTransfers().catch(() => null)]);
  return (
    <div className="space-y-6">
      <PageTitle className="font-display text-4xl font-bold uppercase tracking-wide text-rouge sm:text-5xl">La zone mixte</PageTitle>
      <PageTabs
        initial={onglet}
        tabs={[
          { key: "actus", label: "Actus", content: <NewsList items={news} empty="Pas d’actualité sur le Stade Rennais cette semaine." /> },
          { key: "classements", label: "Classements", content: <OfficialStandings /> },
          { key: "transferts", label: "Transfert", content: <Transfers official={official} /> },
          { key: "plus", label: "Voir plus…", content: <MoreLinks /> },
          // Atteint depuis « Voir plus… » (absent de la barre d'onglets)
          {
            key: "effectif",
            label: "Effectif pro",
            hidden: true,
            content: (
              <div className="space-y-3">
                <a href="/actus?onglet=plus" className="inline-flex items-center gap-1 text-sm font-semibold text-neutral-600 hover:text-rouge">
                  ‹ Voir plus…
                </a>
                <Squad />
              </div>
            ),
          },
        ]}
      />
      <p className="text-xs text-neutral-500">
        Actualités : Bing et Google Actualités (les articles s’ouvrent sur le site de leur média). Transferts officiels : API-Football. Classements :
        ESPN.
      </p>
    </div>
  );
}
