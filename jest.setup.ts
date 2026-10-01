import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanup } from '@testing-library/react-native';

jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

require('react-native-reanimated').setUpTests();

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  setNotificationChannelAsync: jest.fn().mockResolvedValue(null),
  getPermissionsAsync: jest.fn().mockResolvedValue({ granted: false, canAskAgain: true }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ granted: true, canAskAgain: true }),
  scheduleNotificationAsync: jest.fn().mockResolvedValue('mock-notification-id'),
  useLastNotificationResponse: jest.fn(() => null),
  AndroidImportance: { DEFAULT: 3 },
}));

jest.mock('@/lib/token', () => ({ readTmdbToken: jest.fn(() => 'test-token') }));

afterEach(async () => {
  cleanup();
  await AsyncStorage.clear();
  const { readTmdbToken } = require('@/lib/token');
  if (jest.isMockFunction(readTmdbToken)) readTmdbToken.mockReturnValue('test-token');
  const { useWatchlist } = require('@/store/useWatchlist');
  useWatchlist.setState({ shows: [], hydrated: false, refreshing: false });
});
