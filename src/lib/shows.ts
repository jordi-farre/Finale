import { format, parseISO } from 'date-fns';

import type { TmdbSeasonDetails, TmdbShowDetails } from '@/lib/tmdb';
import type { SeasonState, ShowSnapshot, ShowStatus } from '@/lib/types';

export function toIsoDate(date: Date): string {
  return format(date, 'yyyy-MM-dd');
}

export function mapStatus(raw: string | null | undefined): ShowStatus {
  switch (raw) {
    case 'Returning Series':
      return 'returning';
    case 'In Production':
      return 'in-production';
    case 'Planned':
    case 'Pilot':
      return 'planned';
    case 'Ended':
      return 'ended';
    case 'Canceled':
    case 'Cancelled':
      return 'cancelled';
    default:
      return 'unknown';
  }
}

export function statusLabel(status: ShowStatus): string {
  switch (status) {
    case 'returning':
      return 'Returning';
    case 'in-production':
      return 'In production';
    case 'planned':
      return 'Planned';
    case 'ended':
      return 'Ended';
    case 'cancelled':
      return 'Cancelled';
    default:
      return 'Unknown status';
  }
}

export function currentSeasonNumber(details: Pick<TmdbShowDetails, 'seasons' | 'last_episode_to_air' | 'next_episode_to_air'>): number | null {
  if (details.next_episode_to_air) return details.next_episode_to_air.season_number;
  if (details.last_episode_to_air) return details.last_episode_to_air.season_number;
  const regular = details.seasons.filter((season) => season.season_number > 0);
  if (regular.length === 0) return null;
  return Math.max(...regular.map((season) => season.season_number));
}

export function seasonState(
  season: TmdbSeasonDetails | null,
  details: Pick<TmdbShowDetails, 'next_episode_to_air' | 'episode_run_time'>,
  now: Date = new Date(),
): SeasonState {
  if (!season) return { kind: 'none' };
  const today = toIsoDate(now);
  const seasonNumber = season.season_number;
  const episodes = [...season.episodes].sort((a, b) => a.episode_number - b.episode_number);
  const aired = episodes.filter((episode) => episode.air_date !== null && episode.air_date <= today);

  if (aired.length === 0) {
    return { kind: 'upcoming', seasonNumber, premiereDate: episodes[0]?.air_date ?? season.air_date };
  }

  const moreAnnouncedThisSeason = details.next_episode_to_air?.season_number === seasonNumber;

  if (aired.length === episodes.length && !moreAnnouncedThisSeason) {
    return {
      kind: 'complete',
      seasonNumber,
      episodeCount: episodes.length,
      runtimeMinutes: totalRuntime(episodes, details.episode_run_time),
      completedOn: aired[aired.length - 1].air_date,
    };
  }

  const allListedAired = aired.length === episodes.length;
  const lastEpisode = episodes[episodes.length - 1];
  return {
    kind: 'airing',
    seasonNumber,
    airedCount: aired.length,
    episodeCount: allListedAired ? null : episodes.length,
    finaleDate: allListedAired ? null : (lastEpisode.air_date ?? null),
  };
}

function totalRuntime(episodes: TmdbSeasonDetails['episodes'], fallbackRuntimes: number[]): number | null {
  const fallback = fallbackRuntimes[0] ?? null;
  let total = 0;
  for (const episode of episodes) {
    const minutes = episode.runtime ?? fallback;
    if (minutes === null) return null;
    total += minutes;
  }
  return total;
}

export function buildSnapshot(
  details: TmdbShowDetails,
  season: TmdbSeasonDetails | null,
  now: Date = new Date(),
): ShowSnapshot {
  return {
    id: details.id,
    name: details.name,
    posterPath: details.poster_path,
    firstAirYear: details.first_air_date ? details.first_air_date.slice(0, 4) : null,
    overview: details.overview,
    status: mapStatus(details.status),
    seasonCount: details.seasons.filter((s) => s.season_number > 0 && s.episode_count > 0).length,
    latestSeason: seasonState(season, details, now),
    fetchedAt: now.toISOString(),
  };
}

export function formatRuntime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}m`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}m`;
}

function formatDay(isoDate: string, now: Date): string {
  const date = parseISO(isoDate);
  return date.getFullYear() === now.getFullYear() ? format(date, 'MMM d') : format(date, 'MMM d, yyyy');
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

export function seasonSummary(state: SeasonState, now: Date = new Date()): string | null {
  switch (state.kind) {
    case 'complete': {
      const parts = [`Season ${state.seasonNumber} complete`, plural(state.episodeCount, 'episode')];
      if (state.runtimeMinutes) parts.push(formatRuntime(state.runtimeMinutes));
      return parts.join(' · ');
    }
    case 'airing': {
      const progress =
        state.episodeCount === null
          ? `${plural(state.airedCount, 'episode')} out`
          : `${state.airedCount} of ${state.episodeCount} out`;
      const parts = [`Season ${state.seasonNumber} airing`, progress];
      if (state.finaleDate) parts.push(`finale ${formatDay(state.finaleDate, now)}`);
      return parts.join(' · ');
    }
    case 'upcoming':
      return state.premiereDate
        ? `Season ${state.seasonNumber} premieres ${formatDay(state.premiereDate, now)}`
        : `Season ${state.seasonNumber} announced`;
    default:
      return null;
  }
}

export function endingNote(snapshot: Pick<ShowSnapshot, 'status' | 'seasonCount'>): string | null {
  if (snapshot.status === 'cancelled') {
    return `Cancelled after ${plural(snapshot.seasonCount, 'season')}. The story may not get an ending.`;
  }
  if (snapshot.status === 'ended') {
    return `Ended after ${plural(snapshot.seasonCount, 'season')}. The full story is out.`;
  }
  return null;
}

export type WatchlistGroup = 'ready' | 'airing' | 'waiting';

export function watchlistGroup(state: SeasonState): WatchlistGroup {
  if (state.kind === 'complete') return 'ready';
  if (state.kind === 'airing') return 'airing';
  return 'waiting';
}
