import { View } from 'react-native';
import { Button, Icon, Text, useTheme } from 'react-native-paper';

type Props = {
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: string;
};

export function EmptyState({ title, message, actionLabel, onAction, icon = 'television-classic' }: Props) {
  const theme = useTheme();
  return (
    <View className="flex-1 items-center justify-center gap-sm px-lg">
      <Icon source={icon} size={56} color={theme.colors.onSurfaceVariant} />
      <Text variant="titleMedium" style={{ textAlign: 'center' }}>
        {title}
      </Text>
      <Text variant="bodyMedium" style={{ textAlign: 'center', color: theme.colors.onSurfaceVariant }}>
        {message}
      </Text>
      {actionLabel && onAction ? (
        <Button mode="contained" onPress={onAction} className="mt-sm">
          {actionLabel}
        </Button>
      ) : null}
    </View>
  );
}
