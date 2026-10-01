import {
  buildSnapshot,
  currentSeasonNumber,
  endingNote,
  formatRuntime,
  mapStatus,
  followHint,
  seasonList,
  seasonState,
  seasonStateLabel,
  seasonSummary,
  statusLabel,
  watchlistDetail,
  watchlistGroup,
} from '@/lib/shows';
import { followed, season, seasonDetails, showDetails, snapshot } from '@/test-utils/fixtures';

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
    expect(snap.seasons.map((s) => [s.seasonNumber, s.state])).toEqual([
      [1, 'complete'],
      [2, 'complete'],
    ]);
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

describe('seasonList', () => {
  const details = {
    episode_run_time: [30],
    seasons: [
      { season_number: 0, episode_count: 2, air_date: '2019-01-01', name: 'Specials' },
      { season_number: 2, episode_count: 8, air_date: '2021-03-01', name: 'Season 2' },
      { season_number: 1, episode_count: 10, air_date: '2019-03-01', name: 'Season 1' },
      { season_number: 3, episode_count: 6, air_date: '2026-09-16', name: 'Season 3' },
      { season_number: 4, episode_count: 0, air_date: null, name: 'Season 4' },
    ],
  };

  it('marks earlier seasons complete, the current one from its state, and later ones upcoming', () => {
    const latest = { kind: 'airing' as const, seasonNumber: 3, airedCount: 2, episodeCount: 6, finaleDate: '2026-10-21' };
    expect(seasonList(details, latest, NOW)).toEqual([
      { seasonNumber: 1, episodeCount: 10, airDate: '2019-03-01', state: 'complete', runtimeMinutes: 300 },
      { seasonNumber: 2, episodeCount: 8, airDate: '2021-03-01', state: 'complete', runtimeMinutes: 240 },
      { seasonNumber: 3, episodeCount: 6, airDate: '2026-09-16', state: 'airing', runtimeMinutes: null },
      { seasonNumber: 4, episodeCount: 0, airDate: null, state: 'upcoming', runtimeMinutes: null },
    ]);
  });

  it('uses the exact runtime of a complete current season', () => {
    const latest = { kind: 'complete' as const, seasonNumber: 3, episodeCount: 6, runtimeMinutes: 200, completedOn: '2026-09-28' };
    expect(seasonList(details, latest, NOW)[2]).toMatchObject({ state: 'complete', runtimeMinutes: 200 });
  });

  it('treats undated seasons before the current one as complete, as with One Piece', () => {
    const onePiece = {
      episode_run_time: [24],
      seasons: [
        { season_number: 1, episode_count: 61, air_date: '1999-10-20', name: 'East Blue' },
        { season_number: 2, episode_count: 16, air_date: null, name: 'Entering into the Grand Line' },
        { season_number: 21, episode_count: 197, air_date: '2019-07-08', name: 'Wano' },
        { season_number: 22, episode_count: 67, air_date: null, name: 'Egghead' },
        { season_number: 23, episode_count: 25, air_date: null, name: 'Elbaph' },
      ],
    };
    const latest = { kind: 'airing' as const, seasonNumber: 23, airedCount: 4, episodeCount: 25, finaleDate: null };
    expect(seasonList(onePiece, latest, NOW).map((s) => [s.seasonNumber, s.state])).toEqual([
      [1, 'complete'],
      [2, 'complete'],
      [21, 'complete'],
      [22, 'complete'],
      [23, 'airing'],
    ]);
  });

  it('keeps an earlier season upcoming when it has no episodes or a future date', () => {
    const latest = { kind: 'airing' as const, seasonNumber: 3, airedCount: 1, episodeCount: 6, finaleDate: null };
    const odd = {
      episode_run_time: [],
      seasons: [
        { season_number: 1, episode_count: 0, air_date: null, name: 'Season 1' },
        { season_number: 2, episode_count: 8, air_date: '2027-01-01', name: 'Season 2' },
        { season_number: 3, episode_count: 6, air_date: '2026-09-16', name: 'Season 3' },
      ],
    };
    expect(seasonList(odd, latest, NOW).map((s) => s.state)).toEqual(['upcoming', 'upcoming', 'airing']);
  });

  it('leaves runtime unknown when TMDB has no episode length', () => {
    const latest = { kind: 'none' as const };
    expect(seasonList({ ...details, episode_run_time: [] }, latest, NOW)[0].runtimeMinutes).toBeNull();
  });
});

describe('watchlistGroup', () => {
  it('is ready when a complete season has not been seen, even while another airs', () => {
    const show = followed({
      latestSeason: { kind: 'airing', seasonNumber: 3, airedCount: 1, episodeCount: 8, finaleDate: null },
      seasons: [season(1), season(2), season(3, { state: 'airing' })],
    });
    expect(watchlistGroup({ ...show, seenSeasons: [1] })).toBe('ready');
  });

  it('is airing once every complete season has been seen', () => {
    const show = followed({
      latestSeason: { kind: 'airing', seasonNumber: 2, airedCount: 1, episodeCount: 8, finaleDate: null },
      seasons: [season(1), season(2, { state: 'airing' })],
    });
    expect(watchlistGroup({ ...show, seenSeasons: [1] })).toBe('airing');
  });

  it('is waiting when caught up on a running show', () => {
    expect(watchlistGroup({ ...followed(), seenSeasons: [1, 2] })).toBe('waiting');
  });

  it('is done when caught up on a show that is over', () => {
    expect(watchlistGroup({ ...followed({ status: 'cancelled' }), seenSeasons: [1, 2] })).toBe('done');
  });
});

describe('watchlistDetail', () => {
  it('describes a single season to binge', () => {
    expect(watchlistDetail({ ...followed(), seenSeasons: [1] }, NOW)).toBe('Season 2 to binge · 10 episodes · 8h 20m');
  });

  it('adds up several seasons to binge', () => {
    expect(watchlistDetail(followed(), NOW)).toBe('2 seasons to binge · 19 episodes · 15h 50m');
  });

  it('describes the airing season when caught up', () => {
    const show = followed({
      latestSeason: { kind: 'airing', seasonNumber: 2, airedCount: 3, episodeCount: 8, finaleDate: null },
      seasons: [season(1), season(2, { state: 'airing' })],
    });
    expect(watchlistDetail({ ...show, seenSeasons: [1] }, NOW)).toBe('Season 2 airing · 3 of 8 out');
  });

  it('says when you are caught up', () => {
    expect(watchlistDetail({ ...followed(), seenSeasons: [1, 2] }, NOW)).toBe('All caught up · waiting for a new season');
    expect(watchlistDetail({ ...followed({ status: 'ended' }), seenSeasons: [1, 2] }, NOW)).toBe('All caught up');
  });
});

describe('followHint', () => {
  const airing = { status: 'returning' as const, latestSeason: { kind: 'airing' as const, seasonNumber: 3, airedCount: 1, episodeCount: 8, finaleDate: null } };

  it('explains what following will notify about', () => {
    expect(followHint(airing, false)).toBe('Follow to get a notification when Season 3 is complete.');
    expect(followHint(airing, true)).toBe("You'll get a notification when Season 3 is complete.");
  });

  it('mentions both alerts for an upcoming season', () => {
    expect(followHint({ status: 'returning', latestSeason: { kind: 'upcoming', seasonNumber: 4, premiereDate: null } }, true)).toBe(
      "You'll get a notification when Season 4 premieres, and another when it's complete.",
    );
  });

  it('promises the next season for a running show between seasons', () => {
    expect(followHint(snapshot(), true)).toBe("You'll get a notification when a new season starts, and another when it's complete.");
  });

  it('is honest that a finished show has nothing to wait for', () => {
    expect(followHint(snapshot({ status: 'ended' }), false)).toBe("This show is over. Follow it to keep track of the seasons you've seen.");
  });
});

describe('seasonStateLabel', () => {
  it('labels each kind of season', () => {
    const airing = { kind: 'airing' as const, seasonNumber: 3, airedCount: 2, episodeCount: 6, finaleDate: '2026-10-21' };
    expect(seasonStateLabel(season(1), airing, NOW)).toBe('Complete');
    expect(seasonStateLabel(season(3, { state: 'airing' }), airing, NOW)).toBe('Airing · 2 of 6 out · finale Oct 21');
    expect(seasonStateLabel(season(4, { state: 'upcoming', airDate: null }), airing, NOW)).toBe('Announced');
    expect(seasonStateLabel(season(4, { state: 'upcoming', airDate: '2027-02-01' }), airing, NOW)).toBe('Premieres Feb 1, 2027');
  });
});

describe('statusLabel', () => {
  it('calls returning series ongoing', () => {
    expect(statusLabel('returning')).toBe('Ongoing');
  });
});
