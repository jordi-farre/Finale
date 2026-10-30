import {
  alertKeys,
  deliveredKeys,
  deliveryTime,
  mergeNotified,
  nextAlertText,
  nextPlannedAlert,
  pendingAlerts,
  plannedAlerts,
} from '@/lib/alerts';
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

  it('re-arms the completion alert when a season turns out to still be airing', () => {
    const reopened = mergeNotified(mergeNotified([], complete), airing);
    expect(reopened).toEqual(['premiere:3']);
    expect(pendingAlerts(complete, reopened, NOW).map((alert) => alert.title)).toEqual([
      'The Bear: Season 3 is complete',
    ]);
  });

  it('never repeats an alert that was already sent', () => {
    expect(pendingAlerts(complete, mergeNotified([], complete), NOW)).toEqual([]);
  });
});

describe('plannedAlerts', () => {
  const upcomingWeekly = snapshot({
    latestSeason: {
      kind: 'upcoming',
      seasonNumber: 3,
      premiereDate: '2026-10-10',
      episodeCount: 8,
      finaleDate: '2026-11-25',
      finaleConfirmed: true,
    },
  });

  it('delivers the morning after the air date, local time', () => {
    expect(deliveryTime('2026-10-10')).toEqual(new Date(2026, 9, 11, 10));
  });

  it('plans the premiere and the confirmed finale of an upcoming season', () => {
    expect(plannedAlerts(upcomingWeekly, [], NOW)).toEqual([
      {
        keys: ['premiere:3'],
        showId: 1,
        title: 'Severance: Season 3 has started',
        body: "The finale airs Nov 25. You'll get another notification when the whole season is out.",
        fireAt: new Date(2026, 9, 11, 10).toISOString(),
      },
      {
        keys: ['complete:3'],
        showId: 1,
        title: 'Severance: Season 3 is complete',
        body: 'The finale aired yesterday, so all episodes are out (8 episodes). Ready to binge.',
        fireAt: new Date(2026, 10, 26, 10).toISOString(),
      },
    ]);
  });

  it('plans only the premiere when the finale is not confirmed', () => {
    const unconfirmed = snapshot({
      latestSeason: { ...upcomingWeekly.latestSeason, finaleConfirmed: false } as typeof upcomingWeekly.latestSeason,
    });
    expect(plannedAlerts(unconfirmed, [], NOW).map((alert) => alert.keys)).toEqual([['premiere:3']]);
  });

  it('plans a single notification for a season that drops all at once', () => {
    const drop = snapshot({
      latestSeason: {
        kind: 'upcoming',
        seasonNumber: 2,
        premiereDate: '2026-10-10',
        episodeCount: 6,
        finaleDate: '2026-10-10',
        finaleConfirmed: true,
      },
    });
    expect(plannedAlerts(drop, [], NOW)).toEqual([
      expect.objectContaining({
        keys: ['premiere:2', 'complete:2'],
        title: 'Severance: all of Season 2 is out',
        body: 'The whole season dropped at once (6 episodes). Ready to binge.',
      }),
    ]);
  });

  it('plans the completion of an airing season with a confirmed finale', () => {
    const airingConfirmed = snapshot({
      latestSeason: { kind: 'airing', seasonNumber: 3, airedCount: 2, episodeCount: 10, finaleDate: '2026-11-25', finaleConfirmed: true },
    });
    expect(plannedAlerts(airingConfirmed, ['premiere:3'], NOW).map((alert) => alert.title)).toEqual([
      'Severance: Season 3 is complete',
    ]);
    expect(plannedAlerts(airing, ['premiere:3'], NOW)).toEqual([]);
  });

  it('skips what was already notified and what is already due', () => {
    expect(plannedAlerts(upcomingWeekly, ['premiere:3'], NOW).map((alert) => alert.keys)).toEqual([['complete:3']]);
    expect(plannedAlerts(upcomingWeekly, [], new Date(2026, 9, 12))).toHaveLength(1);
    expect(plannedAlerts(upcomingWeekly, [], new Date(2026, 11, 1))).toEqual([]);
  });

  it('ignores dates it cannot read', () => {
    const broken = snapshot({ latestSeason: { kind: 'upcoming', seasonNumber: 3, premiereDate: 'soon' } });
    expect(plannedAlerts(broken, [], NOW)).toEqual([]);
  });
});

describe('deliveredKeys', () => {
  it('lists the keys of planned notifications that have gone off', () => {
    const planned = [
      { keys: ['premiere:3'], showId: 1, title: '', body: '', fireAt: new Date(2026, 9, 11, 10).toISOString() },
      { keys: ['complete:3'], showId: 1, title: '', body: '', fireAt: new Date(2026, 10, 26, 10).toISOString() },
    ];
    expect(deliveredKeys(planned, new Date(2026, 9, 11, 9))).toEqual([]);
    expect(deliveredKeys(planned, new Date(2026, 9, 11, 10))).toEqual(['premiere:3']);
    expect(deliveredKeys(undefined, NOW)).toEqual([]);
  });
});

describe('nextPlannedAlert', () => {
  it('finds the soonest notification still to come', () => {
    const later = { keys: ['complete:3'], showId: 1, title: 'Later', body: '', fireAt: new Date(2026, 10, 26, 10).toISOString() };
    const sooner = { keys: ['premiere:2'], showId: 2, title: 'Sooner', body: '', fireAt: new Date(2026, 9, 11, 10).toISOString() };
    const past = { keys: ['premiere:1'], showId: 3, title: 'Past', body: '', fireAt: new Date(2026, 8, 1, 10).toISOString() };
    expect(nextPlannedAlert([{ planned: [later] }, { planned: [past, sooner] }, {}], NOW)?.title).toBe('Sooner');
    expect(nextPlannedAlert([{ planned: [past] }], NOW)).toBeNull();
  });

  it('describes it for Settings', () => {
    const alert = { keys: ['premiere:3'], showId: 1, title: 'Severance: Season 3 has started', body: '', fireAt: new Date(2026, 9, 11, 10).toISOString() };
    expect(nextAlertText(alert)).toBe('Next: Severance: Season 3 has started, Sun, Oct 11 at 10:00.');
    expect(nextAlertText(null)).toBe('No notifications scheduled yet.');
  });
});
