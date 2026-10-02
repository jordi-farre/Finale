import { router } from 'expo-router';

import FinishedScreen from '@/app/finished';
import { useWatchlist } from '@/store/useWatchlist';
import { followed } from '@/test-utils/fixtures';
import { fireEvent, render, screen } from '@/test-utils/render';

jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

describe('finished shows', () => {
  it('explains what ends up here when empty', async () => {
    useWatchlist.setState({ hydrated: true, shows: [followed()] });
    await render(<FinishedScreen />);
    expect(screen.getByText('No finished shows yet')).toBeOnTheScreen();
  });

  it('lists only shows that are over and fully seen', async () => {
    useWatchlist.setState({
      hydrated: true,
      shows: [
        followed({ id: 1, name: 'Severance' }, { seenSeasons: [1, 2] }),
        followed({ id: 2, name: 'Firefly', status: 'cancelled' }, { seenSeasons: [1, 2] }),
        followed({ id: 3, name: 'Lost', status: 'ended' }, { seenSeasons: [1] }),
      ],
    });
    await render(<FinishedScreen />);
    expect(screen.getByLabelText('Firefly')).toBeOnTheScreen();
    expect(screen.getByText('Seen in full · 2 seasons')).toBeOnTheScreen();
    expect(screen.queryByLabelText('Severance')).toBeNull();
    expect(screen.queryByLabelText('Lost')).toBeNull();
  });

  it('opens a finished show', async () => {
    useWatchlist.setState({
      hydrated: true,
      shows: [followed({ id: 7, name: 'Firefly', status: 'cancelled' }, { seenSeasons: [1, 2] })],
    });
    await render(<FinishedScreen />);
    await fireEvent.press(screen.getByLabelText('Firefly'));
    expect(router.push).toHaveBeenCalledWith('/show/7');
  });
});
