import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, View } from 'react-native';
import { ActivityIndicator, Appbar, Searchbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { MissingProxyBanner } from '@/components/MissingProxyBanner';
import { ShowRow } from '@/components/ShowRow';
import { mapStatus, showRating } from '@/lib/shows';
import { getShow, searchShows, type TmdbSearchResult } from '@/lib/tmdb';
import type { ShowRating, ShowStatus } from '@/lib/types';

const DEBOUNCE_MS = 400;
const STATUS_LOOKUPS = 10;

type ResultInfo = {
  status: ShowStatus;
  rating: ShowRating | null;
};

type SearchResponse = {
  query: string;
  results: TmdbSearchResult[];
  error: boolean;
};

export default function SearchScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const [response, setResponse] = useState<SearchResponse>({ query: '', results: [], error: false });
  const [infos, setInfos] = useState<Record<number, ResultInfo>>({});
  const trimmed = query.trim();

  useEffect(() => {
    if (!trimmed) return;
    let active = true;
    const timer = setTimeout(async () => {
      try {
        const found = await searchShows(trimmed);
        if (!active) return;
        setResponse({ query: trimmed, results: found, error: false });
        const lookups = await Promise.allSettled(found.slice(0, STATUS_LOOKUPS).map((show) => getShow(show.id)));
        if (!active) return;
        const next: Record<number, ResultInfo> = {};
        for (const lookup of lookups) {
          if (lookup.status !== 'fulfilled') continue;
          next[lookup.value.id] = { status: mapStatus(lookup.value.status), rating: showRating(lookup.value) };
        }
        setInfos((previous) => ({ ...previous, ...next }));
      } catch {
        if (active) setResponse({ query: trimmed, results: [], error: true });
      }
    }, DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [trimmed]);

  const hasQuery = trimmed.length > 0;
  const loading = hasQuery && response.query !== trimmed;
  const results = hasQuery ? response.results : [];
  const error = hasQuery && !loading && response.error;

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Search" />
      </Appbar.Header>
      <MissingProxyBanner />
      <View className="px-md pb-sm">
        <Searchbar placeholder="Search TV shows" value={query} onChangeText={setQuery} autoFocus />
      </View>

      {loading && results.length === 0 ? <ActivityIndicator className="mt-lg" /> : null}
      {error ? (
        <Text variant="bodyMedium" className="px-md" style={{ color: theme.colors.error }}>
          Couldn&apos;t load shows. Check your connection and try again.
        </Text>
      ) : null}

      {!hasQuery ? (
        <EmptyState
          icon="magnify"
          title="Find a show"
          message="You'll see right away whether it's still going, ended, or was cancelled."
        />
      ) : !loading && !error && results.length === 0 ? (
        <EmptyState icon="television-off" title="No matches" message={`Nothing found for "${trimmed}".`} />
      ) : (
        <FlatList
          data={results}
          keyExtractor={(show) => String(show.id)}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          renderItem={({ item }) => (
            <ShowRow
              name={item.name}
              year={item.first_air_date ? item.first_air_date.slice(0, 4) : null}
              posterPath={item.poster_path}
              status={infos[item.id]?.status}
              rating={infos[item.id]?.rating}
              onPress={() => router.push(`/show/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}
