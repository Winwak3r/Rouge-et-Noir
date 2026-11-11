import type { Metadata } from "next";
import { PageTabs } from "@/components/PageTabs";
import { formatShortNumeric } from "@/lib/dates";
import { fetchNews, type NewsItem } from "@/lib/news";
import { RAUZY_PLAYLIST, fetchRauzyLatest, type VideoItem } from "@/lib/video";
import { PageTitle } from "@/components/PageTitle";
import { CLUB_LINKS, ClubLinks } from "@/components/ZoneMixte";

export const metadata: Metadata = { title: "La zone mixte" };
export const revalidate = 600;

const ago = (d: Date | null) => {
  if (!d) return "";
  const min = Math.round((Date.now() - d.getTime()) / 60000);
  if (min < 60) return `il y a ${Math.max(1, min)} min`;
  if (min < 24 * 60) return `il y a ${Math.round(min / 60)} h`;
  return formatShortNumeric(d);
};

/** « Le lundi, c'est Rauzy » (ICI Armorique) : le lecteur vidéo à la place de la vignette. */
function RauzyCard({ video }: { video: VideoItem | null }) {
  // Dernier épisode ; à défaut, la playlist complète
  const src = video
    ? `https://www.youtube-nocookie.com/embed/${video.id}?rel=0`
    : `https://www.youtube-nocookie.com/embed/videoseries?list=${RAUZY_PLAYLIST}&rel=0`;
  return (
    <li className="card flex flex-col gap-3 p-3 sm:flex-row sm:gap-4">
      <div className="aspect-video w-full shrink-0 overflow-hidden rounded-lg bg-black sm:w-80">
        <iframe
          src={src}
          title={video ? video.title : "Le lundi, c'est Rauzy"}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          className="h-full w-full"
        />
      </div>
      <span className="min-w-0">
        <span className="mb-1 inline-block rounded bg-rouge px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Vidéo · Le lundi, c’est Rauzy</span>
        <span className="block font-semibold leading-snug">{video ? video.title : "Tous les épisodes de l’émission"}</span>
        <span className="mt-1 block text-sm text-neutral-600">
          Chaque lundi, François Rauzy débriefe l’actualité du Stade Rennais avec des supporters et d’anciens joueurs.
        </span>
        <span className="mt-1 block text-xs text-neutral-500">
          ICI Armorique{video?.date ? ` · ${ago(video.date)}` : ""}
        </span>
      </span>
    </li>
  );
}

function NewsList({ items, empty, video }: { items: NewsItem[] | null; empty: string; video?: VideoItem | null }) {
  if (!items) return <p className="card text-sm text-neutral-600">Fil indisponible pour le moment.</p>;
  if (items.length === 0 && video === undefined) return <p className="card text-sm text-neutral-600">{empty}</p>;
  return (
    <ul className="space-y-3">
      {video !== undefined && <RauzyCard video={video} />}
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

export default async function ActusPage() {
  const [news, rauzy] = await Promise.all([fetchNews().catch(() => null), fetchRauzyLatest()]);
  return (
    <div className="space-y-6">
      <PageTitle className="font-display text-4xl font-bold uppercase tracking-wide text-rouge sm:text-5xl">La zone mixte</PageTitle>
      <PageTabs
        initial="actus"
        tabs={[
          { key: "actus", label: "Actus", content: <NewsList items={news} video={rauzy} empty="Pas d’actualité sur le Stade Rennais cette semaine." /> },
          { key: "pro", label: "Équipe Pro", href: "/actus/equipe-pro", content: null },
          { key: "fem", label: "Équipe Féminine", shortLabel: "Féminine", href: CLUB_LINKS.women, external: true, content: null },
          { key: "bouge", label: "Bouge !", href: CLUB_LINKS.bouge, external: true, content: null },
        ]}
      />
      <ClubLinks />
      <p className="text-xs text-neutral-500">
        Actualités : presse locale, site du club, L’Équipe et So Foot, via Bing et Google Actualités (les articles s’ouvrent sur le site de leur
        média). Vidéo : « Le lundi, c’est Rauzy », ICI Armorique (YouTube).
      </p>
    </div>
  );
}
