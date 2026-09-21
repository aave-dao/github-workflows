const { appendFileSync } = require('node:fs');

const BASELINE = 'v1.8.3';
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;

async function validateVersion(requested, fetchRelease, now = Date.now()) {
  const version = requested || BASELINE;
  if (!/^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(version)) {
    throw new Error('Foundry version must be an exact stable release: vX.Y.Z.');
  }
  const parts = version.slice(1).split('.').map(BigInt);
  const baseline = BASELINE.slice(1).split('.').map(BigInt);
  const different = parts.findIndex((part, i) => part !== baseline[i]);
  if (different !== -1 && parts[different] < baseline[different]) {
    throw new Error(`Foundry version must be at least ${BASELINE}.`);
  }
  // The reviewed baseline does not depend on release age or API availability.
  if (version === BASELINE) return version;

  const release = await fetchRelease(version);
  if (release.tag_name !== version || release.draft !== false || release.prerelease !== false) {
    throw new Error('Foundry override must identify a published stable release.');
  }
  const published = typeof release.published_at === 'string'
    ? Date.parse(release.published_at) : NaN;
  if (!Number.isFinite(published) || now - published < COOLDOWN_MS) {
    throw new Error('Foundry override must have been published at least 14 days ago.');
  }
  return version;
}

async function fetchRelease(version) {
  const response = await fetch(`https://api.github.com/repos/foundry-rs/foundry/releases/tags/${version}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      ...(process.env.GH_TOKEN ? { Authorization: `Bearer ${process.env.GH_TOKEN}` } : {}),
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Cannot verify Foundry release: HTTP ${response.status}.`);
  return response.json();
}

if (require.main === module) {
  validateVersion(process.env.REQUESTED_FOUNDRY_VERSION, fetchRelease)
    .then(version => appendFileSync(process.env.GITHUB_OUTPUT, `version=${version}\n`))
    .catch(error => {
      console.error(error.message);
      process.exitCode = 1;
    });
}

module.exports = { BASELINE, COOLDOWN_MS, validateVersion };
