export type FilesystemType = 'FAT32' | 'exFAT' | 'NTFS';

export interface ClusterSizeOption {
  bytes: number;
  label: string;
  recommendedFor?: string;
}

export interface LabelValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export interface PartitionPlan {
  filesystem: FilesystemType;
  volumeLabel: string;
  clusterSizeBytes: number;
  sectorSizeBytes: number;
  partitionStartLba: number;
  totalSectors: number;
  partitionSectors: number;
  reservedSectors: number;
  fatTableSectors: number;
  usableBytes: number;
  overheadBytes: number;
  mbrPartitionTypeHex: string;
  mbrBytes: Uint8Array;
  bootSectorBytes: Uint8Array;
  mbrHexPreview: string;
  bootSectorHexPreview: string;
}

export interface FlashPlan {
  feasible: boolean;
  reason?: string;
  imageSizeBytes: number;
  cardCapacityBytes: number;
  sectorSizeBytes: number;
  totalImageSectors: number;
  transferChunkBytes: number;
  totalChunks: number;
  remainingFreeBytes: number;
}

const SECTOR_SIZE = 512;
const PARTITION_START_LBA = 2048; // 1 MiB alignment for SD/flash wear leveling

export const CLUSTER_OPTIONS_BY_FS: Record<FilesystemType, ClusterSizeOption[]> = {
  FAT32: [
    { bytes: 4096, label: '4 KB' },
    { bytes: 16384, label: '16 KB' },
    { bytes: 32768, label: '32 KB (Handheld Recommended)', recommendedFor: 'Spruce, OnionOS, nxRedux FAT32' },
    { bytes: 65536, label: '64 KB (Large 256GB+ Cards)' },
  ],
  exFAT: [
    { bytes: 32768, label: '32 KB' },
    { bytes: 65536, label: '64 KB' },
    { bytes: 131072, label: '128 KB (Recommended)', recommendedFor: 'Large ROM libraries > 64 GB' },
  ],
  NTFS: [
    { bytes: 4096, label: '4 KB (Standard)', recommendedFor: 'General & Windows/Linux transfer' },
    { bytes: 16384, label: '16 KB' },
    { bytes: 65536, label: '64 KB' },
  ],
};

export function getRecommendedClusterSize(capacityBytes: number, fs: FilesystemType): number {
  const gb = capacityBytes / 1_000_000_000;
  if (fs === 'FAT32') {
    if (gb >= 256) return 65536;
    if (gb >= 16) return 32768;
    return 16384;
  }
  if (fs === 'exFAT') {
    if (gb >= 64) return 131072;
    return 32768;
  }
  return 4096;
}

export function validateVolumeLabel(rawLabel: string, fs: FilesystemType): LabelValidationResult {
  const trimmed = rawLabel.trim();

  if (trimmed.length === 0) {
    return { valid: true, normalized: fs === 'FAT32' ? 'RETROSD' : 'RETRO_SD' };
  }

  if (fs === 'FAT32') {
    const upper = trimmed.toUpperCase();
    if (upper.length > 11) {
      return {
        valid: false,
        normalized: upper.slice(0, 11),
        error: 'FAT32 volume labels must be 11 characters or fewer.',
      };
    }
    if (!/^[A-Z0-9 _\-]+$/.test(upper)) {
      return {
        valid: false,
        normalized: upper,
        error: 'FAT32 labels may only contain A–Z, 0–9, spaces, underscores, or hyphens.',
      };
    }
    return { valid: true, normalized: upper };
  }

  if (fs === 'exFAT') {
    if (trimmed.length > 15) {
      return {
        valid: false,
        normalized: trimmed.slice(0, 15),
        error: 'exFAT volume labels must be 15 characters or fewer.',
      };
    }
    if (/[*?/\\|<>:"]/.test(trimmed)) {
      return {
        valid: false,
        normalized: trimmed,
        error: 'exFAT label contains forbidden characters (* ? / \\ | < > : ").',
      };
    }
    return { valid: true, normalized: trimmed };
  }

  // NTFS
  if (trimmed.length > 32) {
    return {
      valid: false,
      normalized: trimmed.slice(0, 32),
      error: 'NTFS volume labels must be 32 characters or fewer.',
    };
  }
  return { valid: true, normalized: trimmed };
}

function writeUint16LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
}

function writeUint32LE(buf: Uint8Array, offset: number, value: number): void {
  buf[offset] = value & 0xff;
  buf[offset + 1] = (value >>> 8) & 0xff;
  buf[offset + 2] = (value >>> 16) & 0xff;
  buf[offset + 3] = (value >>> 24) & 0xff;
}

function writeUint64LE(buf: Uint8Array, offset: number, value: number): void {
  const safe = Math.max(0, Math.floor(value));
  const low = safe >>> 0;
  const high = Math.floor(safe / 4294967296) >>> 0;
  writeUint32LE(buf, offset, low);
  writeUint32LE(buf, offset + 4, high);
}

function writeAscii(buf: Uint8Array, offset: number, text: string, length: number, padChar = ' '): void {
  const padded = text.padEnd(length, padChar).slice(0, length);
  for (let i = 0; i < length; i++) {
    buf[offset + i] = padded.charCodeAt(i) & 0x7f;
  }
}

export function buildMbrSector(totalSectors: number, fs: FilesystemType): Uint8Array {
  const mbr = new Uint8Array(SECTOR_SIZE);
  const partitionSectors = Math.max(1, totalSectors - PARTITION_START_LBA);
  const clampedPartitionSectors = Math.min(partitionSectors, 0xffffffff);
  const partitionType = fs === 'FAT32' ? 0x0c : 0x07;

  // Disk signature at 0x1B8
  writeUint32LE(mbr, 0x1b8, 0x50464c53); // 'PFLS'

  // Partition Entry 1 at 0x1BE (16 bytes)
  const p = 0x1be;
  mbr[p + 0] = 0x00; // Non-active primary partition (bootable via BIOS/UEFI or handheld bootloader)
  mbr[p + 1] = 0x20; // Starting Head
  mbr[p + 2] = 0x21; // Starting Sector
  mbr[p + 3] = 0x00; // Starting Cylinder
  mbr[p + 4] = partitionType; // 0x0C FAT32 LBA, 0x07 exFAT/NTFS
  mbr[p + 5] = 0xfe; // Ending Head (LBA clamped)
  mbr[p + 6] = 0xff; // Ending Sector
  mbr[p + 7] = 0xff; // Ending Cylinder
  writeUint32LE(mbr, p + 8, PARTITION_START_LBA);
  writeUint32LE(mbr, p + 12, clampedPartitionSectors);

  // Boot signature 0x55AA at 0x1FE
  mbr[0x1fe] = 0x55;
  mbr[0x1ff] = 0xaa;

  return mbr;
}

export function buildBootSector(params: {
  fs: FilesystemType;
  totalSectors: number;
  clusterSizeBytes: number;
  volumeLabel: string;
}): { bootSector: Uint8Array; reservedSectors: number; fatTableSectors: number } {
  const { fs, totalSectors, clusterSizeBytes, volumeLabel } = params;
  const partitionSectors = Math.max(2048, totalSectors - PARTITION_START_LBA);
  const sectorsPerCluster = Math.max(1, Math.floor(clusterSizeBytes / SECTOR_SIZE));
  const vbr = new Uint8Array(SECTOR_SIZE);

  if (fs === 'FAT32') {
    const reservedSectors = 32;
    const numFats = 2;
    const tmpVal1 = partitionSectors - reservedSectors;
    const tmpVal2 = 256 * sectorsPerCluster + numFats;
    const fatSz32 = Math.max(1, Math.ceil((tmpVal1 + tmpVal2 - 1) / (tmpVal2 / 2)));

    vbr[0] = 0xeb;
    vbr[1] = 0x58;
    vbr[2] = 0x90;
    writeAscii(vbr, 3, 'MSDOS5.0', 8);
    writeUint16LE(vbr, 11, SECTOR_SIZE);
    vbr[13] = sectorsPerCluster;
    writeUint16LE(vbr, 14, reservedSectors);
    vbr[16] = numFats;
    writeUint16LE(vbr, 17, 0); // RootEntCnt = 0 for FAT32
    writeUint16LE(vbr, 19, 0); // TotSec16 = 0 for FAT32
    vbr[21] = 0xf8; // Fixed / removable media descriptor
    writeUint16LE(vbr, 22, 0); // FATSz16 = 0
    writeUint16LE(vbr, 24, 63); // SecPerTrk
    writeUint16LE(vbr, 26, 255); // NumHeads
    writeUint32LE(vbr, 28, PARTITION_START_LBA); // HiddSec
    writeUint32LE(vbr, 32, Math.min(partitionSectors, 0xffffffff)); // TotSec32

    // FAT32 Extended BPB
    writeUint32LE(vbr, 36, fatSz32);
    writeUint16LE(vbr, 40, 0); // ExtFlags
    writeUint16LE(vbr, 42, 0); // FSVer 0.0
    writeUint32LE(vbr, 44, 2); // RootClus = 2
    writeUint16LE(vbr, 48, 1); // FSInfo = sector 1
    writeUint16LE(vbr, 50, 6); // BkBootSec = sector 6
    vbr[64] = 0x80; // DrvNum
    vbr[66] = 0x29; // BootSig
    writeUint32LE(vbr, 67, 0x20261121); // VolID
    writeAscii(vbr, 71, volumeLabel || 'RETROSD', 11, ' ');
    writeAscii(vbr, 82, 'FAT32   ', 8, ' ');
    vbr[510] = 0x55;
    vbr[511] = 0xaa;

    return { bootSector: vbr, reservedSectors, fatTableSectors: fatSz32 * numFats };
  }

  if (fs === 'exFAT') {
    const reservedSectors = 24; // 12 primary + 12 backup boot region
    const fatOffset = 24;
    const totalClustersEstimate = Math.max(16, Math.floor((partitionSectors - 24) / sectorsPerCluster));
    const fatLengthSectors = Math.max(1, Math.ceil((totalClustersEstimate * 4 + 8) / SECTOR_SIZE));
    const clusterHeapOffset = fatOffset + fatLengthSectors;
    const clusterCount = Math.max(1, Math.floor((partitionSectors - clusterHeapOffset) / sectorsPerCluster));

    vbr[0] = 0xeb;
    vbr[1] = 0x76;
    vbr[2] = 0x90;
    writeAscii(vbr, 3, 'EXFAT   ', 8);
    // Bytes 11..63 must be zero in exFAT
    writeUint64LE(vbr, 64, PARTITION_START_LBA);
    writeUint64LE(vbr, 72, partitionSectors);
    writeUint32LE(vbr, 80, fatOffset);
    writeUint32LE(vbr, 84, fatLengthSectors);
    writeUint32LE(vbr, 88, clusterHeapOffset);
    writeUint32LE(vbr, 92, clusterCount);
    writeUint32LE(vbr, 96, 4); // FirstClusterOfRootDirectory
    writeUint32LE(vbr, 100, 0x20261121); // VolumeSerialNumber
    writeUint16LE(vbr, 104, 0x0100); // FileSystemRevision 1.00
    writeUint16LE(vbr, 106, 0x0000); // VolumeFlags
    vbr[108] = 9; // BytesPerSectorShift (2^9 = 512)
    vbr[109] = Math.round(Math.log2(sectorsPerCluster)); // SectorsPerClusterShift
    vbr[110] = 1; // NumberOfFats
    vbr[111] = 0x80; // DriveSelect
    vbr[112] = 0xff; // PercentInUse unknown
    vbr[510] = 0x55;
    vbr[511] = 0xaa;

    return { bootSector: vbr, reservedSectors, fatTableSectors: fatLengthSectors };
  }

  // NTFS
  const reservedSectors = 16;
  const totalClusters = Math.max(16, Math.floor(partitionSectors / sectorsPerCluster));
  const mftCluster = Math.min(786432, Math.max(4, Math.floor(totalClusters / 4)));
  const mftMirrCluster = Math.max(2, Math.floor(totalClusters / 2));

  vbr[0] = 0xeb;
  vbr[1] = 0x52;
  vbr[2] = 0x90;
  writeAscii(vbr, 3, 'NTFS    ', 8);
  writeUint16LE(vbr, 11, SECTOR_SIZE);
  vbr[13] = sectorsPerCluster;
  writeUint16LE(vbr, 14, 0); // ReservedSectors = 0 in NTFS BPB
  vbr[21] = 0xf8; // Media descriptor
  writeUint16LE(vbr, 24, 63);
  writeUint16LE(vbr, 26, 255);
  writeUint32LE(vbr, 28, PARTITION_START_LBA);
  vbr[36] = 0x80;
  writeUint64LE(vbr, 40, partitionSectors - 1);
  writeUint64LE(vbr, 48, mftCluster);
  writeUint64LE(vbr, 56, mftMirrCluster);
  vbr[64] = 0xf6; // -10 -> 1024 bytes per MFT record
  vbr[68] = 1; // Clusters per index buffer
  writeUint32LE(vbr, 72, 0x50464c53); // Volume serial low ('PFLS')
  writeUint32LE(vbr, 76, 0x20261121); // Volume serial high
  vbr[510] = 0x55;
  vbr[511] = 0xaa;

  // Approximate NTFS metadata overhead ($MFT + $LogFile + $Bitmap) ~ 0.15% of capacity (min 4MB)
  const metadataSectors = Math.max(8192, Math.floor(partitionSectors * 0.0015));
  return { bootSector: vbr, reservedSectors, fatTableSectors: metadataSectors };
}

export function formatHexPreview(bytes: Uint8Array, maxBytes = 96): string {
  const lines: string[] = [];
  const limit = Math.min(bytes.length, maxBytes);
  for (let i = 0; i < limit; i += 16) {
    const offset = i.toString(16).padStart(4, '0').toUpperCase();
    const slice = bytes.slice(i, Math.min(i + 16, limit));
    const hex = Array.from(slice)
      .map((b) => b.toString(16).padStart(2, '0').toUpperCase())
      .join(' ');
    const ascii = Array.from(slice)
      .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.'))
      .join('');
    lines.push(`${offset}  ${hex.padEnd(47, ' ')}  |${ascii}|`);
  }
  return lines.join('\n');
}

export function computePartitionPlan(params: {
  capacityBytes: number;
  fs: FilesystemType;
  clusterSizeBytes: number;
  volumeLabel: string;
}): PartitionPlan {
  const { capacityBytes, fs, clusterSizeBytes, volumeLabel } = params;
  const totalSectors = Math.max(4096, Math.floor(capacityBytes / SECTOR_SIZE));
  const partitionSectors = Math.max(2048, totalSectors - PARTITION_START_LBA);
  const mbrBytes = buildMbrSector(totalSectors, fs);
  const { bootSector, reservedSectors, fatTableSectors } = buildBootSector({
    fs,
    totalSectors,
    clusterSizeBytes,
    volumeLabel,
  });

  const overheadSectors = PARTITION_START_LBA + reservedSectors + fatTableSectors;
  const overheadBytes = overheadSectors * SECTOR_SIZE;
  const usableBytes = Math.max(0, capacityBytes - overheadBytes);

  return {
    filesystem: fs,
    volumeLabel,
    clusterSizeBytes,
    sectorSizeBytes: SECTOR_SIZE,
    partitionStartLba: PARTITION_START_LBA,
    totalSectors,
    partitionSectors,
    reservedSectors,
    fatTableSectors,
    usableBytes,
    overheadBytes,
    mbrPartitionTypeHex: fs === 'FAT32' ? '0x0C (FAT32 LBA)' : '0x07 (exFAT / NTFS)',
    mbrBytes,
    bootSectorBytes: bootSector,
    mbrHexPreview: formatHexPreview(mbrBytes.slice(0x1b0, 0x200), 80),
    bootSectorHexPreview: formatHexPreview(bootSector, 96),
  };
}

export function computeFlashPlan(
  imageSizeBytes: number,
  cardCapacityBytes: number,
  transferChunkBytes = 65536
): FlashPlan {
  if (imageSizeBytes <= 0) {
    return {
      feasible: false,
      reason: 'Selected OS image has zero bytes.',
      imageSizeBytes,
      cardCapacityBytes,
      sectorSizeBytes: SECTOR_SIZE,
      totalImageSectors: 0,
      transferChunkBytes,
      totalChunks: 0,
      remainingFreeBytes: cardCapacityBytes,
    };
  }

  if (imageSizeBytes > cardCapacityBytes) {
    return {
      feasible: false,
      reason: `OS image (${formatBytes(imageSizeBytes)}) exceeds microSD capacity (${formatBytes(cardCapacityBytes)}).`,
      imageSizeBytes,
      cardCapacityBytes,
      sectorSizeBytes: SECTOR_SIZE,
      totalImageSectors: Math.ceil(imageSizeBytes / SECTOR_SIZE),
      transferChunkBytes,
      totalChunks: Math.ceil(imageSizeBytes / transferChunkBytes),
      remainingFreeBytes: 0,
    };
  }

  return {
    feasible: true,
    imageSizeBytes,
    cardCapacityBytes,
    sectorSizeBytes: SECTOR_SIZE,
    totalImageSectors: Math.ceil(imageSizeBytes / SECTOR_SIZE),
    transferChunkBytes,
    totalChunks: Math.ceil(imageSizeBytes / transferChunkBytes),
    remainingFreeBytes: cardCapacityBytes - imageSizeBytes,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let idx = 0;
  let val = bytes;
  while (val >= 1024 && idx < units.length - 1) {
    val /= 1024;
    idx++;
  }
  return `${val >= 100 || idx === 0 ? val.toFixed(0) : val.toFixed(2)} ${units[idx]}`;
}
