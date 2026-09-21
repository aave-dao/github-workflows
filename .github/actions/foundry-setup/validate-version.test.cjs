const { test } = require('node:test');
const assert = require('node:assert/strict');
const { BASELINE, COOLDOWN_MS, validateVersion } = require('./validate-version.cjs');

const now = Date.parse('2026-10-20T12:00:00Z');
const release = (version, overrides = {}) => ({
  tag_name: version,
  draft: false,
  prerelease: false,
  published_at: new Date(now - COOLDOWN_MS).toISOString(),
  ...overrides,
});
const noFetch = () => { throw new Error('API should not be called'); };

test('baseline requires verified release metadata and the full cooldown', async () => {
  assert.equal(await validateVersion(BASELINE, async v => release(v), now), BASELINE);
  await assert.rejects(validateVersion(BASELINE, async v => release(v, {
    published_at: new Date(now - COOLDOWN_MS + 1).toISOString(),
  }), now), /7 days/);
  await assert.rejects(validateVersion(BASELINE, async () => {
    throw new Error('HTTP 403');
  }, now), /HTTP 403/);
});

test('reject floating, malformed, prerelease and injectable input before fetching', async () => {
  for (const input of [undefined, '', 'stable', 'nightly', '^1.8.3', 'v1.8', '1.8.3', 'v01.8.3',
    'v1.9.0-rc.1', 'v1.9.0+build', ' v1.9.0', 'v1.9.0\n', '$(touch /tmp/invalid)']) {
    await assert.rejects(validateVersion(input, noFetch, now), /exact stable release/);
  }
});

test('reject versions below baseline numerically', async () => {
  for (const input of ['v1.8.0', 'v1.7.99', 'v0.99.99']) {
    await assert.rejects(validateVersion(input, noFetch, now), /at least v1.8.1/);
  }
});

test('accept newer patch, minor and major releases at exactly 7 days', async () => {
  for (const input of ['v1.8.4', 'v1.10.0', 'v2.0.0']) {
    assert.equal(await validateVersion(input, async version => release(version), now), input);
  }
});

test('reject releases inside cooldown, in future or with missing/invalid timestamp', async () => {
  for (const published_at of [new Date(now - COOLDOWN_MS + 1).toISOString(),
    new Date(now + 1).toISOString(), null, undefined, 'invalid']) {
    await assert.rejects(validateVersion('v1.8.4', async v => release(v, { published_at }), now), /7 days/);
  }
});

test('reject draft, prerelease, mismatched tag and missing metadata', async () => {
  for (const overrides of [{ draft: true }, { prerelease: true },
    { tag_name: 'v1.8.5' }, { draft: undefined }]) {
    await assert.rejects(validateVersion('v1.8.4', async v => release(v, overrides), now), /published stable release/);
  }
});

test('API errors fail closed', async () => {
  await assert.rejects(validateVersion('v1.8.4', async () => {
    throw new Error('HTTP 403');
  }, now), /HTTP 403/);
});
