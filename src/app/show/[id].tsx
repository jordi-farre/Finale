import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { ActivityIndicator, Appbar, Button, Card, Icon, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Poster } from '@/components/Poster';
import { StatusChip } from '@/components/StatusChip';
import { endingNote, seasonSummary } from '@/lib/shows';
import { fetchSnapshot } from '@/lib/tmdb';
import type { ShowSnapshot } from '@/lib/types';
import { useIsFollowing, useWatchlist } from '@/store/useWatchlist';

export default function ShowScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showId = Number(id);
  const stored = useWatchlist((state) => state.shows.find((show) => show.id === showId)?.snapshot);
  const following = useIsFollowing(showId);
  const follow = useWatchlist((state) => state.follow);
  const unfollow = useWatchlist((state) => state.unfollow);
  const updateSnapshot = useWatchlist((state) => state.updateSnapshot);

  const [fetched, setFetched] = useState<ShowSnapshot | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    fetchSnapshot(showId)
      .then((snapshot) => {
        if (!active) return;
        setFetched(snapshot);
        updateSnapshot(snapshot);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [showId, updateSnapshot]);

  const snapshot = fetched ?? stored ?? null;
  const summary = snapshot ? seasonSummary(snapshot.latestSeason) : null;
  const ending = snapshot ? endingNote(snapshot) : null;
  const ready = snapshot?.latestSeason.kind === 'complete';

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={snapshot?.name ?? ''} />
      </Appbar.Header>

      {!snapshot ? (
        error ? (
          <Text variant="bodyMedium" className="p-md" style={{ color: theme.colors.error }}>
            Couldn&apos;t load this show. Check your connection and try again.
          </Text>
        ) : (
          <ActivityIndicator className="mt-lg" />
        )
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: insets.bottom + 24 }}>
          <View className="flex-row gap-md">
            <Poster path={snapshot.posterPath} width={120} />
            <View className="flex-1 gap-sm">
              <Text variant="headlineSmall">{snapshot.name}</Text>
              {snapshot.firstAirYear ? (
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                  {`${snapshot.firstAirYear} · ${snapshot.seasonCount} season${snapshot.seasonCount === 1 ? '' : 's'}`}
                </Text>
              ) : null}
              <StatusChip status={snapshot.status} />
            </View>
          </View>

          {ending ? (
            <Card
              mode="contained"
              style={{
                backgroundColor:
                  snapshot.status === 'cancelled' ? theme.colors.errorContainer : theme.colors.secondaryContainer,
              }}>
              <Card.Content className="flex-row items-center gap-sm">
                <Icon
                  source={snapshot.status === 'cancelled' ? 'alert-circle-outline' : 'check-circle-outline'}
                  size={24}
                  color={
                    snapshot.status === 'cancelled' ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer
                  }
                />
                <Text
                  variant="bodyMedium"
                  className="flex-1"
                  style={{
                    color:
                      snapshot.status === 'cancelled'
                        ? theme.colors.onErrorContainer
                        : theme.colors.onSecondaryContainer,
                  }}>
                  {ending}
                </Text>
              </Card.Content>
            </Card>
          ) : null}

          {summary ? (
            <Card mode="outlined">
              <Card.Content className="gap-xs">
                <Text variant="labelLarge" style={{ color: ready ? theme.colors.primary : theme.colors.onSurfaceVariant }}>
                  {ready ? 'Ready to binge' : 'Latest season'}
                </Text>
                <Text variant="bodyLarge">{summary}</Text>
              </Card.Content>
            </Card>
          ) : null}

          <Button
            mode={following ? 'outlined' : 'contained'}
            icon={following ? 'check' : 'plus'}
            onPress={() => (following ? unfollow(snapshot.id) : follow(snapshot))}>
            {following ? 'Following' : 'Follow'}
          </Button>

          {snapshot.overview ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {snapshot.overview}
            </Text>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}
