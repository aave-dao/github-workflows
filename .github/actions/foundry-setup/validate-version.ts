import { appendFile } from 'node:fs/promises';

export const BASELINE = 'v1.8.3';
export const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000;

export type Release = {
  tag_name?: string;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string | null;
};

export async function validateVersion(
  requested: string | undefined,
  fetchRelease: (version: string) => Promise<Release>,
  now = Date.now(),
): Promise<string> {
  const version = requested;
  if (typeof version !== 'string' || !/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('Foundry version must be an exact stable release: vX.Y.Z.');
  }
  const parts = version.slice(1).split('.').map(BigInt);
  const baseline = BASELINE.slice(1).split('.').map(BigInt);
  const different = parts.findIndex((part, i) => part !== baseline[i]);
  if (different !== -1 && parts[different] < baseline[different]) {
    throw new Error(`Foundry version must be at least ${BASELINE}.`);
  }
  const release = await fetchRelease(version);
  if (release.tag_name !== version || release.draft !== false || release.prerelease !== false) {
    throw new Error('Foundry version must identify a published stable release.');
  }
  const published = typeof release.published_at === 'string'
    ? Date.parse(release.published_at) : NaN;
  if (!Number.isFinite(published) || now - published < COOLDOWN_MS) {
    throw new Error('Foundry version must have been published at least 7 days ago.');
  }
  return version;
}

async function fetchRelease(version: string): Promise<Release> {
  const response = await fetch(`https://api.github.com/repos/foundry-rs/foundry/releases/tags/${version}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Cannot verify Foundry release: HTTP ${response.status}.`);
  return await response.json() as Release;
}

if (import.meta.main) {
  try {
    const version = await validateVersion(process.env.REQUESTED_FOUNDRY_VERSION, fetchRelease);
    const output = process.env.GITHUB_OUTPUT;
    if (!output) throw new Error('GITHUB_OUTPUT is required.');
    await appendFile(output, `version=${version}\n`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
