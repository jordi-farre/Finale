import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';
import { Appbar, Button, SegmentedButtons, Switch, Text, useTheme } from 'react-native-paper';

import { BackupSection } from '@/components/BackupSection';
import { useNotificationPermission } from '@/hooks/use-notification-permission';
import { nextAlertText, nextPlannedAlert } from '@/lib/alerts';
import { lastCheckText, readLastBackgroundRefresh } from '@/lib/backgroundRefresh';
import { syncScheduledAlerts } from '@/lib/notifications';
import { versionLabel } from '@/lib/version';
import { useAlertSettings } from '@/store/useAlertSettings';
import { useThemePreference, type ThemePreference } from '@/store/useThemePreference';
import { useWatchlist } from '@/store/useWatchlist';

function currentVersionLabel(): string {
  const buildProfile = Constants.expoConfig?.extra?.buildProfile;
  return versionLabel({
    version: Constants.expoConfig?.version ?? '',
    buildProfile: typeof buildProfile === 'string' ? buildProfile : null,
    buildNumber: Application.nativeBuildVersion,
  });
}

export default function SettingsScreen() {
  const theme = useTheme();
  const preference = useThemePreference((state) => state.preference);
  const setPreference = useThemePreference((state) => state.setPreference);
  const alertsEnabled = useAlertSettings((state) => state.enabled);
  const setAlertsEnabled = useAlertSettings((state) => state.setEnabled);
  const notifications = useNotificationPermission();
  const shows = useWatchlist((state) => state.shows);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);

  useEffect(() => {
    let active = true;
    void readLastBackgroundRefresh().then((date) => {
      if (active) setLastCheck(date);
    });
    return () => {
      active = false;
    };
  }, []);

  function handleToggleAlerts(enabled: boolean) {
    setAlertsEnabled(enabled);
    void syncScheduledAlerts(useWatchlist.getState().shows);
    if (enabled) void notifications.request();
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 24 }}>
        <View className="gap-sm">
          <Text variant="labelLarge">Theme</Text>
          <SegmentedButtons
            value={preference}
            onValueChange={(value) => setPreference(value as ThemePreference)}
            buttons={[
              { value: 'system', label: 'System', icon: 'theme-light-dark' },
              { value: 'light', label: 'Light', icon: 'white-balance-sunny' },
              { value: 'dark', label: 'Dark', icon: 'moon-waning-crescent' },
            ]}
          />
        </View>

        <View className="gap-sm">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-md">
              <Text variant="labelLarge">Season notifications</Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                When a season of a show you follow starts, when it&apos;s complete, and if a show is cancelled.
              </Text>
            </View>
            <Switch value={alertsEnabled} onValueChange={handleToggleAlerts} accessibilityLabel="Season notifications" />
          </View>

          {alertsEnabled && notifications.status === 'blocked' ? (
            <View
              className="flex-row items-center justify-between rounded-md p-sm"
              style={{ backgroundColor: theme.colors.errorContainer }}>
              <Text variant="bodySmall" className="flex-1" style={{ color: theme.colors.onErrorContainer }}>
                Blocked in system settings
              </Text>
              <Button textColor={theme.colors.onErrorContainer} onPress={() => void Linking.openSettings()}>
                Open Settings
              </Button>
            </View>
          ) : null}

          {alertsEnabled ? (
            <View className="gap-xs">
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {nextAlertText(nextPlannedAlert(shows))}
              </Text>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                {lastCheckText(lastCheck)}
              </Text>
            </View>
          ) : null}
        </View>

        <BackupSection />

        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {currentVersionLabel()}
        </Text>
      </ScrollView>
    </View>
  );
}
