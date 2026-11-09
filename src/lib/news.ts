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

// Sources retenues : presse locale et site officiel du club (fiables, peu nombreuses)
export const NEWS_SITES = ["staderennais.com", "ouest-france.fr", "letelegramme.fr", "rennes.maville.com", "actu.fr", "20minutes.fr"];
const SITE_Q = `"Stade Rennais" (${NEWS_SITES.map((d) => `site:${d}`).join(" OR ")})`;
const BING = `https://www.bing.com/news/search?q=${encodeURIComponent(SITE_Q)}&format=rss&setlang=fr&cc=fr`;
const GOOGLE = `https://news.google.com/rss/search?q=${encodeURIComponent(`${SITE_Q} when:14d`)}&hl=fr&gl=FR&ceid=FR:fr`;

/** Article d'une des sources retenues ? (Google renvoie un lien intermédiaire : on se fie alors au nom du média) */
export function isTrustedSource(item: Pick<NewsItem, "link" | "source">): boolean {
  let host = "";
  try {
    host = new URL(item.link).hostname.replace(/^www\./, "");
  } catch {
    return false;
  }
  if (NEWS_SITES.some((d) => host === d || host.endsWith(`.${d}`))) return true;
  return /ouest-france|t[ée]l[ée]gramme|stade rennais|maville|actu\.fr|20 ?minutes/i.test(item.source ?? "");
}

/** Image d'aperçu de l'article (balise og:image de la page du média), mise en cache un jour. */
export function ogImage(html: string): string | null {
  const m =
    /<meta[^>]+property=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i.exec(html) ??
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image(?::url)?["']/i.exec(html) ??
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i.exec(html);
  return m ? decode(m[1]) : null;
}

async function pageImage(url: string): Promise<string | null> {
  if (/news\.google\.com/.test(url)) return null;
  try {
    const res = await fetch(url, { next: { revalidate: 86400 }, signal: AbortSignal.timeout(5000), headers: { "User-Agent": "Mozilla/5.0" } });
    if (!res.ok) return null;
    const html = (await res.text()).slice(0, 300_000); // l'en-tête de la page suffit
    return ogImage(html);
  } catch {
    return null;
  }
}

async function read(url: string): Promise<NewsItem[]> {
  const res = await fetch(url, { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000), headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`Actualités : HTTP ${res.status}`);
  return parseRss(await res.text()).filter(isTrustedSource);
}

/** Actualités du Stade Rennais (cache 30 min), avec l'image d'aperçu de chaque article. */
export async function fetchNews(): Promise<NewsItem[]> {
  const bing = await read(BING).catch(() => []);
  const items = (bing.length >= 3 ? bing : await read(GOOGLE)).slice(0, 15);
  // Image d'aperçu prise sur la page de l'article (plus fiable que les vignettes des agrégateurs)
  const images = await Promise.all(items.map((n) => pageImage(n.link)));
  return items.map((n, i) => ({ ...n, image: images[i] ?? n.image }));
}
