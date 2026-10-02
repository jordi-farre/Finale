import { View } from 'react-native';
import { Text, useTheme, type MD3Theme } from 'react-native-paper';

import { statusLabel } from '@/lib/shows';
import type { ShowStatus } from '@/lib/types';

type Props = {
  status: ShowStatus;
};

function chipColors(status: ShowStatus, colors: MD3Theme['colors']) {
  switch (status) {
    case 'cancelled':
      return { background: colors.errorContainer, text: colors.onErrorContainer };
    case 'ended':
      return { background: colors.secondaryContainer, text: colors.onSecondaryContainer };
    case 'returning':
      return { background: colors.primaryContainer, text: colors.onPrimaryContainer };
    case 'in-production':
    case 'planned':
      return { background: colors.tertiaryContainer, text: colors.onTertiaryContainer };
    default:
      return { background: colors.surfaceVariant, text: colors.onSurfaceVariant };
  }
}

export function StatusChip({ status }: Props) {
  const theme = useTheme();
  const { background, text } = chipColors(status, theme.colors);
  return (
    <View className="self-start rounded-full px-md py-xs" style={{ backgroundColor: background }}>
      <Text variant="labelMedium" style={{ color: text }}>
        {statusLabel(status)}
      </Text>
    </View>
  );
}
