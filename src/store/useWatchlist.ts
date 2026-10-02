import { create } from 'zustand';

import { mergeNotified, pendingAlerts, type ShowAlert } from '@/lib/alerts';
import { presentAlerts } from '@/lib/notifications';
import { load, save } from '@/lib/storage';
import { fetchSnapshot } from '@/lib/tmdb';
import type { FollowedShow, PersistedState, ShowSnapshot } from '@/lib/types';

type WatchlistState = {
  shows: FollowedShow[];
  hydrated: boolean;
  refreshing: boolean;
  hydrate: () => Promise<void>;
  follow: (snapshot: ShowSnapshot) => void;
  unfollow: (id: number) => void;
  setSeen: (id: number, seasonNumber: number, seen: boolean) => { previous: number[]; next: number[] };
  restoreSeen: (id: number, seenSeasons: number[]) => void;
  updateSnapshot: (snapshot: ShowSnapshot) => void;
  refreshAll: () => Promise<ShowAlert[]>;
  replaceAll: (next: PersistedState) => void;
};

function persist(shows: FollowedShow[]) {
  void save({ version: 1, shows });
}

export const useWatchlist = create<WatchlistState>((set, get) => ({
  shows: [],
  hydrated: false,
  refreshing: false,

  hydrate: async () => {
    const state = await load();
    set({ shows: state.shows, hydrated: true });
  },

  follow: (snapshot) => {
    if (get().shows.some((show) => show.id === snapshot.id)) return;
    const followed: FollowedShow = {
      id: snapshot.id,
      followedAt: new Date().toISOString(),
      snapshot,
      seenSeasons: [],
      notified: mergeNotified([], snapshot),
    };
    const shows = [...get().shows, followed];
    set({ shows });
    persist(shows);
  },

  unfollow: (id) => {
    const shows = get().shows.filter((show) => show.id !== id);
    set({ shows });
    persist(shows);
  },

  setSeen: (id, seasonNumber, seen) => {
    const show = get().shows.find((candidate) => candidate.id === id);
    if (!show) return { previous: [], next: [] };
    const previous = show.seenSeasons;
    const next = seen
      ? Array.from(
          new Set([
            ...previous,
            seasonNumber,
            ...show.snapshot.seasons
              .filter((season) => season.state === 'complete' && season.seasonNumber < seasonNumber)
              .map((season) => season.seasonNumber),
          ]),
        ).sort((a, b) => a - b)
      : previous.filter((number) => number !== seasonNumber);
    get().restoreSeen(id, next);
    return { previous, next };
  },

  restoreSeen: (id, seenSeasons) => {
    const shows = get().shows.map((show) => (show.id === id ? { ...show, seenSeasons } : show));
    set({ shows });
    persist(shows);
  },

  updateSnapshot: (snapshot) => {
    if (!get().shows.some((show) => show.id === snapshot.id)) return;
    const shows = get().shows.map((show) => (show.id === snapshot.id ? { ...show, snapshot } : show));
    set({ shows });
    persist(shows);
  },

  replaceAll: (next) => {
    set({ shows: next.shows });
    persist(next.shows);
  },

  refreshAll: async () => {
    if (get().refreshing) return [];
    set({ refreshing: true });
    try {
      const now = new Date();
      const results = await Promise.allSettled(get().shows.map((show) => fetchSnapshot(show.id, now)));
      const fresh = new Map<number, ShowSnapshot>();
      for (const result of results) {
        if (result.status === 'fulfilled') fresh.set(result.value.id, result.value);
      }
      const alerts: ShowAlert[] = [];
      const shows = get().shows.map((show) => {
        const snapshot = fresh.get(show.id);
        if (!snapshot) return show;
        alerts.push(...pendingAlerts(snapshot, show.notified, now));
        return { ...show, snapshot, notified: mergeNotified(show.notified, snapshot) };
      });
      set({ shows });
      persist(shows);
      await presentAlerts(alerts).catch(() => {});
      return alerts;
    } finally {
      set({ refreshing: false });
    }
  },
}));

export function useIsFollowing(id: number): boolean {
  return useWatchlist((state) => state.shows.some((show) => show.id === id));
}
