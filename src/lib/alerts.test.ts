import { alertKeys, mergeNotified, pendingAlerts } from '@/lib/alerts';
import { snapshot } from '@/test-utils/fixtures';

const NOW = new Date(2026, 8, 30, 12);

const airing = snapshot({
  name: 'The Bear',
  latestSeason: { kind: 'airing', seasonNumber: 3, airedCount: 1, episodeCount: 10, finaleDate: '2026-11-25' },
});
const complete = snapshot({
  name: 'The Bear',
  latestSeason: { kind: 'complete', seasonNumber: 3, episodeCount: 10, runtimeMinutes: 320, completedOn: '2026-11-25' },
});
const upcoming = snapshot({ latestSeason: { kind: 'upcoming', seasonNumber: 3, premiereDate: '2026-10-10' } });

describe('alertKeys', () => {
  it('records which season facts are true', () => {
    expect(alertKeys(upcoming)).toEqual([]);
    expect(alertKeys(airing)).toEqual(['premiere:3']);
    expect(alertKeys(complete)).toEqual(['premiere:3', 'complete:3']);
    expect(alertKeys(snapshot({ status: 'cancelled' }))).toEqual(['premiere:2', 'complete:2', 'cancelled']);
  });
});

describe('pendingAlerts', () => {
  it('announces a premiere and promises the completion alert', () => {
    expect(pendingAlerts(airing, mergeNotified([], upcoming), NOW)).toEqual([
      {
        showId: 1,
        title: 'The Bear: Season 3 has started',
        body: "The finale airs Nov 25. You'll get another notification when the whole season is out.",
      },
    ]);
  });

  it('handles a premiere without a known finale', () => {
    const noFinale = snapshot({ latestSeason: { kind: 'airing', seasonNumber: 3, airedCount: 1, episodeCount: null, finaleDate: null } });
    expect(pendingAlerts(noFinale, [], NOW)[0].body).toMatch(/^The finale date isn't announced yet\./);
  });

  it('announces a completed season', () => {
    expect(pendingAlerts(complete, mergeNotified([], airing), NOW)).toEqual([
      {
        showId: 1,
        title: 'The Bear: Season 3 is complete',
        body: 'All episodes are out (10 episodes, 5h 20m). Ready to binge.',
      },
    ]);
  });

  it('sends a single alert when a whole season drops at once', () => {
    const alerts = pendingAlerts(complete, mergeNotified([], upcoming), NOW);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].title).toBe('The Bear: all of Season 3 is out');
  });

  it('announces a cancellation', () => {
    const cancelled = snapshot({ name: 'Firefly', status: 'cancelled', seasonCount: 1 });
    expect(pendingAlerts(cancelled, mergeNotified([], snapshot()), NOW)).toEqual([
      { showId: 1, title: 'Firefly was cancelled', body: 'It ends after 1 season. The story may not get an ending.' },
    ]);
  });

  it('never repeats an alert that was already sent', () => {
    expect(pendingAlerts(complete, mergeNotified([], complete), NOW)).toEqual([]);
  });
});
