import { buildSnapshot, currentSeasonNumber } from '@/lib/shows';
import { readTmdbToken } from '@/lib/token';
import type { ShowSnapshot } from '@/lib/types';

const API_BASE = 'https://api.themoviedb.org/3';
const IMAGE_BASE = 'https://image.tmdb.org/t/p';

export type TmdbEpisodeRef = {
  season_number: number;
  episode_number: number;
  air_date: string | null;
};

export type TmdbSearchResult = {
  id: number;
  name: string;
  first_air_date: string | null;
  poster_path: string | null;
  overview: string;
};

export type TmdbSeasonSummary = {
  season_number: number;
  episode_count: number;
  air_date: string | null;
  name: string;
};

export type TmdbShowDetails = {
  id: number;
  name: string;
  status: string;
  first_air_date: string | null;
  poster_path: string | null;
  overview: string;
  number_of_seasons: number;
  episode_run_time: number[];
  seasons: TmdbSeasonSummary[];
  last_episode_to_air: TmdbEpisodeRef | null;
  next_episode_to_air: TmdbEpisodeRef | null;
};

export type TmdbEpisode = {
  episode_number: number;
  air_date: string | null;
  runtime: number | null;
  episode_type?: string;
};

export type TmdbSeasonDetails = {
  season_number: number;
  air_date: string | null;
  episodes: TmdbEpisode[];
};

export class TmdbError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'TmdbError';
  }
}

export function hasTmdbToken(): boolean {
  return readTmdbToken() !== null;
}

export function posterUrl(path: string | null, size: 'w92' | 'w185' | 'w342' = 'w185'): string | null {
  return path ? `${IMAGE_BASE}/${size}${path}` : null;
}

async function get<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const token = readTmdbToken();
  if (!token) throw new TmdbError('Missing TMDB token');
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${API_BASE}${path}${query ? `?${query}` : ''}`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
  });
  if (!response.ok) throw new TmdbError(`TMDB request failed (${response.status})`, response.status);
  return (await response.json()) as T;
}

export async function searchShows(query: string): Promise<TmdbSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const data = await get<{ results: TmdbSearchResult[] }>('/search/tv', {
    query: trimmed,
    include_adult: 'false',
  });
  return data.results;
}

export function getShow(id: number): Promise<TmdbShowDetails> {
  return get<TmdbShowDetails>(`/tv/${id}`);
}

export function getSeason(id: number, seasonNumber: number): Promise<TmdbSeasonDetails> {
  return get<TmdbSeasonDetails>(`/tv/${id}/season/${seasonNumber}`);
}

export async function fetchSnapshot(id: number, now: Date = new Date()): Promise<ShowSnapshot> {
  const details = await getShow(id);
  const seasonNumber = currentSeasonNumber(details);
  const season = seasonNumber === null ? null : await getSeason(id, seasonNumber);
  return buildSnapshot(details, season, now);
}
