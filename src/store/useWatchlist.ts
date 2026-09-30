import { create } from 'zustand';

import { load, save } from '@/lib/storage';
import { fetchSnapshot } from '@/lib/tmdb';
import type { FollowedShow, ShowSnapshot } from '@/lib/types';

type WatchlistState = {
  shows: FollowedShow[];
  hydrated: boolean;
  refreshing: boolean;
  hydrate: () => Promise<void>;
  follow: (snapshot: ShowSnapshot) => void;
  unfollow: (id: number) => void;
  updateSnapshot: (snapshot: ShowSnapshot) => void;
  refreshAll: () => Promise<void>;
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
    const shows = [...get().shows, { id: snapshot.id, followedAt: new Date().toISOString(), snapshot }];
    set({ shows });
    persist(shows);
  },

  unfollow: (id) => {
    const shows = get().shows.filter((show) => show.id !== id);
    set({ shows });
    persist(shows);
  },

  updateSnapshot: (snapshot) => {
    if (!get().shows.some((show) => show.id === snapshot.id)) return;
    const shows = get().shows.map((show) => (show.id === snapshot.id ? { ...show, snapshot } : show));
    set({ shows });
    persist(shows);
  },

  refreshAll: async () => {
    if (get().refreshing) return;
    set({ refreshing: true });
    try {
      const results = await Promise.allSettled(get().shows.map((show) => fetchSnapshot(show.id)));
      const fresh = new Map<number, ShowSnapshot>();
      for (const result of results) {
        if (result.status === 'fulfilled') fresh.set(result.value.id, result.value);
      }
      const shows = get().shows.map((show) => {
        const snapshot = fresh.get(show.id);
        return snapshot ? { ...show, snapshot } : show;
      });
      set({ shows });
      persist(shows);
    } finally {
      set({ refreshing: false });
    }
  },
}));

export function useIsFollowing(id: number): boolean {
  return useWatchlist((state) => state.shows.some((show) => show.id === id));
}
