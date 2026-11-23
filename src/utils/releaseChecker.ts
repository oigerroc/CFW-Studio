import { HandheldOsEntry } from '../data/osCatalog';
import { classifyOsAsset } from './githubOsSource';

export type ReleaseCheckStatus =
  | 'update-available'
  | 'up-to-date'
  | 'curated-only'
  | 'unavailable';

export interface UpstreamOsRepoConfig {
  osId: string;
  ownerRepo: string;
  releasesUrl: string;
  sourceNote: string;
}

export interface RawGithubReleaseCandidate {
  id?: number;
  tag_name: string;
  name?: string | null;
  draft?: boolean;
  prerelease?: boolean;
  published_at?: string;
  html_url?: string;
  assets?: {
    id: number;
    name: string;
    size: number;
    browser_download_url: string;
  }[];
}

export interface StableReleaseCheckResult {
  osId: string;
  status: ReleaseCheckStatus;
  latestTag: string | null;
  latestTitle: string | null;
  publishedAt: string | null;
  releaseUrl: string | null;
  ownerRepo: string | null;
  preferredAssetName: string | null;
  preferredAssetUrl: string | null;
  preferredAssetSizeBytes: number | null;
  checkedAt: string;
  sourceNote: string;
}

export const UPSTREAM_OS_REPOS: Record<string, UpstreamOsRepoConfig> = {
  knulli: {
    osId: 'knulli',
    ownerRepo: 'knulli-cfw/distribution',
    releasesUrl: 'https://github.com/knulli-cfw/distribution/releases',
    sourceNote: 'GitHub stable releases (knulli-cfw/distribution)',
  },
  muos: {
    osId: 'muos',
    ownerRepo: 'MustardOS/frontend',
    releasesUrl: 'https://github.com/MustardOS/frontend/releases',
    sourceNote: 'GitHub stable releases (MustardOS/frontend)',
  },
  arkos: {
    osId: 'arkos',
    ownerRepo: 'christianhaitian/arkos',
    releasesUrl: 'https://github.com/christianhaitian/arkos/releases',
    sourceNote: 'GitHub stable releases (christianhaitian/arkos)',
  },
  amberelec: {
    osId: 'amberelec',
    ownerRepo: 'AmberELEC/AmberELEC',
    releasesUrl: 'https://github.com/AmberELEC/AmberELEC/releases',
    sourceNote: 'GitHub stable releases (AmberELEC/AmberELEC)',
  },
  rocknix: {
    osId: 'rocknix',
    ownerRepo: 'ROCKNIX/distribution',
    releasesUrl: 'https://github.com/ROCKNIX/distribution/releases',
    sourceNote: 'GitHub stable releases (ROCKNIX/distribution)',
  },
  nextui: {
    osId: 'nextui',
    ownerRepo: 'LoveRetro/NextUI',
    releasesUrl: 'https://github.com/LoveRetro/NextUI/releases',
    sourceNote: 'GitHub stable releases (LoveRetro/NextUI)',
  },
  crossmix: {
    osId: 'crossmix',
    ownerRepo: 'cizia64/CrossMix-OS',
    releasesUrl: 'https://github.com/cizia64/CrossMix-OS/releases',
    sourceNote: 'GitHub stable releases (cizia64/CrossMix-OS)',
  },
  pakui: {
    osId: 'pakui',
    ownerRepo: 'tenlevels/PakUI',
    releasesUrl: 'https://github.com/tenlevels/PakUI/releases',
    sourceNote: 'GitHub stable releases (tenlevels/PakUI)',
  },
  spruce: {
    osId: 'spruce',
    ownerRepo: 'spruceUI/spruceOS',
    releasesUrl: 'https://github.com/spruceUI/spruceOS/releases',
    sourceNote: 'GitHub stable releases (spruceUI/spruceOS)',
  },
  onionos: {
    osId: 'onionos',
    ownerRepo: 'OnionUI/Onion',
    releasesUrl: 'https://github.com/OnionUI/Onion/releases',
    sourceNote: 'GitHub stable releases (OnionUI/Onion)',
  },
};

export const CURATED_ONLY_OS_NOTES: Record<string, string> = {
  garlicos: 'Distributed directly via Black-Seraph Patreon / archive mirror.',
  nxredux: 'Distributed via curated TrimUI Brick nxRedux release mirror.',
  armadaos: 'Distributed via Armada OS ARM64 Qualcomm release channel.',
  lineageos: 'Distributed per-device via LineageOS handheld SD dual-boot builds.',
};

const UNSTABLE_RELEASE_PATTERN =
  /(?:^|[-_.\s])(alpha|beta|rc\d*|nightly|dev|pre\d*|preview|canary|snapshot|wip|test)(?:$|[-_.\s\d])/i;

export function isStableReleaseCandidate(release: RawGithubReleaseCandidate): boolean {
  if (!release || release.draft || release.prerelease) {
    return false;
  }
  const tag = (release.tag_name ?? '').trim();
  if (!tag) return false;
  if (UNSTABLE_RELEASE_PATTERN.test(tag)) {
    return false;
  }
  const title = (release.name ?? '').trim();
  if (title && UNSTABLE_RELEASE_PATTERN.test(title)) {
    return false;
  }
  return true;
}

export function selectNewestStableRelease(
  releases: RawGithubReleaseCandidate[]
): RawGithubReleaseCandidate | null {
  const stable = releases.filter(isStableReleaseCandidate);
  if (stable.length === 0) return null;

  return [...stable].sort((a, b) => {
    const dateA = a.published_at ?? '';
    const dateB = b.published_at ?? '';
    return dateB.localeCompare(dateA);
  })[0];
}

function parseSemverTuple(raw: string): [number, number, number] | null {
  const match = raw.match(/(?:^|[^0-9])v?(\d{1,3})\.(\d{1,3})(?:\.(\d{1,3}))?(?:$|[^0-9])/i);
  if (!match) return null;
  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = match[3] ? Number(match[3]) : 0;
  if (!Number.isFinite(major) || !Number.isFinite(minor) || !Number.isFinite(patch)) {
    return null;
  }
  return [major, minor, patch];
}

function compareSemver(a: [number, number, number], b: [number, number, number]): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}

function extractCompactDateTag(raw: string): string | null {
  const match = raw.match(/\b(20\d{2})(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\b/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

export function isReleaseNewerThanCatalog(
  catalogVersion: string,
  catalogReleaseDate: string,
  latestTag: string,
  latestPublishedAt: string | null
): boolean {
  const cleanTag = latestTag.trim();
  const cleanPublished = latestPublishedAt ? latestPublishedAt.slice(0, 10) : '';

  if (!cleanTag) return false;

  // Compare compact YYYYMMDD date tags (e.g. ROCKNIX 20261101 vs 20250217, AmberELEC 20230203 vs 20241222)
  const catalogDateTag = extractCompactDateTag(catalogVersion) ?? catalogReleaseDate;
  const latestDateTag = extractCompactDateTag(cleanTag);
  if (latestDateTag && catalogDateTag) {
    if (latestDateTag > catalogDateTag) return true;
    if (latestDateTag < catalogDateTag) return false;
  }

  // Compare pure x.y.z semver strings when neither is an encoded US/CalVer date like 02/2025 or 07.31.2025
  const isCatalogSlashDate = /\d{2}\/\d{4}/.test(catalogVersion);
  const isTagDotDate = /\d{2}\.\d{2}\.\d{4}/.test(cleanTag);
  if (!isCatalogSlashDate && !isTagDotDate) {
    const catSemver = parseSemverTuple(catalogVersion);
    const latestSemver = parseSemverTuple(cleanTag);
    if (catSemver && latestSemver) {
      const cmp = compareSemver(latestSemver, catSemver);
      if (cmp > 0) return true;
      if (cmp < 0) return false;
      // Same base semver (e.g. v4.3.1 vs v4.3.1-1 or v1.3.0 vs v1.3.0)
      return Boolean(cleanPublished && cleanPublished > catalogReleaseDate);
    }
  }

  // Fall back to release publication date comparison
  if (cleanPublished && catalogReleaseDate) {
    return cleanPublished > catalogReleaseDate;
  }

  return cleanTag.toLowerCase() !== catalogVersion.toLowerCase();
}

export function buildStableCheckResultForOs(
  os: HandheldOsEntry,
  releases: RawGithubReleaseCandidate[] | null,
  checkedAt: string
): StableReleaseCheckResult {
  const repoConfig = UPSTREAM_OS_REPOS[os.id];
  if (!repoConfig) {
    return {
      osId: os.id,
      status: 'curated-only',
      latestTag: null,
      latestTitle: null,
      publishedAt: null,
      releaseUrl: null,
      ownerRepo: null,
      preferredAssetName: null,
      preferredAssetUrl: null,
      preferredAssetSizeBytes: null,
      checkedAt,
      sourceNote: CURATED_ONLY_OS_NOTES[os.id] ?? 'Curated upstream build.',
    };
  }

  if (!releases) {
    return {
      osId: os.id,
      status: 'unavailable',
      latestTag: null,
      latestTitle: null,
      publishedAt: null,
      releaseUrl: repoConfig.releasesUrl,
      ownerRepo: repoConfig.ownerRepo,
      preferredAssetName: null,
      preferredAssetUrl: null,
      preferredAssetSizeBytes: null,
      checkedAt,
      sourceNote: repoConfig.sourceNote,
    };
  }

  const newestStable = selectNewestStableRelease(releases);
  if (!newestStable) {
    return {
      osId: os.id,
      status: 'up-to-date',
      latestTag: null,
      latestTitle: null,
      publishedAt: null,
      releaseUrl: repoConfig.releasesUrl,
      ownerRepo: repoConfig.ownerRepo,
      preferredAssetName: null,
      preferredAssetUrl: null,
      preferredAssetSizeBytes: null,
      checkedAt,
      sourceNote: repoConfig.sourceNote,
    };
  }

  const publishedDate = newestStable.published_at ? newestStable.published_at.slice(0, 10) : null;
  const flashableAssets = (newestStable.assets ?? []).filter(
    (asset) => classifyOsAsset(asset.name).isFlashableOsAsset
  );
  const preferredAsset = flashableAssets[0] ?? null;
  const hasNewer = isReleaseNewerThanCatalog(
    os.version,
    os.releaseDate,
    newestStable.tag_name,
    publishedDate
  );

  return {
    osId: os.id,
    status: hasNewer ? 'update-available' : 'up-to-date',
    latestTag: newestStable.tag_name,
    latestTitle: newestStable.name || newestStable.tag_name,
    publishedAt: publishedDate,
    releaseUrl: newestStable.html_url || repoConfig.releasesUrl,
    ownerRepo: repoConfig.ownerRepo,
    preferredAssetName: preferredAsset ? preferredAsset.name : null,
    preferredAssetUrl: preferredAsset ? preferredAsset.browser_download_url : null,
    preferredAssetSizeBytes: preferredAsset ? preferredAsset.size : null,
    checkedAt,
    sourceNote: repoConfig.sourceNote,
  };
}
