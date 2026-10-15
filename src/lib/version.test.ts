import { versionLabel } from './version';

describe('versionLabel', () => {
  it('shows only the version on a production build', () => {
    expect(versionLabel({ version: '1.2.0', buildProfile: 'production', buildNumber: '23' })).toBe('Finale 1.2.0');
  });

  it('adds the build number to a preview build', () => {
    expect(versionLabel({ version: '1.2.0', buildProfile: 'preview', buildNumber: '23' })).toBe(
      'Finale 1.2.0 · preview 23',
    );
  });

  it('marks a development build', () => {
    expect(versionLabel({ version: '1.2.0', buildProfile: 'development', buildNumber: '4' })).toBe(
      'Finale 1.2.0 · development',
    );
  });

  it('shows only the version outside an EAS build', () => {
    expect(versionLabel({ version: '1.2.0', buildProfile: null, buildNumber: null })).toBe('Finale 1.2.0');
  });
});
