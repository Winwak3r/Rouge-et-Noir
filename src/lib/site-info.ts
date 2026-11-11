// Textes du pied de page et des pages d'information.

export const CONTACT_EMAIL = process.env.CONTACT_EMAIL?.trim() || "pronos.rougeetnoir@gmail.com";
export const CONTACT_MAILTO = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("Rouge & Noir — bug ou amélioration")}`;

export const LEGAL_TEXT =
  "Rouge & Noir est un jeu de pronostics entre amis, gratuit et non officiel. Il n’est ni affilié, ni soutenu, ni sponsorisé par le Stade Rennais FC, la Ligue de Football Professionnel, l’UEFA ou la Fédération Française de Football. Les noms, logos et marques cités appartiennent à leurs propriétaires respectifs.";

export const PARTNERS: ReadonlyArray<readonly [string, string]> = [
  ["Calendrier, résultats, compositions et classements", "ESPN"],
  ["Cotes des buteurs et du match", "Bet365, via ESPN"],
  ["Actualités du club", "Presse locale, staderennais.com, L’Équipe, So Foot (via Bing et Google Actualités)"],
  ["Vidéo « Le lundi, c’est Rauzy »", "ICI Armorique (YouTube)"],
  ["Transferts officiels", "API-Football"],
  ["Photos des joueurs", "API-Football"],
  ["Hébergement", "Vercel"],
  ["Base de données", "Neon"],
];
