import test from 'node:test';
import assert from 'node:assert/strict';
import {
  inspectSevenZipHeader,
  inspectZipTailBuffer,
} from './archiveInspector';
import {
  classifyOsAsset,
  normalizeGithubReleases,
  parseGithubUrl,
} from './githubOsSource';

function buildMinimalZipBuffer(entries: { name: string; uncompressedSize: number }[]): Uint8Array {
  const encoder = new TextEncoder();
  const cdChunks: Uint8Array[] = [];
  let cdSize = 0;

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name);
    const cd = new Uint8Array(46 + nameBytes.length);
    // PK\x01\x02
    cd[0] = 0x50;
    cd[1] = 0x4b;
    cd[2] = 0x01;
    cd[3] = 0x02;
    // uncompressedSize at offset 24
    cd[24] = entry.uncompressedSize & 0xff;
    cd[25] = (entry.uncompressedSize >>> 8) & 0xff;
    cd[26] = (entry.uncompressedSize >>> 16) & 0xff;
    cd[27] = (entry.uncompressedSize >>> 24) & 0xff;
    // filename length at offset 28
    cd[28] = nameBytes.length & 0xff;
    cd[29] = (nameBytes.length >>> 8) & 0xff;
    cd.set(nameBytes, 46);
    cdChunks.push(cd);
    cdSize += cd.length;
  }

  const eocd = new Uint8Array(22);
  eocd[0] = 0x50;
  eocd[1] = 0x4b;
  eocd[2] = 0x05;
  eocd[3] = 0x06;
  eocd[10] = entries.length & 0xff;
  eocd[11] = (entries.length >>> 8) & 0xff;
  eocd[12] = cdSize & 0xff;
  eocd[13] = (cdSize >>> 8) & 0xff;
  eocd[14] = (cdSize >>> 16) & 0xff;
  eocd[15] = (cdSize >>> 24) & 0xff;
  // cdOffset = 0 (starts at 0 of our synthetic tail buffer)

  const out = new Uint8Array(cdSize + 22);
  let pos = 0;
  for (const chunk of cdChunks) {
    out.set(chunk, pos);
    pos += chunk.length;
  }
  out.set(eocd, pos);
  return out;
}

test('inspectZipTailBuffer detects CFW package trees and raw .img archives', () => {
  const cfwZip = buildMinimalZipBuffer([
    { name: 'trimui/app/MainUI', uncompressedSize: 102400 },
    { name: 'MinUI.pak/launch.sh', uncompressedSize: 4096 },
  ]);
  const cfwResult = inspectZipTailBuffer(cfwZip, 0, cfwZip.length);
  assert.equal(cfwResult.signatureValid, true);
  assert.equal(cfwResult.detectedFlashMode, 'fat32-package');
  assert.equal(cfwResult.entryCount, 2);
  assert.equal(cfwResult.sampleEntries[0].name, 'trimui/app/MainUI');

  const imgZip = buildMinimalZipBuffer([
    { name: 'knulli-trimui-brick.img', uncompressedSize: 2_000_000 },
  ]);
  const imgResult = inspectZipTailBuffer(imgZip, 0, imgZip.length);
  assert.equal(imgResult.signatureValid, true);
  assert.equal(imgResult.detectedFlashMode, 'raw-img');
});

test('inspectSevenZipHeader validates 7z magic signature and version', () => {
  const header = new Uint8Array(32);
  header.set([0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c, 0x00, 0x04], 0);
  // NextHeaderOffset = 1024
  header[12] = 0x00;
  header[13] = 0x04;
  // NextHeaderSize = 64
  header[20] = 64;

  const ok = inspectSevenZipHeader(header, 2048);
  assert.equal(ok.signatureValid, true);
  assert.equal(ok.sevenZipVersion, '0.4');
  assert.equal(ok.detectedFlashMode, 'fat32-package');

  const bad = inspectSevenZipHeader(new Uint8Array(32), 2048);
  assert.equal(bad.signatureValid, false);
});

test('parseGithubUrl handles repo, tag, direct download, and rejects non-GitHub hosts', () => {
  const repo = parseGithubUrl('https://github.com/knulli-cfw/distribution');
  assert.equal(repo.valid, true);
  assert.equal(repo.kind, 'repo');
  assert.equal(repo.owner, 'knulli-cfw');
  assert.equal(repo.repo, 'distribution');

  const tag = parseGithubUrl('https://github.com/LoveRetro/NextUI/releases/tag/v3.2.0');
  assert.equal(tag.valid, true);
  assert.equal(tag.kind, 'tag');
  assert.equal(tag.tag, 'v3.2.0');

  const dl = parseGithubUrl(
    'https://github.com/spruceUI/spruceOS/releases/download/v3.3.2/spruce-V3.3.2.7z'
  );
  assert.equal(dl.valid, true);
  assert.equal(dl.kind, 'direct-asset');
  assert.equal(dl.assetName, 'spruce-V3.3.2.7z');

  const rejected = parseGithubUrl('https://example.com/malicious.zip');
  assert.equal(rejected.valid, false);
});

test('classifyOsAsset and normalizeGithubReleases filter to flashable OS formats', () => {
  assert.equal(classifyOsAsset('spruce.7z').archiveFormat, '7z');
  assert.equal(classifyOsAsset('nextui.zip').recommendedFlashMode, 'fat32-package');
  assert.equal(classifyOsAsset('knulli-brick.img.gz').recommendedFlashMode, 'raw-img');
  assert.equal(classifyOsAsset('knulli-boot.tar.gz').isFlashableOsAsset, false);
  assert.equal(classifyOsAsset('checksums.txt').isFlashableOsAsset, false);

  const normalized = normalizeGithubReleases([
    {
      id: 1,
      tag_name: 'v3.3.2',
      name: 'Spruce 3.3.2',
      published_at: '2025-03-04T12:00:00Z',
      html_url: 'https://github.com/spruceUI/spruceOS/releases/tag/v3.3.2',
      assets: [
        {
          id: 10,
          name: 'spruce-V3.3.2.7z',
          size: 1450000000,
          browser_download_url:
            'https://github.com/spruceUI/spruceOS/releases/download/v3.3.2/spruce-V3.3.2.7z',
          updated_at: '2025-03-04T12:00:00Z',
        },
        {
          id: 11,
          name: 'SHA256SUMS.txt',
          size: 128,
          browser_download_url:
            'https://github.com/spruceUI/spruceOS/releases/download/v3.3.2/SHA256SUMS.txt',
          updated_at: '2025-03-04T12:00:00Z',
        },
      ],
    },
  ]);

  assert.equal(normalized[0].assets.length, 1);
  assert.equal(normalized[0].assets[0].name, 'spruce-V3.3.2.7z');
  assert.equal(normalized[0].assets[0].archiveFormat, '7z');
});
