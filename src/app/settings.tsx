import * as Application from 'expo-application';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { router } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';
import { Appbar, Button, SegmentedButtons, Switch, Text, useTheme } from 'react-native-paper';

import { useNotificationPermission } from '@/hooks/use-notification-permission';
import { useAlertSettings } from '@/store/useAlertSettings';
import { useThemePreference, type ThemePreference } from '@/store/useThemePreference';

function versionLabel(): string {
  const version = Constants.expoConfig?.version ?? '';
  const build = Constants.executionEnvironment === ExecutionEnvironment.StoreClient ? null : Application.nativeBuildVersion;
  return build ? `Finale ${version} (${build})` : `Finale ${version}`;
}

export default function SettingsScreen() {
  const theme = useTheme();
  const preference = useThemePreference((state) => state.preference);
  const setPreference = useThemePreference((state) => state.setPreference);
  const alertsEnabled = useAlertSettings((state) => state.enabled);
  const setAlertsEnabled = useAlertSettings((state) => state.setEnabled);
  const notifications = useNotificationPermission();

  function handleToggleAlerts(enabled: boolean) {
    setAlertsEnabled(enabled);
    if (enabled) void notifications.request();
  }

  return (
    <View className="flex-1" style={{ backgroundColor: theme.colors.background }}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Settings" />
      </Appbar.Header>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 32 }}>
        <View className="gap-sm">
          <Text variant="titleMedium">Theme</Text>
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
              <Text variant="titleMedium">Season notifications</Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                When a season of a show you follow starts, when it&apos;s complete, and if a show is cancelled.
              </Text>
            </View>
            <Switch value={alertsEnabled} onValueChange={handleToggleAlerts} accessibilityLabel="Season notifications" />
          </View>

          {alertsEnabled && notifications.status === 'blocked' ? (
            <View
              className="flex-row items-center justify-between rounded-md p-sm"
              style={{ backgroundColor: theme.colors.errorContainer }}>
              <Text variant="bodyMedium" className="flex-1" style={{ color: theme.colors.onErrorContainer }}>
                Blocked in system settings
              </Text>
              <Button textColor={theme.colors.onErrorContainer} onPress={() => void Linking.openSettings()}>
                Open Settings
              </Button>
            </View>
          ) : null}
        </View>

        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
          {versionLabel()}
        </Text>
      </ScrollView>
    </View>
  );
}
