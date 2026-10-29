/**
 * Photo d'un joueur, par ordre de priorité :
 * 1) photo déposée par l'admin ; 2) photo officielle de la saison (API-Football) ;
 * 3) photo fournie avec l'effectif ESPN ; 4) adresse standard des photos ESPN.
 * Si aucune n'existe, la bulle affiche les initiales du joueur.
 */
export function playerPhotoUrl(p: {
  id?: string;
  photoUrl: string | null;
  externalId: number;
  officialPhotoUrl?: string | null;
  customPhotoAt?: Date | null;
}): string | null {
  if (p.customPhotoAt && p.id) return `/api/player-photo/${encodeURIComponent(p.id)}?v=${p.customPhotoAt.getTime()}`;
  if (p.officialPhotoUrl) return p.officialPhotoUrl;
  if (p.photoUrl) return p.photoUrl;
  return p.externalId > 0 ? `https://a.espncdn.com/i/headshots/soccer/players/full/${p.externalId}.png` : null;
}
