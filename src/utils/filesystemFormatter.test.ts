import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildBootSector,
  buildMbrSector,
  computeFlashPlan,
  computePartitionPlan,
  getRecommendedClusterSize,
  validateVolumeLabel,
} from './filesystemFormatter';

test('validateVolumeLabel enforces FAT32 11-char ASCII rules', () => {
  const valid = validateVolumeLabel('knulli_sd', 'FAT32');
  assert.equal(valid.valid, true);
  assert.equal(valid.normalized, 'KNULLI_SD');

  const tooLong = validateVolumeLabel('RETRO_HANDHELD_123', 'FAT32');
  assert.equal(tooLong.valid, false);
  assert.match(tooLong.error ?? '', /11 characters/);

  const badChars = validateVolumeLabel('MY*CARD', 'FAT32');
  assert.equal(badChars.valid, false);
});

test('validateVolumeLabel enforces exFAT and NTFS label lengths', () => {
  assert.equal(validateVolumeLabel('Spruce_MiyooA30', 'exFAT').valid, true);
  assert.equal(validateVolumeLabel('ThisLabelIsTooLongForExFAT', 'exFAT').valid, false);
  assert.equal(validateVolumeLabel('Handheld_NTFS_Archive_Volume', 'NTFS').valid, true);
});

test('buildMbrSector sets valid 0x55AA signature and partition type', () => {
  const totalSectors = 125_000_000; // ~64 GB
  const fat32Mbr = buildMbrSector(totalSectors, 'FAT32');
  assert.equal(fat32Mbr.length, 512);
  assert.equal(fat32Mbr[0x1be + 4], 0x0c); // FAT32 LBA
  assert.equal(fat32Mbr[0x1fe], 0x55);
  assert.equal(fat32Mbr[0x1ff], 0xaa);

  const exfatMbr = buildMbrSector(totalSectors, 'exFAT');
  assert.equal(exfatMbr[0x1be + 4], 0x07);
  assert.equal(exfatMbr[0x1fe], 0x55);
  assert.equal(exfatMbr[0x1ff], 0xaa);
});

test('buildBootSector creates valid FAT32, exFAT, and NTFS headers', () => {
  const totalSectors = 125_000_000;

  const fat32 = buildBootSector({
    fs: 'FAT32',
    totalSectors,
    clusterSizeBytes: 32768,
    volumeLabel: 'SPRUCE',
  });
  assert.equal(fat32.bootSector[0], 0xeb);
  assert.equal(fat32.bootSector[510], 0x55);
  assert.equal(fat32.bootSector[511], 0xaa);
  assert.equal(
    String.fromCharCode(...fat32.bootSector.slice(82, 87)),
    'FAT32'
  );

  const exfat = buildBootSector({
    fs: 'exFAT',
    totalSectors,
    clusterSizeBytes: 131072,
    volumeLabel: 'ROMS',
  });
  assert.equal(String.fromCharCode(...exfat.bootSector.slice(3, 8)), 'EXFAT');
  assert.equal(exfat.bootSector[108], 9); // 512 byte sectors
  assert.equal(exfat.bootSector[510], 0x55);

  const ntfs = buildBootSector({
    fs: 'NTFS',
    totalSectors,
    clusterSizeBytes: 4096,
    volumeLabel: 'ARCHIVE',
  });
  assert.equal(String.fromCharCode(...ntfs.bootSector.slice(3, 7)), 'NTFS');
  assert.equal(ntfs.bootSector[510], 0x55);
});

test('computePartitionPlan computes usable capacity and hex previews', () => {
  const plan = computePartitionPlan({
    capacityBytes: 64_000_000_000,
    fs: 'FAT32',
    clusterSizeBytes: getRecommendedClusterSize(64_000_000_000, 'FAT32'),
    volumeLabel: 'MIYOO32',
  });

  assert.equal(plan.clusterSizeBytes, 32768);
  assert.equal(plan.mbrPartitionTypeHex, '0x0C (FAT32 LBA)');
  assert.ok(plan.usableBytes > 63_000_000_000);
  assert.ok(plan.bootSectorHexPreview.includes('FAT32'));
});

test('computeFlashPlan rejects images larger than target microSD card', () => {
  const tooSmall = computeFlashPlan(64_000_000_000, 32_000_000_000);
  assert.equal(tooSmall.feasible, false);
  assert.match(tooSmall.reason ?? '', /exceeds microSD capacity/);

  const valid = computeFlashPlan(2_580_000_000, 64_000_000_000);
  assert.equal(valid.feasible, true);
  assert.ok(valid.totalImageSectors > 5_000_000);
});
