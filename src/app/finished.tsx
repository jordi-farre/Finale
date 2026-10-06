import { router } from 'expo-router';
import { FlatList, View } from 'react-native';
import { Appbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { ShowRow } from '@/components/ShowRow';
import { watchlistGroup } from '@/lib/shows';
import { useWatchlist } from '@/store/useWatchlist';

export default function FinishedScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const finished = useWatchlist((state) => state.shows)
    .filter((show) => watchlistGroup(show) === 'done')
    .sort((a, b) => a.snapshot.name.localeCompare(b.snapshot.name));

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Finished" />
      </Appbar.Header>

      {finished.length === 0 ? (
        <EmptyState
          icon="flag-checkered"
          title="No finished shows yet"
          message="When a show you follow has ended and you've seen every season, it moves here."
        />
      ) : (
        <FlatList
          data={finished}
          keyExtractor={(show) => String(show.id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          ListHeaderComponent={
            <Text variant="bodySmall" className="px-md pb-sm" style={{ color: theme.colors.onSurfaceVariant }}>
              Shows that are over and fully seen. If one comes back, or you untick a season, it returns to your
              watchlist.
            </Text>
          }
          renderItem={({ item }) => (
            <ShowRow
              name={item.snapshot.name}
              year={item.snapshot.firstAirYear}
              posterPath={item.snapshot.posterPath}
              status={item.snapshot.status}
              detail={`Seen in full · ${item.snapshot.seasonCount} season${item.snapshot.seasonCount === 1 ? '' : 's'}`}
              onPress={() => router.push(`/show/${item.id}`)}
            />
          )}
        />
      )}
    </View>
  );
}
