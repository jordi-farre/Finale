import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Appbar, Button, Card, Icon, Snackbar, Text, useTheme } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Poster } from '@/components/Poster';
import { RatingLabel } from '@/components/RatingLabel';
import { SeasonRow } from '@/components/SeasonRow';
import { ShowPageSkeleton } from '@/components/Skeleton';
import { StatusChip } from '@/components/StatusChip';
import { useNotificationPermission } from '@/hooks/use-notification-permission';
import { canNotify, endingNote, followHint, isWatchlistOnly } from '@/lib/shows';
import { fetchSnapshot } from '@/lib/tmdb';
import type { ShowSnapshot } from '@/lib/types';
import { useAlertSettings } from '@/store/useAlertSettings';
import { useWatchlist } from '@/store/useWatchlist';

export default function ShowScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const showId = Number(id);
  const followed = useWatchlist((state) => state.shows.find((show) => show.id === showId));
  const follow = useWatchlist((state) => state.follow);
  const unfollow = useWatchlist((state) => state.unfollow);
  const setSeen = useWatchlist((state) => state.setSeen);
  const restoreSeen = useWatchlist((state) => state.restoreSeen);
  const updateSnapshot = useWatchlist((state) => state.updateSnapshot);
  const notifications = useNotificationPermission();
  const alertsEnabled = useAlertSettings((state) => state.enabled);

  const [fetched, setFetched] = useState<ShowSnapshot | null>(null);
  const [error, setError] = useState(false);
  const [notice, setNotice] = useState<{ message: string; undo: () => void } | null>(null);

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

  const snapshot = fetched ?? followed?.snapshot ?? null;
  const following = followed !== undefined;
  const seenSeasons = followed?.seenSeasons ?? [];

  function startFollowing(current: ShowSnapshot) {
    follow(current);
    if (alertsEnabled && canNotify(current)) void notifications.request();
  }

  function toggleSeen(current: ShowSnapshot, seasonNumber: number) {
    if (!following) startFollowing(current);
    const { previous, next } = setSeen(current.id, seasonNumber, !seenSeasons.includes(seasonNumber));
    const added = next.length - previous.length;
    const marked = added > 1 ? `${added} seasons marked as seen` : null;
    if (!following) {
      setNotice({
        message: [
          isWatchlistOnly(current) ? `Added ${current.name} to your watchlist` : `Now following ${current.name}`,
          marked,
        ]
          .filter(Boolean)
          .join(' · '),
        undo: () => unfollow(current.id),
      });
    } else if (marked) {
      setNotice({ message: marked, undo: () => restoreSeen(current.id, previous) });
    }
  }

  if (!snapshot) {
    return (
      <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
        <Appbar.Header>
          <Appbar.BackAction onPress={() => router.back()} />
        </Appbar.Header>
        {error ? (
          <Text variant="bodyMedium" className="p-md" style={{ color: theme.colors.error }}>
            Couldn&apos;t load this show. Check your connection and try again.
          </Text>
        ) : (
          <ShowPageSkeleton />
        )}
      </View>
    );
  }

  const ending = endingNote(snapshot);
  const cancelled = snapshot.status === 'cancelled';

  const watchlistOnly = isWatchlistOnly(snapshot);
  const notifies = canNotify(snapshot);
  const showDisabledNote = following && !alertsEnabled && notifies;
  const showBlockedWarning = following && alertsEnabled && notifies && notifications.status === 'blocked';

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title={snapshot.name} />
      </Appbar.Header>

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
            {snapshot.rating ? <RatingLabel rating={snapshot.rating} withVotes /> : null}
          </View>
        </View>

        {ending ? (
          <Card
            mode="contained"
            style={{ backgroundColor: cancelled ? theme.colors.errorContainer : theme.colors.secondaryContainer }}>
            <Card.Content className="flex-row items-center gap-sm">
              <Icon
                source={cancelled ? 'alert-circle-outline' : 'check-circle-outline'}
                size={24}
                color={cancelled ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer}
              />
              <Text
                variant="bodyMedium"
                className="flex-1"
                style={{ color: cancelled ? theme.colors.onErrorContainer : theme.colors.onSecondaryContainer }}>
                {ending}
              </Text>
            </Card.Content>
          </Card>
        ) : null}

        <View className="gap-sm">
          <Button
            mode={following ? 'outlined' : 'contained'}
            icon={
              watchlistOnly
                ? following
                  ? 'playlist-check'
                  : 'playlist-plus'
                : following
                  ? 'bell-check-outline'
                  : 'bell-plus-outline'
            }
            onPress={() => (following ? unfollow(snapshot.id) : startFollowing(snapshot))}>
            {watchlistOnly ? (following ? 'In watchlist' : 'Add to watchlist') : following ? 'Following' : 'Follow'}
          </Button>
          {alertsEnabled || !notifies ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              {followHint(snapshot, following)}
            </Text>
          ) : null}
          {showDisabledNote ? (
            <View
              className="flex-row items-center gap-sm rounded-md p-sm"
              style={{ backgroundColor: theme.colors.surfaceVariant }}>
              <Icon source="bell-off-outline" size={20} color={theme.colors.onSurfaceVariant} />
              <Text variant="bodySmall" className="flex-1" style={{ color: theme.colors.onSurfaceVariant }}>
                Season notifications are turned off.
              </Text>
              <Button compact onPress={() => router.push('/settings')}>
                Settings
              </Button>
            </View>
          ) : null}
          {showBlockedWarning ? (
            <View
              className="flex-row items-center gap-sm rounded-md p-sm"
              style={{ backgroundColor: theme.colors.errorContainer }}>
              <Icon source="bell-off-outline" size={20} color={theme.colors.onErrorContainer} />
              <Text variant="bodySmall" className="flex-1" style={{ color: theme.colors.onErrorContainer }}>
                Notifications are off for Finale, so you won&apos;t get season alerts.
              </Text>
              <Button compact textColor={theme.colors.onErrorContainer} onPress={() => void Linking.openSettings()}>
                Settings
              </Button>
            </View>
          ) : null}
        </View>

        {snapshot.seasons.length > 0 ? (
          <View>
            <Text variant="titleMedium">Seasons</Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Tick the seasons you&apos;ve seen. The rest show up as ready to binge.
            </Text>
            {snapshot.seasons.map((season) => (
              <SeasonRow
                key={season.seasonNumber}
                season={season}
                latest={snapshot.latestSeason}
                seen={seenSeasons.includes(season.seasonNumber)}
                onToggleSeen={() => toggleSeen(snapshot, season.seasonNumber)}
              />
            ))}
          </View>
        ) : null}

        {snapshot.overview ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            {snapshot.overview}
          </Text>
        ) : null}
      </ScrollView>

      <Snackbar
        visible={notice !== null && following}
        onDismiss={() => setNotice(null)}
        duration={5000}
        action={{
          label: 'Undo',
          onPress: () => {
            notice?.undo();
            setNotice(null);
          },
        }}>
        {notice?.message ?? ''}
      </Snackbar>
    </View>
  );
}
