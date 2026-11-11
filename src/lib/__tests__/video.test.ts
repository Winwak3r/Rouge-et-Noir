import { describe, expect, it } from "vitest";
import { parseYoutubeFeed } from "../video";

describe("Le lundi, c'est Rauzy : dernier épisode", () => {
  it("identifiant, titre et date du premier épisode du flux", () => {
    const xml = `<feed><entry><yt:videoId>abc123XYZ</yt:videoId><title>Le STADE RENNAIS rechute à NICE avant l&#39;Europe !</title>
      <published>2026-11-02T18:30:00+00:00</published></entry><entry><yt:videoId>old</yt:videoId><title>Ancien</title></entry></feed>`;
    const v = parseYoutubeFeed(xml);
    expect(v?.id).toBe("abc123XYZ");
    expect(v?.title).toBe("Le STADE RENNAIS rechute à NICE avant l’Europe !");
    expect(v?.date?.toISOString()).toBe("2026-11-02T18:30:00.000Z");
    expect(parseYoutubeFeed("<feed></feed>")).toBeNull();
  });
});
