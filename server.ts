import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { HANDHELD_OS_CATALOG } from './src/data/osCatalog';
import { buildGithubReleasesApiUrl } from './src/utils/githubOsSource';
import {
  RawGithubReleaseCandidate,
  StableReleaseCheckResult,
  UPSTREAM_OS_REPOS,
  buildStableCheckResultForOs,
} from './src/utils/releaseChecker';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_GITHUB_HOSTS = new Set([
  'github.com',
  'api.github.com',
  'raw.githubusercontent.com',
  'objects.githubusercontent.com',
  'release-assets.githubusercontent.com',
]);

const VALID_GITHUB_SEGMENT = /^[A-Za-z0-9_.-]+$/;
const RELEASE_CHECK_CACHE_TTL_MS = 30 * 60 * 1000;

interface ReleaseCheckCacheEntry {
  checkedAt: string;
  expiresAtMs: number;
  results: StableReleaseCheckResult[];
}

let releaseCheckCache: ReleaseCheckCacheEntry | null = null;

function buildGithubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'User-Agent': 'CFW-Studio-Retro-SD-Flasher',
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function validateGithubAssetUrl(rawUrl: string): URL | null {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return null;
    if (!ALLOWED_GITHUB_HOSTS.has(parsed.hostname)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function parseCliFlag(argv: string[], flagName: string): string | undefined {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === flagName && i + 1 < argv.length) {
      return argv[i + 1];
    }
    if (arg.startsWith(`${flagName}=`)) {
      return arg.slice(flagName.length + 1);
    }
  }
  return undefined;
}

function resolveServerPort(): number {
  const cliPort = parseCliFlag(process.argv.slice(2), '--port');
  if (cliPort) {
    const parsed = Number(cliPort);
    if (Number.isInteger(parsed) && parsed > 0) return parsed;
  }

  if (process.env.NODE_ENV !== 'production') {
    const devPort = Number(process.env.DEFAULT_APP_PORT || 3000);
    if (Number.isInteger(devPort) && devPort > 0) return devPort;
  }

  const envPort = Number(process.env.PORT || 3000);
  return Number.isInteger(envPort) && envPort > 0 ? envPort : 3000;
}

async function startServer() {
  const app = express();
  const PORT = resolveServerPort();
  const HOST = parseCliFlag(process.argv.slice(2), '--host') || '0.0.0.0';

  // Batch check newest stable releases across all listed catalog OSes (cached 30 min)
  app.get('/api/os-releases/latest', async (req, res) => {
    const forceRefresh = req.query.refresh === 'true';
    const nowMs = Date.now();

    if (!forceRefresh && releaseCheckCache && nowMs < releaseCheckCache.expiresAtMs) {
      res.json({
        checkedAt: releaseCheckCache.checkedAt,
        cached: true,
        results: releaseCheckCache.results,
      });
      return;
    }

    const checkedAt = new Date(nowMs).toISOString();
    const headers = buildGithubHeaders();

    const results = await Promise.all(
      HANDHELD_OS_CATALOG.map(async (os) => {
        const repoConfig = UPSTREAM_OS_REPOS[os.id];
        if (!repoConfig) {
          return buildStableCheckResultForOs(os, null, checkedAt);
        }

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          const ghRes = await fetch(
            `https://api.github.com/repos/${repoConfig.ownerRepo}/releases?per_page=8`,
            { headers, signal: controller.signal }
          );
          clearTimeout(timeoutId);

          if (!ghRes.ok) {
            return buildStableCheckResultForOs(os, null, checkedAt);
          }

          const data: unknown = await ghRes.json();
          const list = Array.isArray(data) ? (data as RawGithubReleaseCandidate[]) : [];
          return buildStableCheckResultForOs(os, list, checkedAt);
        } catch {
          return buildStableCheckResultForOs(os, null, checkedAt);
        }
      })
    );

    releaseCheckCache = {
      checkedAt,
      expiresAtMs: nowMs + RELEASE_CHECK_CACHE_TTL_MS,
      results,
    };

    res.json({
      checkedAt,
      cached: false,
      results,
    });
  });

  // GitHub Releases API proxy (avoids browser User-Agent/CORS issues)
  app.get('/api/github/releases', async (req, res) => {
    const owner = String(req.query.owner || '').trim();
    const repo = String(req.query.repo || '').trim();
    const tag = String(req.query.tag || '').trim();

    if (!VALID_GITHUB_SEGMENT.test(owner) || !VALID_GITHUB_SEGMENT.test(repo)) {
      res.status(400).json({ error: 'Invalid GitHub owner or repository name.' });
      return;
    }

    const endpoint = buildGithubReleasesApiUrl(owner, repo, tag || undefined);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const ghRes = await fetch(endpoint, {
        headers: buildGithubHeaders(),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!ghRes.ok) {
        const message =
          ghRes.status === 404
            ? `No public releases found for ${owner}/${repo}${tag ? ` (${tag})` : ''}.`
            : `GitHub API responded with status ${ghRes.status}.`;
        res.status(ghRes.status).json({ error: message });
        return;
      }

      const data: unknown = await ghRes.json();
      const releases = Array.isArray(data) ? data : [data];
      res.json({ releases });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Failed to query GitHub Releases API.',
      });
    }
  });

  // Inspect GitHub release asset Content-Length & signature header safely
  app.get('/api/github/asset-info', async (req, res) => {
    const rawUrl = String(req.query.url || '');
    const validUrl = validateGithubAssetUrl(rawUrl);
    if (!validUrl) {
      res.status(400).json({ error: 'Only HTTPS github.com / githubusercontent.com URLs are allowed.' });
      return;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const headRes = await fetch(validUrl.toString(), {
        method: 'HEAD',
        redirect: 'follow',
        headers: { 'User-Agent': 'CFW-Studio-Retro-SD-Flasher' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const finalUrl = validateGithubAssetUrl(headRes.url);
      if (!finalUrl) {
        res.status(400).json({ error: 'Redirect target is not an allowed GitHub host.' });
        return;
      }

      const contentLengthHeader = headRes.headers.get('content-length');
      const sizeBytes = contentLengthHeader ? Number(contentLengthHeader) : 0;

      res.json({
        ok: headRes.ok,
        sizeBytes: Number.isFinite(sizeBytes) ? sizeBytes : 0,
        contentType: headRes.headers.get('content-type') || 'application/octet-stream',
      });
    } catch (err) {
      res.status(502).json({
        error: err instanceof Error ? err.message : 'Unable to inspect GitHub asset.',
      });
    }
  });

  // Stream a verified GitHub release asset to the browser without CORS blocks
  app.get('/api/github/stream', async (req, res) => {
    const rawUrl = String(req.query.url || '');
    const validUrl = validateGithubAssetUrl(rawUrl);
    if (!validUrl) {
      res.status(400).json({ error: 'Invalid GitHub asset URL.' });
      return;
    }

    const controller = new AbortController();
    req.on('close', () => {
      controller.abort();
    });

    try {
      const upstream = await fetch(validUrl.toString(), {
        redirect: 'follow',
        headers: { 'User-Agent': 'CFW-Studio-Retro-SD-Flasher' },
        signal: controller.signal,
      });

      const finalUrl = validateGithubAssetUrl(upstream.url);
      if (!finalUrl) {
        await upstream.body?.cancel().catch(() => {});
        res.status(400).json({ error: 'Redirect target is not an allowed GitHub host.' });
        return;
      }

      if (!upstream.ok || !upstream.body) {
        res.status(upstream.status || 502).json({ error: 'Upstream GitHub asset download failed.' });
        return;
      }

      const contentLength = upstream.headers.get('content-length');
      if (contentLength) {
        res.setHeader('Content-Length', contentLength);
      }
      res.setHeader('Content-Type', 'application/octet-stream');

      const reader = upstream.body.getReader();
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            res.write(Buffer.from(value));
          }
        }
        res.end();
      } finally {
        reader.releaseLock();
      }
    } catch (err) {
      if (controller.signal.aborted) {
        if (!res.writableEnded) res.end();
        return;
      }
      if (!res.headersSent) {
        res.status(502).json({
          error: err instanceof Error ? err.message : 'GitHub asset stream failed.',
        });
      } else {
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const disableHmr = process.env.DISABLE_HMR === 'true';
    const viteReadyPromise = (async () => {
      const { createServer: createViteServer } = await import('vite');
      return createViteServer({
        server: {
          middlewareMode: true,
          hmr: !disableHmr,
          ...(disableHmr ? { ws: false as const } : {}),
        },
        appType: 'spa',
      });
    })();

    viteReadyPromise.catch((err) => {
      console.error('Failed to initialize Vite dev middleware:', err);
      process.exit(1);
    });

    app.use((req, res, next) => {
      viteReadyPromise
        .then((vite) => vite.middlewares(req, res, next))
        .catch(next);
    });
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build output not found.');
      }
    });
  }

  const server = app.listen(PORT, HOST, () => {
    console.log(`CFW Studio server listening on http://${HOST}:${PORT}`);
  });

  server.on('error', (err) => {
    console.error(`Failed to bind ${HOST}:${PORT}:`, err);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
