import { FlashMethod, HandheldOsEntry } from '../data/osCatalog';

export type CatalogSortField =
  | 'name'
  | 'recommendedCardGb'
  | 'imageSizeBytes'
  | 'releaseDate';

export type SortDirection = 'asc' | 'desc';

export interface CatalogFilterOptions {
  query: string;
  methodFilter: 'all' | FlashMethod;
  deviceModel: string; // 'all' or exact device name
  brandFilter?: 'all' | 'anbernic' | 'powkiddy' | 'ayn-retroid';
  sortBy: CatalogSortField;
  sortDirection: SortDirection;
}

export function getUniqueDeviceModels(catalog: HandheldOsEntry[]): string[] {
  const names = new Set<string>();
  for (const os of catalog) {
    for (const dev of os.devices) {
      names.add(dev.name);
    }
  }
  return Array.from(names).sort((a, b) => {
    if (a === 'TrimUI Brick') return -1;
    if (b === 'TrimUI Brick') return 1;
    return a.localeCompare(b);
  });
}

export function filterAndSortOsCatalog(
  catalog: HandheldOsEntry[],
  options: CatalogFilterOptions
): HandheldOsEntry[] {
  const q = options.query.trim().toLowerCase();

  const filtered = catalog.filter((os) => {
    if (options.methodFilter !== 'all' && os.method !== options.methodFilter) {
      return false;
    }

    if (options.brandFilter === 'anbernic') {
      const supportsAnbernic = os.devices.some((d) => d.name.startsWith('Anbernic'));
      if (!supportsAnbernic) return false;
    }

    if (options.brandFilter === 'powkiddy') {
      const supportsPowkiddy = os.devices.some((d) => d.name.startsWith('Powkiddy'));
      if (!supportsPowkiddy) return false;
    }

    if (options.brandFilter === 'ayn-retroid') {
      const supportsAynOrRetroid = os.devices.some(
        (d) => d.name.startsWith('AYN') || d.name.startsWith('Retroid')
      );
      if (!supportsAynOrRetroid) return false;
    }

    if (options.deviceModel !== 'all') {
      const matchesDevice = os.devices.some((d) => d.name === options.deviceModel);
      if (!matchesDevice) return false;
    }

    if (!q) return true;

    const haystacks = [
      os.name,
      os.version,
      os.baseSystem,
      os.supportedHardwareSummary,
      os.summary,
      os.recommendedCardRange,
      ...os.flashingInstructions,
      ...os.knownIssues,
      ...os.devices.map((d) => `${d.name} ${d.chipset}`),
    ];

    return haystacks.some((text) => text.toLowerCase().includes(q));
  });

  const dir = options.sortDirection === 'asc' ? 1 : -1;

  return [...filtered].sort((a, b) => {
    let cmp = 0;

    switch (options.sortBy) {
      case 'recommendedCardGb': {
        cmp = a.recommendedCardGb - b.recommendedCardGb;
        if (cmp === 0) cmp = a.name.localeCompare(b.name);
        return cmp * dir;
      }
      case 'imageSizeBytes': {
        cmp = a.imageSizeBytes - b.imageSizeBytes;
        if (cmp === 0) cmp = a.name.localeCompare(b.name);
        return cmp * dir;
      }
      case 'releaseDate': {
        cmp = a.releaseDate.localeCompare(b.releaseDate);
        if (cmp === 0) cmp = a.name.localeCompare(b.name);
        return cmp * dir;
      }
      case 'name':
      default: {
        return a.name.localeCompare(b.name) * dir;
      }
    }
  });
}
