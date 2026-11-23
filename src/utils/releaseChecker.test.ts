import test from 'node:test';
import assert from 'node:assert/strict';
import { HANDHELD_OS_CATALOG } from '../data/osCatalog';
import {
  buildStableCheckResultForOs,
  isReleaseNewerThanCatalog,
  isStableReleaseCandidate,
  selectNewestStableRelease,
} from './releaseChecker';

test('isStableReleaseCandidate excludes drafts, prereleases, and alpha/beta/rc/nightly tags', () => {
  assert.equal(
    isStableReleaseCandidate({ tag_name: 'v4.6.0', draft: false, prerelease: false }),
    true
  );
  assert.equal(
    isStableReleaseCandidate({ tag_name: '2606.0_Andromeda', draft: false, prerelease: false }),
    true
  );
  assert.equal(
    isStableReleaseCandidate({ tag_name: 'v4.7.0', draft: true, prerelease: false }),
    false
  );
  assert.equal(
    isStableReleaseCandidate({ tag_name: 'v4.7.0-rc1', draft: false, prerelease: true }),
    false
  );
  assert.equal(
    isStableReleaseCandidate({ tag_name: 'nightly-20261110', draft: false, prerelease: false }),
    false
  );
  assert.equal(
    isStableReleaseCandidate({ tag_name: 'v2.0.0-beta.2', draft: false, prerelease: false }),
    false
  );
});

test('selectNewestStableRelease skips newer prereleases and picks the newest stable release', () => {
  const chosen = selectNewestStableRelease([
    {
      tag_name: 'v5.0.0-alpha.3',
      prerelease: true,
      published_at: '2026-11-20T00:00:00Z',
    },
    {
      tag_name: 'v4.5.0',
      prerelease: false,
      published_at: '2026-10-01T00:00:00Z',
    },
    {
      tag_name: 'v4.6.0',
      prerelease: false,
      published_at: '2026-11-07T00:00:00Z',
    },
  ]);

  assert.ok(chosen);
  assert.equal(chosen.tag_name, 'v4.6.0');
});

test('isReleaseNewerThanCatalog detects newer semver, date tags, and prevents downgrades', () => {
  assert.equal(
    isReleaseNewerThanCatalog('v3.2.0-Brick', '2025-05-02', 'v6.15.0', '2026-10-13'),
    true
  );
  assert.equal(
    isReleaseNewerThanCatalog('20250217', '2025-02-17', '20261101', '2026-11-01'),
    true
  );
  assert.equal(
    isReleaseNewerThanCatalog('Firefly (2025.04)', '2025-04-10', '20250813', '2025-08-14'),
    true
  );
  // Same base version or older release should NOT falsely report update-available
  assert.equal(
    isReleaseNewerThanCatalog('v1.3.0', '2025-03-18', 'v1.3.0', '2024-12-22'),
    false
  );
  assert.equal(
    isReleaseNewerThanCatalog('20241222', '2024-12-22', '20230203', '2023-02-03'),
    false
  );
  assert.equal(
    isReleaseNewerThanCatalog('v4.3.1', '2024-09-14', 'v4.3.1-1', '2024-06-24'),
    false
  );
});

test('buildStableCheckResultForOs marks updates, curated-only OSes, and extracts flashable asset', () => {
  const knulli = HANDHELD_OS_CATALOG.find((os) => os.id === 'knulli')!;
  const nxredux = HANDHELD_OS_CATALOG.find((os) => os.id === 'nxredux')!;

  const knulliCheck = buildStableCheckResultForOs(
    knulli,
    [
      {
        tag_name: '20250813',
        name: 'KNULLI Gladiator II',
        draft: false,
        prerelease: false,
        published_at: '2025-08-14T00:12:05Z',
        html_url: 'https://github.com/knulli-cfw/distribution/releases/tag/20250813',
        assets: [
          {
            id: 1,
            name: 'knulli-a133p-trimui-brick-gladiator-ii.img.gz',
            size: 2_600_000_000,
            browser_download_url:
              'https://github.com/knulli-cfw/distribution/releases/download/20250813/knulli-a133p-trimui-brick-gladiator-ii.img.gz',
          },
        ],
      },
    ],
    '2026-11-22T00:00:00Z'
  );

  assert.equal(knulliCheck.status, 'update-available');
  assert.equal(knulliCheck.latestTag, '20250813');
  assert.equal(
    knulliCheck.preferredAssetName,
    'knulli-a133p-trimui-brick-gladiator-ii.img.gz'
  );

  const nxCheck = buildStableCheckResultForOs(nxredux, null, '2026-11-22T00:00:00Z');
  assert.equal(nxCheck.status, 'curated-only');
  assert.equal(nxCheck.latestTag, null);
});
