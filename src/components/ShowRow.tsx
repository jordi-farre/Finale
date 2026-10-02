import { View } from 'react-native';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';

import { Poster } from '@/components/Poster';
import { StatusChip } from '@/components/StatusChip';
import type { ShowStatus } from '@/lib/types';

type Props = {
  name: string;
  year: string | null;
  posterPath: string | null;
  status?: ShowStatus;
  detail?: string | null;
  onPress: () => void;
};

export function ShowRow({ name, year, posterPath, status, detail, onPress }: Props) {
  const theme = useTheme();
  return (
    <TouchableRipple onPress={onPress} accessibilityRole="button" accessibilityLabel={name}>
      <View className="flex-row gap-md px-md py-md">
        <Poster path={posterPath} width={72} />
        <View className="flex-1 justify-center gap-xs">
          <Text variant="titleLarge" numberOfLines={2}>
            {name}
            {year ? (
              <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
                {` (${year})`}
              </Text>
            ) : null}
          </Text>
          {status ? <StatusChip status={status} /> : null}
          {detail ? (
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {detail}
            </Text>
          ) : null}
        </View>
      </View>
    </TouchableRipple>
  );
}
