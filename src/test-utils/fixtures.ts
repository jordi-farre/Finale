import type { TmdbSeasonDetails, TmdbShowDetails } from '@/lib/tmdb';
import { mergeNotified } from '@/lib/alerts';
import type { FollowedShow, SeasonInfo, ShowSnapshot } from '@/lib/types';

export function showDetails(overrides: Partial<TmdbShowDetails> = {}): TmdbShowDetails {
  return {
    id: 1,
    name: 'Severance',
    status: 'Returning Series',
    first_air_date: '2022-02-18',
    poster_path: '/poster.jpg',
    overview: 'Office workers with split memories.',
    number_of_seasons: 2,
    episode_run_time: [50],
    seasons: [
      { season_number: 0, episode_count: 3, air_date: null, name: 'Specials' },
      { season_number: 1, episode_count: 9, air_date: '2022-02-18', name: 'Season 1' },
      { season_number: 2, episode_count: 10, air_date: '2025-01-17', name: 'Season 2' },
    ],
    last_episode_to_air: { season_number: 2, episode_number: 10, air_date: '2025-03-21' },
    next_episode_to_air: null,
    ...overrides,
  };
}

export function seasonDetails(seasonNumber: number, airDates: (string | null)[], runtime: number | null = 50): TmdbSeasonDetails {
  return {
    season_number: seasonNumber,
    air_date: airDates[0] ?? null,
    episodes: airDates.map((air_date, index) => ({ episode_number: index + 1, air_date, runtime })),
  };
}

export function snapshot(overrides: Partial<ShowSnapshot> = {}): ShowSnapshot {
  return {
    id: 1,
    name: 'Severance',
    posterPath: null,
    firstAirYear: '2022',
    overview: '',
    status: 'returning',
    seasonCount: 2,
    latestSeason: { kind: 'complete', seasonNumber: 2, episodeCount: 10, runtimeMinutes: 500, completedOn: '2025-03-21' },
    seasons: [season(1, { episodeCount: 9, runtimeMinutes: 450 }), season(2, { episodeCount: 10, runtimeMinutes: 500 })],
    fetchedAt: '2026-09-30T00:00:00.000Z',
    ...overrides,
  };
}

export function season(seasonNumber: number, overrides: Partial<SeasonInfo> = {}): SeasonInfo {
  return {
    seasonNumber,
    episodeCount: 10,
    airDate: `202${seasonNumber}-01-01`,
    state: 'complete',
    runtimeMinutes: null,
    ...overrides,
  };
}

export function followed(overrides: Partial<ShowSnapshot> = {}, extra: Partial<FollowedShow> = {}): FollowedShow {
  const snap = snapshot(overrides);
  return {
    id: snap.id,
    followedAt: '2026-09-01T00:00:00.000Z',
    snapshot: snap,
    seenSeasons: [],
    notified: mergeNotified([], snap),
    ...extra,
  };
}
