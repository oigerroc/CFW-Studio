import { HandheldOsEntry } from '../data/osCatalog';
import { StorageTarget } from './usbMassStorage';

export interface AppDifferentiationRow {
  capability: string;
  cfwStudio: string;
  desktopImagers: string;
  mobileWriters: string;
}

export interface LegalNoticeItem {
  id: string;
  title: string;
  body: string;
}

export const APP_DIFFERENTIATORS: AppDifferentiationRow[] = [
  {
    capability: 'Host Requirement',
    cfwStudio: 'Rootless browser app (Android USB-C OTG or Desktop Chrome)',
    desktopImagers: 'Requires Windows, macOS, or Linux PC',
    mobileWriters: 'Android app only; no catalog or formatter',
  },
  {
    capability: 'Handheld Install Modes',
    cfwStudio: 'Dual pipeline: raw sector (.img/.gz/.xz) + 32 KB FAT32 packages (.zip/.7z)',
    desktopImagers: 'Raw disk image flash only; manual archive formatting required',
    mobileWriters: 'Raw .img write only; no FAT32 package prep',
  },
  {
    capability: 'FAT32 > 32 GB Support',
    cfwStudio: 'MBR FAT32 (0x0C, 32 KB clusters) up to 2 TB + live MBR/VBR hex inspector',
    desktopImagers: 'Windows Format caps FAT32 at 32 GB; separate tools needed',
    mobileWriters: 'Not supported',
  },
  {
    capability: 'Chipset & OS Advisor',
    cfwStudio: '14 handheld OSes mapped by SoC (A133P, H700, RK3566, Snapdragon) + Best-OS picker',
    desktopImagers: 'Board-agnostic file picker; easy to flash wrong SoC image',
    mobileWriters: 'Generic file picker with no hardware matching',
  },
  {
    capability: 'Live Upstream Checks',
    cfwStudio: 'Checks stable GitHub releases on startup & streams directly without local repackaging',
    desktopImagers: 'Manual browser download or non-handheld OS lists',
    mobileWriters: 'Manual file download required beforehand',
  },
];

export const PUBLIC_RELEASE_NOTICES: LegalNoticeItem[] = [
  {
    id: 'no-bundled-binaries',
    title: 'Zero Bundled Firmware, BIOS, or ROMs',
    body: 'CFW Studio does not host, mirror, redistribute, or bundle proprietary firmware, copyrighted BIOS files, commercial games, or third-party OS images. Curated entries reference official upstream projects and fetch release metadata directly from upstream GitHub repositories or user-supplied local archives.',
  },
  {
    id: 'upstream-licenses',
    title: 'Respect for Upstream OS Licenses',
    body: 'Each listed operating system remains the intellectual property of its respective creators and contributors under its upstream license (such as GPL-2.0, GPL-3.0, MIT, Apache-2.0, or PolyForm Noncommercial 1.0.0 for NextUI and CC BY-NC-SA 4.0 branding for ROCKNIX). Commercial redistribution of non-commercial upstream packages is prohibited by their authors.',
  },
  {
    id: 'trademarks-independence',
    title: 'Independent Utility & Trademark Notice',
    body: 'CFW Studio is an independent open-source retro handheld utility and is not affiliated with, endorsed by, or sponsored by TrimUI, Anbernic, Powkiddy, Miyoo, AYN, Retroid, Microsoft, Google, SD Association, or any listed custom firmware team. Device and OS names are used strictly for nominative compatibility identification.',
  },
  {
    id: 'distinct-identity',
    title: 'Distinct Product Identity',
    body: 'CFW Studio is an independent browser-based retro handheld CFW flasher and MBR filesystem formatter, distinct from desktop PC imagers and device-specific flashing suites.',
  },
];

const RESERVED_SD_BRAND_PATTERN = /\b(sandisk|samsung|lexar|kingston|pny|micron)\b/i;

export function validateCatalogCredits(catalog: HandheldOsEntry[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  for (const os of catalog) {
    if (!os.credits) {
      issues.push(`${os.id}: missing credits metadata`);
      continue;
    }
    if (!os.credits.creators.trim()) {
      issues.push(`${os.id}: missing creators`);
    }
    if (!os.credits.basedOn.trim()) {
      issues.push(`${os.id}: missing basedOn attribution`);
    }
    if (!os.credits.license.trim()) {
      issues.push(`${os.id}: missing license`);
    }
    if (!os.credits.projectLabel.trim()) {
      issues.push(`${os.id}: missing projectLabel`);
    }
    if (!/^https:\/\/.+/.test(os.credits.projectUrl)) {
      issues.push(`${os.id}: projectUrl must be an HTTPS URL`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

export function findTrademarkedVirtualTargets(targets: StorageTarget[]): string[] {
  return targets
    .filter((t) => t.connectionType === 'virtual-otg')
    .filter(
      (t) =>
        RESERVED_SD_BRAND_PATTERN.test(t.name) ||
        RESERVED_SD_BRAND_PATTERN.test(t.vendor) ||
        RESERVED_SD_BRAND_PATTERN.test(t.volumeLabel)
    )
    .map((t) => t.id);
}
