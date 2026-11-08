// Fils d'actualités du Stade Rennais (flux RSS en français, sans clé) : Bing Actualités (avec image et résumé),
// Google Actualités en secours.
// On n'affiche que le titre, la source, la date et le lien : l'article reste chez le média.

export interface NewsItem {
  title: string;
  link: string;
  source: string | null;
  date: Date | null;
  image: string | null; // image d'illustration fournie par le flux
  summary: string | null; // court résumé fourni par le flux (tronqué)
}

const decode = (s: string) =>
  s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "’")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .trim();

const tag = (block: string, name: string) => {
  const m = new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`).exec(block);
  return m ? decode(m[1]) : null;
};

const stripHtml = (s: string) => s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

/** Lien direct vers l'article (Bing fait passer les liens par une redirection « url=… »). */
function directLink(link: string): string {
  const m = /[?&]url=([^&]+)/.exec(link);
  if (m && /bing\.com/.test(link)) {
    try {
      return decodeURIComponent(m[1]);
    } catch {
      return link;
    }
  }
  return link;
}

/** Lecture d'un flux RSS : articles (doublons de titre retirés), du plus récent au plus ancien. */
export function parseRss(xml: string, max = 20): NewsItem[] {
  const items: NewsItem[] = [];
  const seen = new Set<string>();
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const block = m[1];
    const raw = tag(block, "title");
    const link = tag(block, "link");
    if (!raw || !link) continue;
    const source = tag(block, "source") ?? tag(block, "News:Source");
    // Google Actualités ajoute « - Source » à la fin du titre : on le retire (la source est affichée à part)
    const title = source && raw.endsWith(` - ${source}`) ? raw.slice(0, -(source.length + 3)) : raw;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const d = tag(block, "pubDate");
    const date = d ? new Date(d) : null;
    const image =
      tag(block, "News:Image") ??
      /<media:(?:content|thumbnail)[^>]*url="([^"]+)"/.exec(block)?.[1] ??
      /<enclosure[^>]*url="([^"]+)"[^>]*type="image/.exec(block)?.[1] ??
      null;
    const descr = tag(block, "description");
    const text = descr ? stripHtml(decode(descr)) : "";
    // Le résumé n'a d'intérêt que s'il dit autre chose que le titre (Google n'en fournit pas de vrai)
    const summary = text && !text.startsWith(title.slice(0, 30)) ? (text.length > 220 ? `${text.slice(0, 217).trimEnd()}…` : text) : null;
    items.push({
      title,
      link: directLink(link),
      source,
      date: date && !Number.isNaN(date.getTime()) ? date : null,
      image: image ? decode(image) : null,
      summary,
    });
  }
  return items.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)).slice(0, max);
}

const BING = "https://www.bing.com/news/search?q=%22Stade+Rennais%22&format=rss&setlang=fr&cc=fr";
const GOOGLE = `https://news.google.com/rss/search?q=${encodeURIComponent('"Stade Rennais" when:7d')}&hl=fr&gl=FR&ceid=FR:fr`;

async function read(url: string): Promise<NewsItem[]> {
  const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Actualités : HTTP ${res.status}`);
  return parseRss(await res.text());
}

/** Actualités du Stade Rennais (cache 30 min) : Bing (images et résumés), sinon Google Actualités. */
export async function fetchNews(): Promise<NewsItem[]> {
  const bing = await read(BING).catch(() => []);
  if (bing.length >= 3) return bing;
  return read(GOOGLE);
}
