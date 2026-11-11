// Données FICTIVES aux formats Google Actualités et API-Football.
import { describe, expect, it } from "vitest";
import { isTrustedSource, ogImage, parseRss } from "../news";
import { parseTransfers, transferTypeLabel } from "../transfers";

describe("Fil d'actualités (RSS)", () => {
  const xml = `<rss><channel>
    <item><title>Rennes s&#39;impose à Lorient - Ouest-France</title><link>https://ex.fr/a</link><pubDate>Sat, 07 Nov 2026 18:00:00 GMT</pubDate><source url="https://ouest-france.fr">Ouest-France</source></item>
    <item><title><![CDATA[Le mercato rennais s'accélère - L'Équipe]]></title><link>https://ex.fr/b</link><pubDate>Sun, 08 Nov 2026 09:00:00 GMT</pubDate><source url="https://lequipe.fr">L'Équipe</source></item>
    <item><title>Rennes s&#39;impose à Lorient - Ouest-France</title><link>https://ex.fr/c</link><pubDate>Sat, 07 Nov 2026 17:00:00 GMT</pubDate><source url="https://ouest-france.fr">Ouest-France</source></item>
  </channel></rss>`;
  it("titre sans la source, doublons retirés, plus récent d'abord", () => {
    const items = parseRss(xml);
    expect(items.map((i) => i.title)).toEqual(["Le mercato rennais s'accélère", "Rennes s’impose à Lorient"]);
    expect(items[0]).toMatchObject({ link: "https://ex.fr/b", source: "L'Équipe" });
  });
});

describe("Fil d'actualités : image et résumé (Bing)", () => {
  const xml = `<rss xmlns:News="https://www.bing.com/news/search?q=&amp;format=rss"><channel>
    <item><title>Rennes prépare le derby</title><link>http://www.bing.com/news/apiclick.aspx?ref=FexRss&amp;url=https%3a%2f%2fwww.ouest-france.fr%2fsport%2fa.html&amp;c=1</link>
    <description>Les Rouge et Noir affrontent Lorient dimanche avec un groupe au complet.</description><pubDate>Sun, 08 Nov 2026 09:00:00 GMT</pubDate>
    <News:Source>Ouest-France</News:Source><News:Image>https://www.bing.com/th?id=OVFT.abc&amp;pid=News</News:Image></item>
  </channel></rss>`;
  it("lien direct vers l'article, image et résumé", () => {
    const [n] = parseRss(xml);
    expect(n).toMatchObject({
      link: "https://www.ouest-france.fr/sport/a.html",
      source: "Ouest-France",
      image: "https://www.bing.com/th?id=OVFT.abc&pid=News",
      summary: "Les Rouge et Noir affrontent Lorient dimanche avec un groupe au complet.",
    });
  });
});

describe("Transferts officiels", () => {
  const json = {
    response: [
      {
        player: { name: "B. Dia" },
        transfers: [
          { date: "2026-08-01", type: "€ 12M", teams: { in: { id: 94, name: "Rennes" }, out: { id: 1, name: "Salernitana", logo: "s.png" } } },
          { date: "2019-07-01", type: "Free", teams: { in: { id: 2, name: "Reims" }, out: { id: 3, name: "Jura Sud" } } },
        ],
      },
      { player: { name: "K. Jota" }, transfers: [{ date: "2026-09-01", type: "Loan", teams: { in: { id: 4, name: "Lorient" }, out: { id: 94, name: "Rennes" } } }] },
    ],
  };
  it("arrivées et départs du club depuis la date donnée", () => {
    const t = parseTransfers(json, 94, new Date("2025-07-01"));
    expect(t.map((x) => `${x.player} ${x.direction} ${x.otherTeam.name}`)).toEqual(["K. Jota out Lorient", "B. Dia in Salernitana"]);
    expect(transferTypeLabel("Loan")).toBe("Prêt");
    expect(transferTypeLabel("Free")).toBe("Libre");
  });
});

describe("Actualités : sources fiables et image d'aperçu", () => {
  it("presse locale et site du club retenus, le reste écarté", () => {
    expect(isTrustedSource({ link: "https://www.ouest-france.fr/sport/a.html", source: null })).toBe(true);
    expect(isTrustedSource({ link: "https://www.staderennais.com/actualites/x", source: null })).toBe(true);
    expect(isTrustedSource({ link: "https://news.google.com/rss/articles/abc", source: "Le Télégramme" })).toBe(true);
    expect(isTrustedSource({ link: "https://www.lequipe.fr/Football/Actualites/x", source: null })).toBe(true);
    expect(isTrustedSource({ link: "https://www.sofoot.com/articles/x", source: null })).toBe(true);
    expect(isTrustedSource({ link: "https://news.google.com/rss/articles/abc", source: "L'Équipe" })).toBe(true);
    expect(isTrustedSource({ link: "https://www.site-de-rumeurs.com/a", source: "Rumeurs Foot" })).toBe(false);
  });
  it("image og:image lue dans la page de l'article", () => {
    expect(ogImage('<head><meta property="og:image" content="https://img.ouest-france.fr/a.jpg"></head>')).toBe("https://img.ouest-france.fr/a.jpg");
    expect(ogImage('<meta content="https://x.fr/b.jpg" property="og:image" />')).toBe("https://x.fr/b.jpg");
    expect(ogImage("<head></head>")).toBeNull();
  });
});
