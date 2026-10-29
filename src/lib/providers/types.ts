// Contrat commun à tous les fournisseurs de données (ESPN aujourd'hui, API-Football demain…).
import type { CompetitionCode } from "@/lib/competitions";
import type { MatchStatus } from "@/lib/scoring/engine";

export interface ProviderTeam {
  externalId: number;
  name: string;
  shortName: string | null;
  logoUrl: string | null;
}

export interface ProviderMatch {
  externalId: number;
  competition: CompetitionCode;
  matchday: number | null;
  stage: string | null; // libellé français : « Phase de ligue », « 32e de finale »…
  isKnockout: boolean;
  kickoffAt: Date;
  status: MatchStatus;
  home: ProviderTeam;
  away: ProviderTeam;
  homeScore: number | null; // score courant (direct ou final)
  awayScore: number | null;
}

export interface ProviderGoal {
  key: string; // identifiant stable du but (idempotence)
  teamExternalId: number | null; // équipe créditée du but
  playerExternalId: number | null;
  playerName: string;
  minute: number | null;
  extraMinute: number | null;
  period: number | null; // 1-2 temps réglementaire, 3-4 prolongation, 5 tirs au but
  isOwnGoal: boolean;
  isPenalty: boolean;
  isShootout: boolean;
}

export interface ProviderCard {
  key: string;
  teamExternalId: number | null; // équipe du joueur exclu
  playerName: string;
  minute: number | null;
  extraMinute: number | null;
  secondYellow: boolean;
}

export interface ProviderOdds {
  playerName: string;
  decimal: number;
}

export interface ProviderLineupPlayer {
  externalId: number;
  name: string;
  starter: boolean;
  position: string | null;
  shirtNumber: number | null;
}

export interface ProviderMatchDetail {
  status: MatchStatus;
  minute: number | null;
  homeScore: number | null; // score final, prolongation comprise
  awayScore: number | null;
  regulation: { home: number; away: number } | null;
  afterExtraTime: { home: number; away: number } | null;
  penalties: { home: number; away: number } | null;
  goals: ProviderGoal[];
  redCards: ProviderCard[];
  scorerOdds: ProviderOdds[]; // cotes « buteur à tout moment » avant-match
  /** Feuilles de match par équipe (identifiant fournisseur) ; vide tant qu'elles ne sont pas publiées. */
  lineups: Record<number, ProviderLineupPlayer[]>;
}

export interface ProviderPlayer {
  externalId: number;
  name: string;
  position: string | null;
  shirtNumber: number | null;
  photoUrl: string | null;
}

export interface FootballProvider {
  readonly name: string;
  readonly teamExternalId: number;
  listMatches(seasonStartYear: number): Promise<ProviderMatch[]>;
  getMatchDetail(match: { externalId: number; competition: CompetitionCode }): Promise<ProviderMatchDetail>;
  getSquad(): Promise<ProviderPlayer[]>;
  /** Logos des compétitions (adresse d'image), si le fournisseur les propose. */
  getLeagueLogos(): Promise<Partial<Record<CompetitionCode, string>>>;
  requestCount(): number;
  /** Erreurs non bloquantes de la dernière opération (une compétition injoignable…). */
  warnings(): string[];
}
