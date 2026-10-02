import { router } from 'expo-router';
import { RefreshControl, SectionList, View } from 'react-native';
import { Appbar, Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { MissingTokenBanner } from '@/components/MissingTokenBanner';
import { ShowRow } from '@/components/ShowRow';
import { watchlistDetail, watchlistGroup, type WatchlistGroup } from '@/lib/shows';
import type { FollowedShow } from '@/lib/types';
import { useWatchlist } from '@/store/useWatchlist';

const GROUPS: { key: WatchlistGroup; title: string }[] = [
  { key: 'ready', title: 'Ready to binge' },
  { key: 'airing', title: 'Season airing' },
  { key: 'waiting', title: 'Waiting for new episodes' },
];

export default function WatchlistScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const shows = useWatchlist((state) => state.shows);
  const refreshing = useWatchlist((state) => state.refreshing);
  const refreshAll = useWatchlist((state) => state.refreshAll);

  const sections = GROUPS.map((group) => ({
    key: group.key,
    title: group.title,
    data: shows
      .filter((show) => watchlistGroup(show) === group.key)
      .sort((a, b) => a.snapshot.name.localeCompare(b.snapshot.name)),
  })).filter((section) => section.data.length > 0);
  const finishedCount = shows.filter((show) => watchlistGroup(show) === 'done').length;
  const openFinished = () => router.push('/finished');

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.Content title="Watchlist" />
        <Appbar.Action icon="magnify" accessibilityLabel="Search shows" onPress={() => router.push('/search')} />
        <Appbar.Action icon="flag-checkered" accessibilityLabel="Finished shows" onPress={openFinished} />
        <Appbar.Action icon="cog-outline" accessibilityLabel="Settings" onPress={() => router.push('/settings')} />
      </Appbar.Header>
      <MissingTokenBanner />

      {shows.length === 0 ? (
        <EmptyState
          title="Nothing followed yet"
          message="Search for a show to see if it was cancelled. Follow it and you'll get a notification when a season starts and when it's complete."
          actionLabel="Search shows"
          onAction={() => router.push('/search')}
        />
      ) : sections.length === 0 ? (
        <EmptyState
          icon="check-all"
          title="All caught up"
          message="Every show you follow has ended and you've seen all of it. Find something new to start."
          actionLabel="Search shows"
          onAction={() => router.push('/search')}
        />
      ) : (
        <SectionList<FollowedShow>
          sections={sections}
          keyExtractor={(show) => String(show.id)}
          contentContainerStyle={{ paddingBottom: insets.bottom + 16 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void refreshAll()} />}
          stickySectionHeadersEnabled={false}
          renderSectionHeader={({ section }) => (
            <Text variant="titleMedium" className="px-md pb-xs pt-lg" style={{ color: theme.colors.primary }}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <ShowRow
              name={item.snapshot.name}
              year={item.snapshot.firstAirYear}
              posterPath={item.snapshot.posterPath}
              status={item.snapshot.status}
              detail={watchlistDetail(item)}
              onPress={() => router.push(`/show/${item.id}`)}
            />
          )}
          ListFooterComponent={
            finishedCount > 0 ? (
              <TouchableRipple onPress={openFinished} accessibilityRole="button" className="mt-md">
                <View className="flex-row items-center justify-center gap-sm py-md">
                  <Icon source="flag-checkered" size={20} color={theme.colors.onSurfaceVariant} />
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
                    {`${finishedCount} finished show${finishedCount === 1 ? '' : 's'}`}
                  </Text>
                  <Icon source="chevron-right" size={20} color={theme.colors.onSurfaceVariant} />
                </View>
              </TouchableRipple>
            ) : null
          }
        />
      )}
    </View>
  );
}
