import { Image } from 'expo-image';
import { View } from 'react-native';
import { Icon, useTheme } from 'react-native-paper';

import { posterUrl } from '@/lib/tmdb';

type Props = {
  path: string | null;
  width: number;
};

export function Poster({ path, width }: Props) {
  const theme = useTheme();
  const height = Math.round(width * 1.5);
  const uri = posterUrl(path, width > 120 ? 'w342' : 'w185');
  return (
    <View
      className="items-center justify-center overflow-hidden rounded-sm"
      style={{ width, height, backgroundColor: theme.colors.surfaceVariant }}>
      {uri ? (
        <Image source={{ uri }} style={{ width, height }} contentFit="cover" transition={150} />
      ) : (
        <Icon source="television-classic" size={width / 2.5} color={theme.colors.onSurfaceVariant} />
      )}
    </View>
  );
}
