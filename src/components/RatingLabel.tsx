import { View } from 'react-native';
import { Icon, Text, useTheme } from 'react-native-paper';

import { formatVotes } from '@/lib/shows';
import type { ShowRating } from '@/lib/types';

type Props = {
  rating: ShowRating;
  withVotes?: boolean;
};

export function RatingLabel({ rating, withVotes = false }: Props) {
  const theme = useTheme();
  const score = rating.score.toFixed(1);
  const votes = formatVotes(rating.votes);
  return (
    <View
      className="flex-row items-center gap-xs"
      accessible
      accessibilityLabel={withVotes ? `Rated ${score} from ${votes} votes` : `Rated ${score}`}>
      <Icon source="star" size={14} color={theme.colors.primary} />
      <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
        {withVotes ? `${score} · ${votes} votes` : score}
      </Text>
    </View>
  );
}
