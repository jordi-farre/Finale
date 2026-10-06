import { differenceInCalendarDays, format, parseISO } from 'date-fns';

import type { TmdbSeasonDetails, TmdbShowDetails } from '@/lib/tmdb';
import type { FollowedShow, SeasonInfo, SeasonState, ShowRating, ShowSnapshot, ShowStatus } from '@/lib/types';

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
      return 'Ongoing';
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

const QUIET_DAYS_BEFORE_COMPLETE = 21;
const DROP_SPAN_DAYS = 2;

function daysBetween(from: string, to: string): number {
  return differenceInCalendarDays(parseISO(to), parseISO(from));
}

function looksFinished(
  episodes: TmdbSeasonDetails['episodes'],
  status: ShowStatus,
  today: string,
): boolean {
  if (status === 'ended' || status === 'cancelled') return true;
  const last = episodes[episodes.length - 1];
  if (last.episode_type === 'mid_season') return false;
  if (last.episode_type === 'finale') return true;
  const first = episodes[0];
  if (first.air_date && last.air_date && daysBetween(first.air_date, last.air_date) <= DROP_SPAN_DAYS) return true;
  return last.air_date !== null && daysBetween(last.air_date, today) > QUIET_DAYS_BEFORE_COMPLETE;
}

export function seasonState(
  season: TmdbSeasonDetails | null,
  details: Pick<TmdbShowDetails, 'next_episode_to_air' | 'episode_run_time' | 'status'>,
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

  const perEpisode = episodeLength(details, season);

  if (
    aired.length === episodes.length &&
    !moreAnnouncedThisSeason &&
    looksFinished(episodes, mapStatus(details.status), today)
  ) {
    return {
      kind: 'complete',
      seasonNumber,
      episodeCount: episodes.length,
      runtimeMinutes: totalRuntime(episodes, perEpisode),
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

export function episodeLength(
  details: Pick<TmdbShowDetails, 'episode_run_time'>,
  season: TmdbSeasonDetails | null,
): number | null {
  if (details.episode_run_time[0]) return details.episode_run_time[0];
  const known = (season?.episodes ?? []).map((episode) => episode.runtime).filter((minutes): minutes is number => !!minutes);
  if (known.length === 0) return null;
  return Math.round(known.reduce((total, minutes) => total + minutes, 0) / known.length);
}

function totalRuntime(episodes: TmdbSeasonDetails['episodes'], fallback: number | null): number | null {
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
  const latestSeason = seasonState(season, details, now);
  return {
    id: details.id,
    name: details.name,
    posterPath: details.poster_path,
    firstAirYear: details.first_air_date ? details.first_air_date.slice(0, 4) : null,
    overview: details.overview,
    status: mapStatus(details.status),
    rating: showRating(details),
    seasonCount: details.seasons.filter((s) => s.season_number > 0 && s.episode_count > 0).length,
    latestSeason,
    seasons: seasonList(details, latestSeason, episodeLength(details, season), now),
    fetchedAt: now.toISOString(),
  };
}

export const MIN_SHOW_VOTES_FOR_SEASON_RATINGS = 50;

export function showRating(details: Pick<TmdbShowDetails, 'vote_average' | 'vote_count'>): ShowRating | null {
  const votes = details.vote_count ?? 0;
  if (!details.vote_average || votes < MIN_SHOW_VOTES_FOR_SEASON_RATINGS) return null;
  return { score: Math.round(details.vote_average * 10) / 10, votes };
}

export function formatVotes(votes: number): string {
  if (votes < 1000) return String(votes);
  const thousands = votes / 1000;
  return `${thousands < 10 ? Math.round(thousands * 10) / 10 : Math.round(thousands)}k`;
}

function seasonRating(voteAverage: number | undefined, showVotes: number, state: SeasonInfo['state']): number | null {
  if (state === 'upcoming' || !voteAverage || showVotes < MIN_SHOW_VOTES_FOR_SEASON_RATINGS) return null;
  return Math.round(voteAverage * 10) / 10;
}

type SeasonProgress = Pick<SeasonInfo, 'state' | 'runtimeMinutes' | 'episodeCount'>;

function seasonProgress(
  season: TmdbShowDetails['seasons'][number],
  latest: SeasonState,
  estimate: number | null,
  today: string,
): SeasonProgress {
  const currentNumber = latest.kind === 'none' ? null : latest.seasonNumber;
  if (latest.kind !== 'none' && season.season_number === currentNumber) {
    if (latest.kind === 'complete') {
      return { state: 'complete', episodeCount: latest.episodeCount, runtimeMinutes: latest.runtimeMinutes ?? estimate };
    }
    return { state: latest.kind, episodeCount: season.episode_count, runtimeMinutes: estimate };
  }
  const beforeCurrent = currentNumber === null || season.season_number < currentNumber;
  const aired = season.episode_count > 0 && (season.air_date === null || season.air_date <= today);
  return {
    state: beforeCurrent && aired ? 'complete' : 'upcoming',
    episodeCount: season.episode_count,
    runtimeMinutes: estimate,
  };
}

export function seasonList(
  details: Pick<TmdbShowDetails, 'seasons' | 'vote_count'>,
  latest: SeasonState,
  perEpisode: number | null,
  now: Date = new Date(),
): SeasonInfo[] {
  const today = toIsoDate(now);
  return details.seasons
    .filter((season) => season.season_number > 0)
    .sort((a, b) => a.season_number - b.season_number)
    .map((season): SeasonInfo => {
      const estimate = perEpisode && season.episode_count > 0 ? perEpisode * season.episode_count : null;
      const progress = seasonProgress(season, latest, estimate, today);
      return {
        seasonNumber: season.season_number,
        airDate: season.air_date,
        ...progress,
        rating: seasonRating(season.vote_average, details.vote_count ?? 0, progress.state),
      };
    });
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
      return [`Season ${state.seasonNumber} complete`, plural(state.episodeCount, 'episode')].join(' · ');
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

export function unseenCompleteSeasons(show: Pick<FollowedShow, 'snapshot' | 'seenSeasons'>): SeasonInfo[] {
  return show.snapshot.seasons.filter(
    (season) => season.state === 'complete' && !show.seenSeasons.includes(season.seasonNumber),
  );
}

const isOver = (status: ShowStatus) => status === 'ended' || status === 'cancelled';

export type WatchlistGroup = 'ready' | 'airing' | 'waiting' | 'done';

export function watchlistGroup(show: Pick<FollowedShow, 'snapshot' | 'seenSeasons'>): WatchlistGroup {
  if (unseenCompleteSeasons(show).length > 0) return 'ready';
  if (show.snapshot.latestSeason.kind === 'airing') return 'airing';
  if (isOver(show.snapshot.status)) return 'done';
  return 'waiting';
}

export function watchlistDetail(show: Pick<FollowedShow, 'snapshot' | 'seenSeasons'>, now: Date = new Date()): string | null {
  const unseen = unseenCompleteSeasons(show);
  if (unseen.length === 1) {
    const [season] = unseen;
    return `Season ${season.seasonNumber} to binge · ${plural(season.episodeCount, 'episode')}`;
  }
  if (unseen.length > 1) {
    const episodes = unseen.reduce((total, season) => total + season.episodeCount, 0);
    return `${unseen.length} seasons to binge · ${plural(episodes, 'episode')}`;
  }
  const { latestSeason, status } = show.snapshot;
  if (latestSeason.kind === 'airing' || latestSeason.kind === 'upcoming') return seasonSummary(latestSeason, now);
  if (isOver(status)) return 'All caught up';
  return 'All caught up · waiting for a new season';
}

export function isWatchlistOnly(snapshot: Pick<ShowSnapshot, 'status' | 'latestSeason'>): boolean {
  const latest = snapshot.latestSeason;
  return isOver(snapshot.status) && latest.kind !== 'airing' && latest.kind !== 'upcoming';
}

export function canNotify(snapshot: Pick<ShowSnapshot, 'status' | 'latestSeason'>): boolean {
  return !(isWatchlistOnly(snapshot) && snapshot.status === 'ended');
}

export function followHint(snapshot: Pick<ShowSnapshot, 'status' | 'latestSeason'>, following: boolean): string {
  const latest = snapshot.latestSeason;
  if (isWatchlistOnly(snapshot)) {
    const revival = "If it ever comes back, you'll get a notification when the new season starts.";
    if (snapshot.status === 'cancelled') return following ? revival : `Track the seasons you've seen. ${revival}`;
    return following ? 'This show is over, so there are no new seasons to notify you about.' : "Track the seasons you've seen.";
  }
  const lead = following ? "You'll get a notification" : 'Follow to get a notification';
  if (latest.kind === 'airing') return `${lead} when Season ${latest.seasonNumber} is complete.`;
  if (latest.kind === 'upcoming') {
    return `${lead} when Season ${latest.seasonNumber} premieres, and another when it's complete.`;
  }
  return `${lead} when a new season starts, and another when it's complete.`;
}

export function seasonStateLabel(season: SeasonInfo, latest: SeasonState, now: Date = new Date()): string {
  if (season.state === 'complete') return 'Complete';
  if (season.state === 'airing' && latest.kind === 'airing' && latest.seasonNumber === season.seasonNumber) {
    const progress = latest.episodeCount === null ? `${latest.airedCount} out` : `${latest.airedCount} of ${latest.episodeCount} out`;
    return latest.finaleDate ? `Airing · ${progress} · finale ${formatDay(latest.finaleDate, now)}` : `Airing · ${progress}`;
  }
  const premiere = latest.kind === 'upcoming' && latest.seasonNumber === season.seasonNumber ? latest.premiereDate : season.airDate;
  return premiere ? `Premieres ${formatDay(premiere, now)}` : 'Announced';
}

export function seasonDetailLine(season: SeasonInfo): string | null {
  if (season.episodeCount === 0) return null;
  const parts = [plural(season.episodeCount, 'episode')];
  if (season.runtimeMinutes) parts.push(formatRuntime(season.runtimeMinutes));
  return parts.join(' · ');
}
