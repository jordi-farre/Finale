import { useEffect } from 'react';
import { View, type DimensionValue } from 'react-native';
import { useTheme } from 'react-native-paper';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

type BlockProps = {
  width: DimensionValue;
  height: number;
  radius?: number;
  testID?: string;
};

export function SkeletonBlock({ width, height, radius = 6, testID }: BlockProps) {
  const theme = useTheme();
  const reducedMotion = useReducedMotion();
  const opacity = useSharedValue(1);

  useEffect(() => {
    if (reducedMotion) return;
    opacity.value = withRepeat(withTiming(0.45, { duration: 800 }), -1, true);
    return () => cancelAnimation(opacity);
  }, [opacity, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      testID={testID}
      style={[{ width, height, borderRadius: radius, backgroundColor: theme.colors.surfaceVariant }, animatedStyle]}
    />
  );
}

export function StatusPlaceholder() {
  return <SkeletonBlock width={64} height={20} radius={999} testID="status-placeholder" />;
}

export function ShowRowSkeleton() {
  return (
    <View className="flex-row gap-md px-md py-sm">
      <SkeletonBlock width={56} height={84} radius={8} />
      <View className="flex-1 justify-center gap-sm">
        <SkeletonBlock width="65%" height={18} />
        <StatusPlaceholder />
      </View>
    </View>
  );
}

export function SearchResultsSkeleton() {
  return (
    <View accessible accessibilityLabel="Loading results">
      {[0, 1, 2, 3, 4].map((row) => (
        <ShowRowSkeleton key={row} />
      ))}
    </View>
  );
}

export function ShowPageSkeleton() {
  return (
    <View className="gap-md p-md" accessible accessibilityLabel="Loading show">
      <View className="flex-row gap-md">
        <SkeletonBlock width={120} height={180} radius={8} />
        <View className="flex-1 gap-sm pt-xs">
          <SkeletonBlock width="80%" height={26} />
          <SkeletonBlock width="45%" height={16} />
          <SkeletonBlock width={72} height={22} radius={999} />
        </View>
      </View>
      <SkeletonBlock width="100%" height={40} radius={20} />
      <View className="gap-md pt-sm">
        <SkeletonBlock width="30%" height={18} />
        {[0, 1, 2].map((row) => (
          <View key={row} className="gap-xs">
            <SkeletonBlock width="35%" height={18} />
            <SkeletonBlock width="50%" height={14} />
          </View>
        ))}
      </View>
    </View>
  );
}
