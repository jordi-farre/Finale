import { View } from 'react-native';
import { Icon, Text, TouchableRipple, useTheme } from 'react-native-paper';

import { seasonDetailLine, seasonStateLabel } from '@/lib/shows';
import type { SeasonInfo, SeasonState } from '@/lib/types';

type Props = {
  season: SeasonInfo;
  latest: SeasonState;
  seen: boolean;
  onToggleSeen: () => void;
};

export function SeasonRow({ season, latest, seen, onToggleSeen }: Props) {
  const theme = useTheme();
  const canMark = season.state === 'complete';
  const stateColor =
    season.state === 'complete'
      ? theme.colors.primary
      : season.state === 'airing'
        ? theme.colors.tertiary
        : theme.colors.onSurfaceVariant;
  const detail = seasonDetailLine(season);
  const label = `Season ${season.seasonNumber}`;

  return (
    <TouchableRipple
      onPress={canMark ? onToggleSeen : undefined}
      disabled={!canMark}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: seen, disabled: !canMark }}
      accessibilityLabel={`${label}, ${seen ? 'seen' : 'not seen'}`}>
      <View className="flex-row items-center gap-sm py-sm">
        <View className="flex-1 gap-xs">
          <Text variant="titleMedium">{label}</Text>
          <Text variant="bodySmall" style={{ color: stateColor }}>
            {seasonStateLabel(season, latest)}
          </Text>
          {detail ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              {detail}
            </Text>
          ) : null}
        </View>
        {canMark ? (
          <View className="items-center gap-xs" importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            <Icon
              source={seen ? 'checkbox-marked' : 'checkbox-blank-outline'}
              size={26}
              color={seen ? theme.colors.primary : theme.colors.onSurfaceVariant}
            />
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Seen
            </Text>
          </View>
        ) : null}
      </View>
    </TouchableRipple>
  );
}
