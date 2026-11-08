// Fils d'actualités du Stade Rennais (Google Actualités, flux RSS en français, sans clé).
// On n'affiche que le titre, la source, la date et le lien : l'article reste chez le média.

export interface NewsItem {
  title: string;
  link: string;
  source: string | null;
  date: Date | null;
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

/** Lecture d'un flux RSS : articles (doublons de titre retirés), du plus récent au plus ancien. */
export function parseRss(xml: string, max = 20): NewsItem[] {
  const items: NewsItem[] = [];
  const seen = new Set<string>();
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/g)) {
    const raw = tag(m[1], "title");
    const link = tag(m[1], "link");
    if (!raw || !link) continue;
    const source = tag(m[1], "source");
    // Google Actualités ajoute « - Source » à la fin du titre : on le retire (la source est affichée à part)
    const title = source && raw.endsWith(` - ${source}`) ? raw.slice(0, -(source.length + 3)) : raw;
    const key = title.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const d = tag(m[1], "pubDate");
    const date = d ? new Date(d) : null;
    items.push({ title, link, source, date: date && !Number.isNaN(date.getTime()) ? date : null });
  }
  return items.sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0)).slice(0, max);
}

const feed = (q: string) => `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=fr&gl=FR&ceid=FR:fr`;

/** Actualités (cache 30 min). */
export async function fetchNews(kind: "actus" | "transferts"): Promise<NewsItem[]> {
  const q = kind === "actus" ? '"Stade Rennais" when:7d' : '"Stade Rennais" (mercato OR transfert OR recrue OR prêt) when:30d';
  const res = await fetch(feed(q), { next: { revalidate: 1800 }, signal: AbortSignal.timeout(10_000) });
  if (!res.ok) throw new Error(`Actualités : HTTP ${res.status}`);
  return parseRss(await res.text());
}
