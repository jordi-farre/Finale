import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import {
  getNotificationPermissionStatus,
  requestNotificationPermission,
  type NotificationPermissionStatus,
} from '@/lib/notifications';

export function useNotificationPermission() {
  const [status, setStatus] = useState<NotificationPermissionStatus>('undetermined');

  useEffect(() => {
    let active = true;
    function refresh() {
      void getNotificationPermissionStatus()
        .then((next) => {
          if (active) setStatus(next);
        })
        .catch(() => {});
    }
    refresh();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  const request = useCallback(async () => {
    const next = await requestNotificationPermission().catch(() => 'undetermined' as const);
    setStatus(next);
    return next;
  }, []);

  return { status, request };
}
