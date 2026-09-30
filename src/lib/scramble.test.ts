import { scramble, unscramble } from '@/lib/scramble';

const TOKEN = 'eyJhbGciOiJIUzI1NiJ9.eyJhdWQiOiJhYmMifQ.signature';
const KEY = '9f3a61c2d4e8b7055a1c3e9d2f4b6a8c0e1d2c3b4a5968778695a4b3c2d1e0f1';

describe('scramble', () => {
  it('round-trips the token', () => {
    expect(unscramble(scramble(TOKEN, KEY), KEY)).toBe(TOKEN);
  });

  it('hides the recognisable token shape', () => {
    const scrambled = scramble(TOKEN, KEY);
    expect(scrambled).toMatch(/^[0-9a-f]+$/);
    expect(scrambled).not.toContain('eyJ');
    expect(scrambled).not.toContain('65794a');
  });

  it('cycles the key for text longer than the key', () => {
    const long = 'x'.repeat(100);
    expect(unscramble(scramble(long, 'ab'), 'ab')).toBe(long);
  });
});
