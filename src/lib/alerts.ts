import { format, parseISO } from 'date-fns';

import { formatRuntime, toIsoDate } from '@/lib/shows';
import type { ShowSnapshot } from '@/lib/types';

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
  return Array.from(new Set([...notified, ...alertKeys(snapshot)]));
}
