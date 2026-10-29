export const leagueImageUrl = (leagueId: string, at: number) => `/api/league-image/${encodeURIComponent(leagueId)}?v=${at}`;
