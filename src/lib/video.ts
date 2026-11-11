// « Le lundi, c'est Rauzy » (ICI Armorique) : dernier épisode de la playlist YouTube, lu avec le lecteur officiel.

export const RAUZY_PLAYLIST = "PLA1RA9WU9jT9P3FXztCWQqgoELod81pAg";

export interface VideoItem {
  id: string; // identifiant YouTube
  title: string;
  date: Date | null;
}

/** Dernier épisode d'un flux YouTube (Atom) : identifiant, titre et date. */
export function parseYoutubeFeed(xml: string): VideoItem | null {
  const entry = /<entry>([\s\S]*?)<\/entry>/.exec(xml)?.[1];
  if (!entry) return null;
  const id = /<yt:videoId>([^<]+)<\/yt:videoId>/.exec(entry)?.[1];
  const title = /<title>([^<]+)<\/title>/.exec(entry)?.[1];
  if (!id || !title) return null;
  const d = /<published>([^<]+)<\/published>/.exec(entry)?.[1];
  const date = d ? new Date(d) : null;
  const clean = title.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "’").trim();
  return { id, title: clean, date: date && !Number.isNaN(date.getTime()) ? date : null };
}

/** Dernier épisode (cache 30 min) ; null si YouTube ne répond pas (la playlist entière sera alors proposée). */
export async function fetchRauzyLatest(): Promise<VideoItem | null> {
  try {
    const res = await fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${RAUZY_PLAYLIST}`, {
      next: { revalidate: 1800 },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return parseYoutubeFeed(await res.text());
  } catch {
    return null;
  }
}
