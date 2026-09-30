import { View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import { hasTmdbToken } from '@/lib/tmdb';

export function MissingTokenBanner() {
  const theme = useTheme();
  if (hasTmdbToken()) return null;
  return (
    <View
      className="mx-md mb-sm flex-row items-center gap-sm rounded-md p-md"
      style={{ backgroundColor: theme.colors.errorContainer }}>
      <Icon source="key-alert-outline" size={24} color={theme.colors.onErrorContainer} />
      <Text variant="bodyMedium" className="flex-1" style={{ color: theme.colors.onErrorContainer }}>
        No TMDB token found. Add TMDB_TOKEN to .env.local and restart with npx expo start --clear.
      </Text>
    </View>
  );
}
