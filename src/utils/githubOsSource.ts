export type ArchiveFormat = 'zip' | '7z' | 'gzip-img' | 'xz-img' | 'raw-img';

export interface ParsedGithubUrl {
  valid: boolean;
  kind?: 'repo' | 'releases' | 'tag' | 'direct-asset';
  owner?: string;
  repo?: string;
  tag?: string;
  assetName?: string;
  normalizedUrl?: string;
  error?: string;
}

export interface GithubReleaseAsset {
  id: number;
  name: string;
  sizeBytes: number;
  downloadUrl: string;
  archiveFormat: ArchiveFormat;
  recommendedFlashMode: 'raw-img' | 'fat32-package';
  updatedAt: string;
}

export interface GithubReleaseSummary {
  id: number;
  tagName: string;
  title: string;
  publishedAt: string;
  htmlUrl: string;
  assets: GithubReleaseAsset[];
}

export interface GithubOsPreset {
  label: string;
  ownerRepo: string;
  url: string;
  targetHint: string;
}

export const GITHUB_OS_PRESETS: GithubOsPreset[] = [
  {
    label: 'Knulli',
    ownerRepo: 'knulli-cfw/distribution',
    url: 'https://github.com/knulli-cfw/distribution/releases',
    targetHint: 'TrimUI Brick / RG35XX (.img.gz)',
  },
  {
    label: 'muOS',
    ownerRepo: 'MustardOS/frontend',
    url: 'https://github.com/MustardOS/frontend/releases',
    targetHint: 'Anbernic H700 (.img.gz / .zip)',
  },
  {
    label: 'ArkOS',
    ownerRepo: 'christianhaitian/arkos',
    url: 'https://github.com/christianhaitian/arkos/releases',
    targetHint: 'Anbernic / Powkiddy RK3566 (.img.gz)',
  },
  {
    label: 'NextUI',
    ownerRepo: 'LoveRetro/NextUI',
    url: 'https://github.com/LoveRetro/NextUI/releases',
    targetHint: 'TrimUI Brick (.zip)',
  },
  {
    label: 'PakUI',
    ownerRepo: 'tenlevels/PakUI',
    url: 'https://github.com/tenlevels/PakUI/releases',
    targetHint: 'TrimUI Brick (.zip)',
  },
  {
    label: 'CrossMix OS',
    ownerRepo: 'cizia64/CrossMix-OS',
    url: 'https://github.com/cizia64/CrossMix-OS/releases',
    targetHint: 'TrimUI Brick / Smart Pro (.zip)',
  },
  {
    label: 'Spruce',
    ownerRepo: 'spruceUI/spruceOS',
    url: 'https://github.com/spruceUI/spruceOS/releases',
    targetHint: 'Miyoo A30 / Brick (.7z / .zip)',
  },
  {
    label: 'ROCKNIX',
    ownerRepo: 'ROCKNIX/distribution',
    url: 'https://github.com/ROCKNIX/distribution/releases',
    targetHint: 'Powkiddy / Anbernic / AYN / Retroid (.img.gz)',
  },
  {
    label: 'OnionOS',
    ownerRepo: 'OnionUI/Onion',
    url: 'https://github.com/OnionUI/Onion/releases',
    targetHint: 'Miyoo Mini / Mini+ (.zip)',
  },
];

const ALLOWED_GITHUB_HOSTS = new Set([
  'github.com',
  'raw.githubusercontent.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);

const VALID_SEGMENT = /^[A-Za-z0-9_.-]+$/;

export function classifyOsAsset(filename: string): {
  archiveFormat: ArchiveFormat;
  recommendedFlashMode: 'raw-img' | 'fat32-package';
  isFlashableOsAsset: boolean;
} {
  const lower = filename.toLowerCase();

  if (lower.endsWith('.7z')) {
    return {
      archiveFormat: '7z',
      recommendedFlashMode: 'fat32-package',
      isFlashableOsAsset: true,
    };
  }
  if (lower.endsWith('.zip')) {
    return {
      archiveFormat: 'zip',
      recommendedFlashMode: 'fat32-package',
      isFlashableOsAsset: true,
    };
  }
  if (lower.endsWith('.tar.gz') || lower.endsWith('.tgz')) {
    return {
      archiveFormat: 'raw-img',
      recommendedFlashMode: 'raw-img',
      isFlashableOsAsset: false,
    };
  }
  if (lower.endsWith('.img.gz') || lower.endsWith('.gz')) {
    return {
      archiveFormat: 'gzip-img',
      recommendedFlashMode: 'raw-img',
      isFlashableOsAsset: true,
    };
  }
  if (lower.endsWith('.img.xz') || lower.endsWith('.xz')) {
    return {
      archiveFormat: 'xz-img',
      recommendedFlashMode: 'raw-img',
      isFlashableOsAsset: true,
    };
  }
  if (lower.endsWith('.img') || lower.endsWith('.iso') || lower.endsWith('.bin')) {
    return {
      archiveFormat: 'raw-img',
      recommendedFlashMode: 'raw-img',
      isFlashableOsAsset: true,
    };
  }

  return {
    archiveFormat: 'raw-img',
    recommendedFlashMode: 'raw-img',
    isFlashableOsAsset: false,
  };
}

export function parseGithubUrl(rawInput: string): ParsedGithubUrl {
  const trimmed = rawInput.trim();
  if (!trimmed) {
    return { valid: false, error: 'Enter a GitHub repository, release, or asset URL.' };
  }

  // Allow shorthand owner/repo (e.g., knulli-cfw/distribution)
  const normalizedInput =
    !trimmed.includes('://') && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+/.test(trimmed)
      ? `https://github.com/${trimmed}`
      : trimmed;

  let parsed: URL;
  try {
    parsed = new URL(normalizedInput);
  } catch {
    return { valid: false, error: 'Invalid URL format. Paste a full https://github.com/... link.' };
  }

  if (parsed.protocol !== 'https:') {
    return { valid: false, error: 'Only HTTPS GitHub URLs are supported.' };
  }

  if (!ALLOWED_GITHUB_HOSTS.has(parsed.hostname)) {
    return {
      valid: false,
      error: 'Host must be github.com or raw.githubusercontent.com.',
    };
  }

  const segments = parsed.pathname.split('/').filter(Boolean);

  if (parsed.hostname !== 'github.com') {
    const assetName = segments[segments.length - 1] ?? 'custom-os.img';
    return {
      valid: true,
      kind: 'direct-asset',
      assetName,
      normalizedUrl: parsed.toString(),
    };
  }

  if (segments.length < 2) {
    return {
      valid: false,
      error: 'GitHub link must include both owner and repository (e.g. github.com/owner/repo).',
    };
  }

  const owner = segments[0];
  const repo = segments[1].replace(/\.git$/, '');
  if (!VALID_SEGMENT.test(owner) || !VALID_SEGMENT.test(repo)) {
    return { valid: false, error: 'Repository owner or name contains invalid characters.' };
  }

  // Direct release download: /owner/repo/releases/download/<tag>/<asset>
  if (segments[2] === 'releases' && segments[3] === 'download' && segments.length >= 6) {
    const tag = segments[4];
    const assetName = decodeURIComponent(segments.slice(5).join('/'));
    return {
      valid: true,
      kind: 'direct-asset',
      owner,
      repo,
      tag,
      assetName,
      normalizedUrl: parsed.toString(),
    };
  }

  // GitHub blob file -> rewrite to raw.githubusercontent.com
  if (segments[2] === 'blob' && segments.length >= 5) {
    const branchAndPath = segments.slice(3).join('/');
    const assetName = decodeURIComponent(segments[segments.length - 1]);
    return {
      valid: true,
      kind: 'direct-asset',
      owner,
      repo,
      assetName,
      normalizedUrl: `https://raw.githubusercontent.com/${owner}/${repo}/${branchAndPath}`,
    };
  }

  // Release tag page: /owner/repo/releases/tag/<tag>
  if (segments[2] === 'releases' && segments[3] === 'tag' && segments[4]) {
    return {
      valid: true,
      kind: 'tag',
      owner,
      repo,
      tag: decodeURIComponent(segments[4]),
      normalizedUrl: `https://github.com/${owner}/${repo}/releases/tag/${segments[4]}`,
    };
  }

  // Releases overview or /releases/latest
  if (segments[2] === 'releases') {
    return {
      valid: true,
      kind: 'releases',
      owner,
      repo,
      tag: segments[3] === 'latest' ? 'latest' : undefined,
      normalizedUrl: parsed.toString(),
    };
  }

  // Base repo URL
  return {
    valid: true,
    kind: 'repo',
    owner,
    repo,
    normalizedUrl: `https://github.com/${owner}/${repo}`,
  };
}

interface RawGithubApiAsset {
  id: number;
  name: string;
  size: number;
  browser_download_url: string;
  updated_at: string;
}

interface RawGithubApiRelease {
  id: number;
  tag_name: string;
  name: string | null;
  published_at: string;
  html_url: string;
  assets: RawGithubApiAsset[];
}

export function normalizeGithubReleases(rawList: RawGithubApiRelease[]): GithubReleaseSummary[] {
  return rawList.map((rel) => {
    const assets: GithubReleaseAsset[] = (rel.assets ?? [])
      .map((asset) => {
        const classification = classifyOsAsset(asset.name);
        return {
          id: asset.id,
          name: asset.name,
          sizeBytes: asset.size,
          downloadUrl: asset.browser_download_url,
          archiveFormat: classification.archiveFormat,
          recommendedFlashMode: classification.recommendedFlashMode,
          updatedAt: asset.updated_at,
          isFlashable: classification.isFlashableOsAsset,
        };
      })
      .filter((a) => a.isFlashable)
      .map(({ isFlashable: _ignored, ...rest }) => rest);

    return {
      id: rel.id,
      tagName: rel.tag_name,
      title: rel.name || rel.tag_name,
      publishedAt: rel.published_at ? rel.published_at.slice(0, 10) : '',
      htmlUrl: rel.html_url,
      assets,
    };
  });
}

export function buildGithubReleasesApiUrl(owner: string, repo: string, tag?: string): string {
  if (tag === 'latest') {
    return `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
  }
  if (tag) {
    return `https://api.github.com/repos/${owner}/${repo}/releases/tags/${encodeURIComponent(tag)}`;
  }
  return `https://api.github.com/repos/${owner}/${repo}/releases?per_page=8`;
}

export async function fetchGithubReleasesForUrl(
  parsed: ParsedGithubUrl
): Promise<{
  releases: GithubReleaseSummary[];
  directAsset?: GithubReleaseAsset;
  error?: string;
}> {
  if (!parsed.valid) {
    return { releases: [], error: parsed.error };
  }

  if (parsed.kind === 'direct-asset' && parsed.normalizedUrl && parsed.assetName) {
    const cls = classifyOsAsset(parsed.assetName);
    let sizeBytes = 0;
    try {
      const infoRes = await fetch(
        `/api/github/asset-info?url=${encodeURIComponent(parsed.normalizedUrl)}`
      );
      if (infoRes.ok) {
        const info = (await infoRes.json()) as { sizeBytes?: number };
        sizeBytes = info.sizeBytes ?? 0;
      }
    } catch {
      // Fall back to unknown size if offline/blocked
    }

    return {
      releases: [],
      directAsset: {
        id: Date.now(),
        name: parsed.assetName,
        sizeBytes,
        downloadUrl: parsed.normalizedUrl,
        archiveFormat: cls.archiveFormat,
        recommendedFlashMode: cls.recommendedFlashMode,
        updatedAt: '',
      },
    };
  }

  if (!parsed.owner || !parsed.repo) {
    return { releases: [], error: 'Missing repository owner or name.' };
  }

  const params = new URLSearchParams({
    owner: parsed.owner,
    repo: parsed.repo,
  });
  if (parsed.tag) {
    params.set('tag', parsed.tag);
  }

  // Try server proxy first (avoids CORS & sets proper User-Agent), fall back to direct api.github.com
  try {
    const proxyRes = await fetch(`/api/github/releases?${params.toString()}`);
    if (proxyRes.ok) {
      const payload = (await proxyRes.json()) as { releases: RawGithubApiRelease[] };
      return { releases: normalizeGithubReleases(payload.releases) };
    }
    const errBody = (await proxyRes.json().catch(() => ({}))) as { error?: string };
    if (proxyRes.status >= 400 && proxyRes.status < 500 && errBody.error) {
      return { releases: [], error: errBody.error };
    }
  } catch {
    // Fallback to direct GitHub REST API below
  }

  try {
    const directEndpoint = buildGithubReleasesApiUrl(parsed.owner, parsed.repo, parsed.tag);

    const res = await fetch(directEndpoint, {
      headers: { Accept: 'application/vnd.github+json' },
    });
    if (!res.ok) {
      return {
        releases: [],
        error: `GitHub API returned ${res.status}. Verify the repository URL is public and valid.`,
      };
    }
    const data = (await res.json()) as RawGithubApiRelease | RawGithubApiRelease[];
    const list = Array.isArray(data) ? data : [data];
    return { releases: normalizeGithubReleases(list) };
  } catch (err) {
    return {
      releases: [],
      error:
        err instanceof Error
          ? `Could not reach GitHub: ${err.message}`
          : 'Unable to fetch GitHub releases.',
    };
  }
}
