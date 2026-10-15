export type VersionInfo = {
  version: string;
  buildProfile: string | null;
  buildNumber: string | null;
};

export function versionLabel({ version, buildProfile, buildNumber }: VersionInfo): string {
  if (buildProfile === 'preview' && buildNumber) return `Finale ${version} · preview ${buildNumber}`;
  if (buildProfile === 'development') return `Finale ${version} · development`;
  return `Finale ${version}`;
}
