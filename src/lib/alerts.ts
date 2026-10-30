import { addDays, format, parseISO, setHours, startOfDay } from 'date-fns';

import { dropsAtOnce, formatRuntime, toIsoDate } from '@/lib/shows';
import type { FollowedShow, PlannedAlert, ShowSnapshot } from '@/lib/types';

const DELIVERY_HOUR = 10;

export type ShowAlert = {
  showId: number;
  title: string;
  body: string;
};

export function alertKeys(snapshot: Pick<ShowSnapshot, 'status' | 'latestSeason'>): string[] {
  const keys: string[] = [];
  const latest = snapshot.latestSeason;
  if (latest.kind === 'airing') keys.push(`premiere:${latest.seasonNumber}`);
  if (latest.kind === 'complete') keys.push(`premiere:${latest.seasonNumber}`, `complete:${latest.seasonNumber}`);
  if (snapshot.status === 'cancelled') keys.push('cancelled');
  return keys;
}

function finaleText(finaleDate: string | null, now: Date): string {
  if (!finaleDate) return "The finale date isn't announced yet.";
  const date = parseISO(finaleDate);
  const day = date.getFullYear() === now.getFullYear() ? format(date, 'MMM d') : format(date, 'MMM d, yyyy');
  return toIsoDate(now) === finaleDate ? 'The finale airs today.' : `The finale airs ${day}.`;
}

function episodesText(episodeCount: number, runtimeMinutes: number | null): string {
  const episodes = `${episodeCount} episode${episodeCount === 1 ? '' : 's'}`;
  return runtimeMinutes ? `${episodes}, ${formatRuntime(runtimeMinutes)}` : episodes;
}

export function pendingAlerts(snapshot: ShowSnapshot, notified: string[], now: Date = new Date()): ShowAlert[] {
  const pending = new Set(alertKeys(snapshot).filter((key) => !notified.includes(key)));
  const alerts: ShowAlert[] = [];
  const latest = snapshot.latestSeason;
  const name = snapshot.name;

  if (latest.kind === 'complete' && pending.has(`complete:${latest.seasonNumber}`)) {
    const episodes = episodesText(latest.episodeCount, latest.runtimeMinutes);
    alerts.push(
      pending.has(`premiere:${latest.seasonNumber}`)
        ? {
            showId: snapshot.id,
            title: `${name}: all of Season ${latest.seasonNumber} is out`,
            body: `The whole season dropped at once (${episodes}). Ready to binge.`,
          }
        : {
            showId: snapshot.id,
            title: `${name}: Season ${latest.seasonNumber} is complete`,
            body: `All episodes are out (${episodes}). Ready to binge.`,
          },
    );
  } else if (latest.kind === 'airing' && pending.has(`premiere:${latest.seasonNumber}`)) {
    alerts.push({
      showId: snapshot.id,
      title: `${name}: Season ${latest.seasonNumber} has started`,
      body: `${finaleText(latest.finaleDate, now)} You'll get another notification when the whole season is out.`,
    });
  }

  if (pending.has('cancelled')) {
    alerts.push({
      showId: snapshot.id,
      title: `${name} was cancelled`,
      body: `It ends after ${snapshot.seasonCount} season${snapshot.seasonCount === 1 ? '' : 's'}. The story may not get an ending.`,
    });
  }

  return alerts;
}

export function mergeNotified(notified: string[], snapshot: Pick<ShowSnapshot, 'status' | 'latestSeason'>): string[] {
  const latest = snapshot.latestSeason;
  const reopened = latest.kind === 'airing' ? `complete:${latest.seasonNumber}` : null;
  return Array.from(new Set([...notified, ...alertKeys(snapshot)])).filter((key) => key !== reopened);
}

export function deliveryTime(airDate: string): Date {
  return setHours(startOfDay(addDays(parseISO(airDate), 1)), DELIVERY_HOUR);
}

export function plannedAlerts(snapshot: ShowSnapshot, notified: string[], now: Date = new Date()): PlannedAlert[] {
  const latest = snapshot.latestSeason;
  const name = snapshot.name;
  const planned: PlannedAlert[] = [];

  function plan(keys: string[], airDate: string, title: string, body: (fireAt: Date) => string) {
    if (keys.some((key) => notified.includes(key))) return;
    const fireAt = deliveryTime(airDate);
    if (Number.isNaN(fireAt.getTime()) || fireAt <= now) return;
    planned.push({ keys, showId: snapshot.id, title, body: body(fireAt), fireAt: fireAt.toISOString() });
  }

  if (latest.kind === 'upcoming' && latest.premiereDate) {
    const season = latest.seasonNumber;
    const finale = latest.finaleConfirmed && latest.finaleDate ? latest.finaleDate : null;
    const episodes = latest.episodeCount ? ` (${episodesText(latest.episodeCount, null)})` : '';
    if (finale && dropsAtOnce(latest.premiereDate, finale)) {
      plan(
        [`premiere:${season}`, `complete:${season}`],
        finale,
        `${name}: all of Season ${season} is out`,
        () => `The whole season dropped at once${episodes}. Ready to binge.`,
      );
    } else {
      plan(
        [`premiere:${season}`],
        latest.premiereDate,
        `${name}: Season ${season} has started`,
        (fireAt) =>
          `${finaleText(latest.finaleDate ?? null, fireAt)} You'll get another notification when the whole season is out.`,
      );
      if (finale) {
        plan(
          [`complete:${season}`],
          finale,
          `${name}: Season ${season} is complete`,
          () => `The finale aired yesterday, so all episodes are out${episodes}. Ready to binge.`,
        );
      }
    }
  }

  if (latest.kind === 'airing' && latest.finaleConfirmed && latest.finaleDate) {
    const season = latest.seasonNumber;
    const episodes = latest.episodeCount ? ` (${episodesText(latest.episodeCount, null)})` : '';
    plan(
      [`complete:${season}`],
      latest.finaleDate,
      `${name}: Season ${season} is complete`,
      () => `The finale aired yesterday, so all episodes are out${episodes}. Ready to binge.`,
    );
  }

  return planned;
}

export function deliveredKeys(planned: PlannedAlert[] | undefined, now: Date = new Date()): string[] {
  return (planned ?? []).filter((alert) => Date.parse(alert.fireAt) <= now.getTime()).flatMap((alert) => alert.keys);
}

export function nextPlannedAlert(shows: Pick<FollowedShow, 'planned'>[], now: Date = new Date()): PlannedAlert | null {
  const upcoming = shows
    .flatMap((show) => show.planned ?? [])
    .filter((alert) => Date.parse(alert.fireAt) > now.getTime())
    .sort((a, b) => Date.parse(a.fireAt) - Date.parse(b.fireAt));
  return upcoming[0] ?? null;
}

export function nextAlertText(alert: PlannedAlert | null): string {
  if (!alert) return 'No notifications scheduled yet.';
  return `Next: ${alert.title}, ${format(new Date(alert.fireAt), "EEE, MMM d 'at' HH:mm")}.`;
}
