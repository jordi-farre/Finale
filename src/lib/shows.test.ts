import {
  buildSnapshot,
  currentSeasonNumber,
  endingNote,
  formatRuntime,
  mapStatus,
  seasonState,
  seasonSummary,
  watchlistGroup,
} from '@/lib/shows';
import { seasonDetails, showDetails } from '@/test-utils/fixtures';

const NOW = new Date(2026, 8, 30, 12);

describe('mapStatus', () => {
  it.each([
    ['Returning Series', 'returning'],
    ['In Production', 'in-production'],
    ['Planned', 'planned'],
    ['Pilot', 'planned'],
    ['Ended', 'ended'],
    ['Canceled', 'cancelled'],
    ['Something new', 'unknown'],
  ])('maps %s to %s', (raw, expected) => {
    expect(mapStatus(raw)).toBe(expected);
  });
});

describe('currentSeasonNumber', () => {
  it('prefers the season of the next episode', () => {
    const details = showDetails({ next_episode_to_air: { season_number: 3, episode_number: 1, air_date: '2027-01-01' } });
    expect(currentSeasonNumber(details)).toBe(3);
  });

  it('falls back to the season of the last aired episode', () => {
    expect(currentSeasonNumber(showDetails())).toBe(2);
  });

  it('falls back to the highest regular season, ignoring specials', () => {
    const details = showDetails({ last_episode_to_air: null, seasons: [{ season_number: 0, episode_count: 1, air_date: null, name: 'Specials' }, { season_number: 1, episode_count: 0, air_date: null, name: 'Season 1' }] });
    expect(currentSeasonNumber(details)).toBe(1);
  });

  it('returns null when there are no regular seasons', () => {
    expect(currentSeasonNumber(showDetails({ last_episode_to_air: null, seasons: [] }))).toBeNull();
  });
});

describe('seasonState', () => {
  const details = { next_episode_to_air: null, episode_run_time: [45] };

  it('is complete when every episode has aired and nothing more is announced', () => {
    const state = seasonState(seasonDetails(2, ['2026-09-01', '2026-09-08', '2026-09-15']), details, NOW);
    expect(state).toEqual({ kind: 'complete', seasonNumber: 2, episodeCount: 3, runtimeMinutes: 150, completedOn: '2026-09-15' });
  });

  it('counts the finale airing today as aired', () => {
    const state = seasonState(seasonDetails(2, ['2026-09-23', '2026-09-30']), details, NOW);
    expect(state.kind).toBe('complete');
  });

  it('uses the show runtime when an episode has none', () => {
    const state = seasonState(seasonDetails(1, ['2026-01-01', '2026-01-08'], null), details, NOW);
    expect(state).toMatchObject({ kind: 'complete', runtimeMinutes: 90 });
  });

  it('leaves runtime unknown when neither episode nor show runtime is known', () => {
    const state = seasonState(seasonDetails(1, ['2026-01-01'], null), { next_episode_to_air: null, episode_run_time: [] }, NOW);
    expect(state).toMatchObject({ kind: 'complete', runtimeMinutes: null });
  });

  it('is airing with a finale date while episodes are still to come', () => {
    const state = seasonState(seasonDetails(3, ['2026-09-16', '2026-09-23', '2026-10-07', '2026-10-14']), details, NOW);
    expect(state).toEqual({ kind: 'airing', seasonNumber: 3, airedCount: 2, episodeCount: 4, finaleDate: '2026-10-14' });
  });

  it('is airing with an unknown finale when later episodes have no date yet', () => {
    const state = seasonState(seasonDetails(3, ['2026-09-16', null]), details, NOW);
    expect(state).toMatchObject({ kind: 'airing', airedCount: 1, episodeCount: 2, finaleDate: null });
  });

  it('is still airing when TMDB lists only aired episodes but announces another one this season', () => {
    const state = seasonState(seasonDetails(3, ['2026-09-16', '2026-09-23']), { next_episode_to_air: { season_number: 3, episode_number: 3, air_date: null }, episode_run_time: [] }, NOW);
    expect(state).toEqual({ kind: 'airing', seasonNumber: 3, airedCount: 2, episodeCount: null, finaleDate: null });
  });

  it('is upcoming when nothing has aired', () => {
    const state = seasonState(seasonDetails(4, ['2027-01-10', '2027-01-17']), details, NOW);
    expect(state).toEqual({ kind: 'upcoming', seasonNumber: 4, premiereDate: '2027-01-10' });
  });

  it('is upcoming with no date when the season has no episodes listed', () => {
    expect(seasonState(seasonDetails(4, []), details, NOW)).toEqual({ kind: 'upcoming', seasonNumber: 4, premiereDate: null });
  });

  it('is none without season data', () => {
    expect(seasonState(null, details, NOW)).toEqual({ kind: 'none' });
  });
});

describe('buildSnapshot', () => {
  it('summarises the show and counts only regular seasons with episodes', () => {
    const snap = buildSnapshot(showDetails({ status: 'Canceled' }), seasonDetails(2, ['2025-03-14', '2025-03-21']), NOW);
    expect(snap).toMatchObject({ id: 1, name: 'Severance', firstAirYear: '2022', status: 'cancelled', seasonCount: 2 });
    expect(snap.latestSeason.kind).toBe('complete');
  });
});

describe('formatRuntime', () => {
  it.each([
    [45, '45m'],
    [60, '1h'],
    [520, '8h 40m'],
  ])('formats %i minutes as %s', (minutes, expected) => {
    expect(formatRuntime(minutes)).toBe(expected);
  });
});

describe('seasonSummary', () => {
  it('describes a complete season with its binge time', () => {
    expect(seasonSummary({ kind: 'complete', seasonNumber: 3, episodeCount: 10, runtimeMinutes: 520, completedOn: null }, NOW)).toBe(
      'Season 3 complete · 10 episodes · 8h 40m',
    );
  });

  it('describes an airing season with its finale', () => {
    expect(seasonSummary({ kind: 'airing', seasonNumber: 2, airedCount: 4, episodeCount: 10, finaleDate: '2026-10-12' }, NOW)).toBe(
      'Season 2 airing · 4 of 10 out · finale Oct 12',
    );
  });

  it('describes an airing season of unknown length', () => {
    expect(seasonSummary({ kind: 'airing', seasonNumber: 2, airedCount: 1, episodeCount: null, finaleDate: null }, NOW)).toBe(
      'Season 2 airing · 1 episode out',
    );
  });

  it('includes the year for premieres in another year', () => {
    expect(seasonSummary({ kind: 'upcoming', seasonNumber: 5, premiereDate: '2027-01-10' }, NOW)).toBe('Season 5 premieres Jan 10, 2027');
  });

  it('describes an announced season without a date', () => {
    expect(seasonSummary({ kind: 'upcoming', seasonNumber: 5, premiereDate: null }, NOW)).toBe('Season 5 announced');
  });

  it('returns null without season data', () => {
    expect(seasonSummary({ kind: 'none' }, NOW)).toBeNull();
  });
});

describe('endingNote', () => {
  it('warns about cancelled shows', () => {
    expect(endingNote({ status: 'cancelled', seasonCount: 1 })).toBe('Cancelled after 1 season. The story may not get an ending.');
  });

  it('reassures about shows that ended', () => {
    expect(endingNote({ status: 'ended', seasonCount: 5 })).toBe('Ended after 5 seasons. The full story is out.');
  });

  it('says nothing for running shows', () => {
    expect(endingNote({ status: 'returning', seasonCount: 2 })).toBeNull();
  });
});

describe('watchlistGroup', () => {
  it('groups by the state of the latest season', () => {
    expect(watchlistGroup({ kind: 'complete', seasonNumber: 1, episodeCount: 1, runtimeMinutes: null, completedOn: null })).toBe('ready');
    expect(watchlistGroup({ kind: 'airing', seasonNumber: 1, airedCount: 1, episodeCount: 2, finaleDate: null })).toBe('airing');
    expect(watchlistGroup({ kind: 'upcoming', seasonNumber: 1, premiereDate: null })).toBe('waiting');
    expect(watchlistGroup({ kind: 'none' })).toBe('waiting');
  });
});
