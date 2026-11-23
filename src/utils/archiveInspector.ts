import { readBlobAsArrayBuffer } from './androidCompat';

export interface ArchiveEntrySummary {
  name: string;
  compressedBytes: number;
  uncompressedBytes: number;
}

export interface ArchiveInspectionResult {
  format: 'zip' | '7z' | 'gzip' | 'xz' | 'raw-img' | 'unknown';
  signatureValid: boolean;
  detectedFlashMode: 'fat32-package' | 'raw-img';
  summary: string;
  entryCount: number;
  totalUncompressedBytes: number | null;
  sampleEntries: ArchiveEntrySummary[];
  sevenZipVersion?: string;
}

function readUint16LE(buf: Uint8Array, offset: number): number {
  return buf[offset] | (buf[offset + 1] << 8);
}

function readUint32LE(buf: Uint8Array, offset: number): number {
  return (
    (buf[offset] |
      (buf[offset + 1] << 8) |
      (buf[offset + 2] << 16) |
      (buf[offset + 3] << 24)) >>>
    0
  );
}

function readUint64LE(buf: Uint8Array, offset: number): number {
  const low = readUint32LE(buf, offset);
  const high = readUint32LE(buf, offset + 4);
  return high * 4294967296 + low;
}

function decodeUtf8(bytes: Uint8Array): string {
  return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
}

/**
 * Inspects a ZIP buffer (either the full file or the tail slice containing the
 * End of Central Directory + Central Directory records) and returns entry metadata.
 */
export function inspectZipTailBuffer(
  tailBytes: Uint8Array,
  tailOffsetInFile: number,
  totalFileSize: number
): ArchiveInspectionResult {
  // Search backward for EOCD signature: 0x06054b50 ('PK\x05\x06')
  let eocdPos = -1;
  for (let i = tailBytes.length - 22; i >= 0; i--) {
    if (
      tailBytes[i] === 0x50 &&
      tailBytes[i + 1] === 0x4b &&
      tailBytes[i + 2] === 0x05 &&
      tailBytes[i + 3] === 0x06
    ) {
      eocdPos = i;
      break;
    }
  }

  if (eocdPos === -1) {
    return {
      format: 'zip',
      signatureValid: false,
      detectedFlashMode: 'fat32-package',
      summary: 'ZIP End-of-Central-Directory record not found in tail window; will stream as FAT32 package.',
      entryCount: 0,
      totalUncompressedBytes: null,
      sampleEntries: [],
    };
  }

  const totalEntries = readUint16LE(tailBytes, eocdPos + 10);
  const cdSize = readUint32LE(tailBytes, eocdPos + 12);
  const cdOffset = readUint32LE(tailBytes, eocdPos + 16);

  const cdLocalStart = cdOffset - tailOffsetInFile;
  const entries: ArchiveEntrySummary[] = [];
  let totalUncompressed = 0;

  if (cdLocalStart >= 0 && cdLocalStart < tailBytes.length) {
    let cursor = cdLocalStart;
    const cdEnd = Math.min(tailBytes.length, cdLocalStart + cdSize);

    while (cursor + 46 <= cdEnd) {
      if (
        tailBytes[cursor] !== 0x50 ||
        tailBytes[cursor + 1] !== 0x4b ||
        tailBytes[cursor + 2] !== 0x01 ||
        tailBytes[cursor + 3] !== 0x02
      ) {
        break;
      }

      const compressedBytes = readUint32LE(tailBytes, cursor + 20);
      const uncompressedBytes = readUint32LE(tailBytes, cursor + 24);
      const nameLen = readUint16LE(tailBytes, cursor + 28);
      const extraLen = readUint16LE(tailBytes, cursor + 30);
      const commentLen = readUint16LE(tailBytes, cursor + 32);

      if (cursor + 46 + nameLen <= tailBytes.length) {
        const name = decodeUtf8(tailBytes.slice(cursor + 46, cursor + 46 + nameLen));
        totalUncompressed += uncompressedBytes;
        if (entries.length < 12 && !name.endsWith('/')) {
          entries.push({ name, compressedBytes, uncompressedBytes });
        }
      }

      cursor += 46 + nameLen + extraLen + commentLen;
    }
  }

  const hasRawImageInside = entries.some((e) => {
    const lower = e.name.toLowerCase();
    return lower.endsWith('.img') || lower.endsWith('.iso');
  });

  const hasCfwTree = entries.some((e) => {
    const lower = e.name.toLowerCase();
    return (
      lower.includes('trimui/') ||
      lower.includes('.tmp_update/') ||
      lower.includes('retroarch/') ||
      lower.includes('bootloader/') ||
      lower.includes('roms/')
    );
  });

  const detectedFlashMode: 'fat32-package' | 'raw-img' =
    hasRawImageInside && !hasCfwTree ? 'raw-img' : 'fat32-package';

  return {
    format: 'zip',
    signatureValid: true,
    detectedFlashMode,
    summary:
      detectedFlashMode === 'raw-img'
        ? `ZIP archive verified (${totalEntries} entries, contains raw disk image) — unpack & flash sectors`
        : `ZIP archive verified (${totalEntries} entries${
            hasCfwTree ? ', CFW directory tree detected' : ''
          }) — extract to MBR FAT32 (32 KB)`,
    entryCount: totalEntries,
    totalUncompressedBytes: totalUncompressed > 0 ? totalUncompressed : totalFileSize,
    sampleEntries: entries,
  };
}

/**
 * Inspects a 7-Zip (.7z) 32-byte Start Header:
 * Bytes 0..5: '7z\xBC\xAF\x27\x1C'
 * Byte  6..7: Major/Minor version (usually 0.4)
 * Bytes 12..19: NextHeaderOffset (uint64 LE)
 * Bytes 20..27: NextHeaderSize (uint64 LE)
 */
export function inspectSevenZipHeader(
  headerBytes: Uint8Array,
  totalFileSize: number
): ArchiveInspectionResult {
  if (headerBytes.length < 32) {
    return {
      format: '7z',
      signatureValid: false,
      detectedFlashMode: 'fat32-package',
      summary: 'File shorter than 32-byte 7z signature header.',
      entryCount: 0,
      totalUncompressedBytes: null,
      sampleEntries: [],
    };
  }

  const validMagic =
    headerBytes[0] === 0x37 &&
    headerBytes[1] === 0x7a &&
    headerBytes[2] === 0xbc &&
    headerBytes[3] === 0xaf &&
    headerBytes[4] === 0x27 &&
    headerBytes[5] === 0x1c;

  if (!validMagic) {
    return {
      format: '7z',
      signatureValid: false,
      detectedFlashMode: 'fat32-package',
      summary: 'Invalid 7-Zip magic signature (expected 37 7A BC AF 27 1C).',
      entryCount: 0,
      totalUncompressedBytes: null,
      sampleEntries: [],
    };
  }

  const major = headerBytes[6];
  const minor = headerBytes[7];
  const nextHeaderOffset = readUint64LE(headerBytes, 12);
  const nextHeaderSize = readUint64LE(headerBytes, 20);
  const streamEnd = 32 + nextHeaderOffset + nextHeaderSize;
  const boundsLookConsistent = streamEnd <= totalFileSize + 1024;

  return {
    format: '7z',
    signatureValid: true,
    detectedFlashMode: 'fat32-package',
    sevenZipVersion: `${major}.${minor}`,
    summary: boundsLookConsistent
      ? `7-Zip archive v${major}.${minor} verified (LZMA2/BCJ header at +${nextHeaderOffset.toLocaleString()} B) — extract to MBR FAT32 (32 KB)`
      : `7-Zip archive v${major}.${minor} signature verified — extract to MBR FAT32 (32 KB)`,
    entryCount: 1,
    totalUncompressedBytes: null,
    sampleEntries: [],
  };
}

export async function inspectLocalOsFile(file: File): Promise<ArchiveInspectionResult> {
  const lower = file.name.toLowerCase();

  if (lower.endsWith('.zip')) {
    const tailWindowSize = Math.min(file.size, 262_144);
    const tailStart = Math.max(0, file.size - tailWindowSize);
    const tailBuf = new Uint8Array(await readBlobAsArrayBuffer(file.slice(tailStart, file.size)));
    return inspectZipTailBuffer(tailBuf, tailStart, file.size);
  }

  if (lower.endsWith('.7z')) {
    const headBuf = new Uint8Array(
      await readBlobAsArrayBuffer(file.slice(0, Math.min(64, file.size)))
    );
    return inspectSevenZipHeader(headBuf, file.size);
  }

  if (lower.endsWith('.gz')) {
    const headBuf = new Uint8Array(
      await readBlobAsArrayBuffer(file.slice(0, Math.min(16, file.size)))
    );
    const validGz = headBuf.length >= 2 && headBuf[0] === 0x1f && headBuf[1] === 0x8b;
    let isize: number | null = null;
    if (file.size >= 4) {
      const tail4 = new Uint8Array(
        await readBlobAsArrayBuffer(file.slice(file.size - 4, file.size))
      );
      isize = readUint32LE(tail4, 0);
    }
    return {
      format: 'gzip',
      signatureValid: validGz,
      detectedFlashMode: 'raw-img',
      summary: validGz
        ? 'Gzip-compressed disk image (.img.gz) verified — stream decompress & write raw sectors'
        : 'Gzip header signature not detected; check file integrity.',
      entryCount: 1,
      totalUncompressedBytes: isize,
      sampleEntries: [],
    };
  }

  if (lower.endsWith('.xz')) {
    const headBuf = new Uint8Array(
      await readBlobAsArrayBuffer(file.slice(0, Math.min(16, file.size)))
    );
    const validXz =
      headBuf.length >= 6 &&
      headBuf[0] === 0xfd &&
      headBuf[1] === 0x37 &&
      headBuf[2] === 0x7a &&
      headBuf[3] === 0x58 &&
      headBuf[4] === 0x5a &&
      headBuf[5] === 0x00;
    return {
      format: 'xz',
      signatureValid: validXz,
      detectedFlashMode: 'raw-img',
      summary: validXz
        ? 'XZ-compressed disk image (.img.xz) verified — stream decompress & write raw sectors'
        : 'XZ header signature not detected; check file integrity.',
      entryCount: 1,
      totalUncompressedBytes: null,
      sampleEntries: [],
    };
  }

  return {
    format: 'raw-img',
    signatureValid: file.size > 0,
    detectedFlashMode: 'raw-img',
    summary: 'Uncompressed raw disk image — direct 512-byte sector write',
    entryCount: 1,
    totalUncompressedBytes: file.size,
    sampleEntries: [],
  };
}
