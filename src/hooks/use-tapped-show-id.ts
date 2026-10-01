import { useLastNotificationResponse } from 'expo-notifications';

import { showIdFromResponse } from '@/lib/notifications';

export function useTappedShowId(): number | null {
  return showIdFromResponse(useLastNotificationResponse());
}
