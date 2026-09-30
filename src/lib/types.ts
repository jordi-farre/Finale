export type ShowStatus = 'returning' | 'in-production' | 'planned' | 'ended' | 'cancelled' | 'unknown';

export type SeasonState =
  | {
      kind: 'complete';
      seasonNumber: number;
      episodeCount: number;
      runtimeMinutes: number | null;
      completedOn: string | null;
    }
  | {
      kind: 'airing';
      seasonNumber: number;
      airedCount: number;
      episodeCount: number | null;
      finaleDate: string | null;
    }
  | { kind: 'upcoming'; seasonNumber: number; premiereDate: string | null }
  | { kind: 'none' };

export type ShowSnapshot = {
  id: number;
  name: string;
  posterPath: string | null;
  firstAirYear: string | null;
  overview: string;
  status: ShowStatus;
  seasonCount: number;
  latestSeason: SeasonState;
  fetchedAt: string;
};

export type FollowedShow = {
  id: number;
  followedAt: string;
  snapshot: ShowSnapshot;
};

export type PersistedState = {
  version: 1;
  shows: FollowedShow[];
};

export const EMPTY_STATE: PersistedState = { version: 1, shows: [] };
