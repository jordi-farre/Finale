import {
  buildSnapshot,
  currentSeasonNumber,
  episodeLength,
  endingNote,
  formatRuntime,
  formatVotes,
  mapStatus,
  MIN_SHOW_VOTES_FOR_SEASON_RATINGS,
  canNotify,
  followHint,
  isWatchlistOnly,
  seasonList,
  seasonState,
  seasonStateLabel,
  seasonSummary,
  showRating,
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
  const details = { next_episode_to_air: null, episode_run_time: [45], status: 'Returning Series' };

  it('is complete when the last episode is marked as the finale', () => {
    const state = seasonState(seasonDetails(2, ['2026-09-01', '2026-09-08', '2026-09-15'], 50, 'finale'), details, NOW);
    expect(state).toEqual({ kind: 'complete', seasonNumber: 2, episodeCount: 3, runtimeMinutes: 150, completedOn: '2026-09-15' });
  });

  it('counts a finale airing today as aired', () => {
    expect(seasonState(seasonDetails(2, ['2026-09-23', '2026-09-30'], 50, 'finale'), details, NOW).kind).toBe('complete');
  });

  it('is complete when the whole season dropped at once', () => {
    expect(seasonState(seasonDetails(2, ['2026-09-26', '2026-09-26', '2026-09-26']), details, NOW).kind).toBe('complete');
  });

  it('is complete once a season has been quiet for three weeks', () => {
    expect(seasonState(seasonDetails(2, ['2026-08-01', '2026-08-08']), details, NOW).kind).toBe('complete');
  });

  it('is complete when the show has ended, whatever the episode labels say', () => {
    const ended = { ...details, status: 'Ended' };
    expect(seasonState(seasonDetails(2, ['2026-09-16', '2026-09-23'], 50, 'mid_season'), ended, NOW).kind).toBe('complete');
  });

  it('stays airing when every listed episode is out but nothing says the season is over, as with One Piece', () => {
    const weekly = ['2026-09-06', '2026-09-13', '2026-09-20', '2026-09-27'];
    expect(seasonState(seasonDetails(23, weekly), details, NOW)).toEqual({
      kind: 'airing',
      seasonNumber: 23,
      airedCount: 4,
      episodeCount: null,
      finaleDate: null,
    });
  });

  it('stays airing through a mid-season break, however long', () => {
    const state = seasonState(seasonDetails(2, ['2026-05-01', '2026-05-08'], 50, 'mid_season'), details, NOW);
    expect(state.kind).toBe('airing');
  });

  it('uses the show runtime when an episode has none', () => {
    const state = seasonState(seasonDetails(1, ['2026-01-01', '2026-01-08'], null), details, NOW);
    expect(state).toMatchObject({ kind: 'complete', runtimeMinutes: 90 });
  });

  it('leaves runtime unknown when neither episode nor show runtime is known', () => {
    const state = seasonState(seasonDetails(1, ['2026-01-01'], null), { ...details, episode_run_time: [] }, NOW);
    expect(state).toMatchObject({ kind: 'complete', runtimeMinutes: null });
  });

  it('is airing with a finale date while episodes are still to come', () => {
    const state = seasonState(seasonDetails(3, ['2026-09-16', '2026-09-23', '2026-10-07', '2026-10-14']), details, NOW);
    expect(state).toEqual({
      kind: 'airing',
      seasonNumber: 3,
      airedCount: 2,
      episodeCount: 4,
      finaleDate: '2026-10-14',
    });
  });

  it('is airing with an unknown finale when later episodes have no date yet', () => {
    const state = seasonState(seasonDetails(3, ['2026-09-16', null]), details, NOW);
    expect(state).toMatchObject({ kind: 'airing', airedCount: 1, episodeCount: 2, finaleDate: null });
  });

  it('is still airing when another episode is announced this season, even after a finale label', () => {
    const announced = { ...details, next_episode_to_air: { season_number: 3, episode_number: 3, air_date: null } };
    const state = seasonState(seasonDetails(3, ['2026-09-16', '2026-09-23'], 50, 'finale'), announced, NOW);
    expect(state).toEqual({
      kind: 'airing',
      seasonNumber: 3,
      airedCount: 2,
      episodeCount: null,
      finaleDate: null,
    });
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
  it('describes a complete season', () => {
    expect(seasonSummary({ kind: 'complete', seasonNumber: 3, episodeCount: 10, runtimeMinutes: 520, completedOn: null }, NOW)).toBe(
      'Season 3 complete · 10 episodes',
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
    expect(seasonList(details, latest, 30, NOW)).toEqual([
      { seasonNumber: 1, episodeCount: 10, airDate: '2019-03-01', state: 'complete', runtimeMinutes: 300, rating: null },
      { seasonNumber: 2, episodeCount: 8, airDate: '2021-03-01', state: 'complete', runtimeMinutes: 240, rating: null },
      { seasonNumber: 3, episodeCount: 6, airDate: '2026-09-16', state: 'airing', runtimeMinutes: 180, rating: null },
      { seasonNumber: 4, episodeCount: 0, airDate: null, state: 'upcoming', runtimeMinutes: null, rating: null },
    ]);
  });

  it('uses the exact runtime of a complete current season', () => {
    const latest = { kind: 'complete' as const, seasonNumber: 3, episodeCount: 6, runtimeMinutes: 200, completedOn: '2026-09-28' };
    expect(seasonList(details, latest, 30, NOW)[2]).toMatchObject({ state: 'complete', runtimeMinutes: 200 });
  });

  it('treats undated seasons before the current one as complete, as with One Piece', () => {
    const onePiece = {
      seasons: [
        { season_number: 1, episode_count: 61, air_date: '1999-10-20', name: 'East Blue' },
        { season_number: 2, episode_count: 16, air_date: null, name: 'Entering into the Grand Line' },
        { season_number: 21, episode_count: 197, air_date: '2019-07-08', name: 'Wano' },
        { season_number: 22, episode_count: 67, air_date: null, name: 'Egghead' },
        { season_number: 23, episode_count: 25, air_date: null, name: 'Elbaph' },
      ],
    };
    const latest = { kind: 'airing' as const, seasonNumber: 23, airedCount: 4, episodeCount: 25, finaleDate: null };
    expect(seasonList(onePiece, latest, 24, NOW).map((s) => [s.seasonNumber, s.state])).toEqual([
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
      seasons: [
        { season_number: 1, episode_count: 0, air_date: null, name: 'Season 1' },
        { season_number: 2, episode_count: 8, air_date: '2027-01-01', name: 'Season 2' },
        { season_number: 3, episode_count: 6, air_date: '2026-09-16', name: 'Season 3' },
      ],
    };
    expect(seasonList(odd, latest, null, NOW).map((s) => s.state)).toEqual(['upcoming', 'upcoming', 'airing']);
  });

  describe('season ratings', () => {
    const latest = { kind: 'airing' as const, seasonNumber: 3, airedCount: 2, episodeCount: 6, finaleDate: null };
    const rated = {
      vote_count: 2400,
      seasons: [
        { season_number: 1, episode_count: 10, air_date: '2019-03-01', name: 'Season 1', vote_average: 8.14 },
        { season_number: 2, episode_count: 8, air_date: '2021-03-01', name: 'Season 2', vote_average: 0 },
        { season_number: 3, episode_count: 6, air_date: '2026-09-16', name: 'Season 3', vote_average: 7.5 },
        { season_number: 4, episode_count: 0, air_date: null, name: 'Season 4', vote_average: 9 },
      ],
    };

    it('shows a rounded rating for aired seasons', () => {
      const [first, , third] = seasonList(rated, latest, null, NOW);
      expect(first.rating).toBe(8.1);
      expect(third.rating).toBe(7.5);
    });

    it('hides a rating of zero, which means nobody rated it yet', () => {
      expect(seasonList(rated, latest, null, NOW)[1].rating).toBeNull();
    });

    it('hides the rating of a season that has not aired', () => {
      expect(seasonList(rated, latest, null, NOW)[3].rating).toBeNull();
    });

    it('hides every season rating when too few people rated the show', () => {
      const obscure = { ...rated, vote_count: MIN_SHOW_VOTES_FOR_SEASON_RATINGS - 1 };
      expect(seasonList(obscure, latest, null, NOW).map((season) => season.rating)).toEqual([null, null, null, null]);
    });
  });

  it('leaves runtime unknown without an episode length', () => {
    expect(seasonList(details, { kind: 'none' }, null, NOW)[0].runtimeMinutes).toBeNull();
  });
});

describe('episodeLength', () => {
  it("prefers TMDB's typical episode length", () => {
    expect(episodeLength({ episode_run_time: [42] }, seasonDetails(1, ['2026-01-01'], 60))).toBe(42);
  });

  it('falls back to the average runtime of the season episodes, as for most shows today', () => {
    const season = seasonDetails(1, ['2026-01-01', '2026-01-08', '2026-01-15'], 50);
    season.episodes[2].runtime = 65;
    season.episodes[1].runtime = null;
    expect(episodeLength({ episode_run_time: [] }, season)).toBe(58);
  });

  it('is unknown when nothing has a runtime', () => {
    expect(episodeLength({ episode_run_time: [] }, seasonDetails(1, ['2026-01-01'], null))).toBeNull();
    expect(episodeLength({ episode_run_time: [] }, null)).toBeNull();
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
    expect(watchlistDetail({ ...followed(), seenSeasons: [1] }, NOW)).toBe('Season 2 to binge · 10 episodes');
  });

  it('adds up several seasons to binge', () => {
    expect(watchlistDetail(followed(), NOW)).toBe('2 seasons to binge · 19 episodes');
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

  it('offers seen-season tracking for an ended show', () => {
    expect(followHint(snapshot({ status: 'ended' }), false)).toBe("Track the seasons you've seen.");
    expect(followHint(snapshot({ status: 'ended' }), true)).toBe('This show is over, so there are no new seasons to notify you about.');
  });

  it('mentions a possible revival for a cancelled show', () => {
    expect(followHint(snapshot({ status: 'cancelled' }), false)).toBe(
      "Track the seasons you've seen. If it ever comes back, you'll get a notification when the new season starts.",
    );
    expect(followHint(snapshot({ status: 'cancelled' }), true)).toBe(
      "If it ever comes back, you'll get a notification when the new season starts.",
    );
  });
});

describe('watchlist-only shows', () => {
  it('treats finished shows as watchlist-only', () => {
    expect(isWatchlistOnly(snapshot({ status: 'ended' }))).toBe(true);
    expect(isWatchlistOnly(snapshot({ status: 'cancelled' }))).toBe(true);
    expect(isWatchlistOnly(snapshot({ status: 'returning' }))).toBe(false);
  });

  it('treats a cancelled show that is still airing its last season as followable', () => {
    const airing = { kind: 'airing' as const, seasonNumber: 2, airedCount: 1, episodeCount: 8, finaleDate: null };
    expect(isWatchlistOnly(snapshot({ status: 'cancelled', latestSeason: airing }))).toBe(false);
  });

  it('only lets ended shows go without notifications', () => {
    expect(canNotify(snapshot({ status: 'ended' }))).toBe(false);
    expect(canNotify(snapshot({ status: 'cancelled' }))).toBe(true);
    expect(canNotify(snapshot())).toBe(true);
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

describe('showRating', () => {
  it('rounds the score and keeps the vote count', () => {
    expect(showRating({ vote_average: 8.438, vote_count: 21390 })).toEqual({ score: 8.4, votes: 21390 });
  });

  it('hides a score backed by too few votes', () => {
    expect(showRating({ vote_average: 9.6, vote_count: 12 })).toBeNull();
  });

  it('hides a missing or zero score', () => {
    expect(showRating({ vote_average: 0, vote_count: 500 })).toBeNull();
    expect(showRating({})).toBeNull();
  });

  it('is part of the snapshot', () => {
    const snap = buildSnapshot(showDetails({ vote_average: 8.04, vote_count: 900 }), null, NOW);
    expect(snap.rating).toEqual({ score: 8, votes: 900 });
  });
});

describe('formatVotes', () => {
  it.each([
    [850, '850'],
    [1234, '1.2k'],
    [9960, '10k'],
    [21390, '21k'],
  ])('formats %i as %s', (votes, text) => {
    expect(formatVotes(votes)).toBe(text);
  });
});
