import { HandheldOsEntry, HandheldTarget } from '../data/osCatalog';

export type RecommendationPriority = 'balanced' | 'fast-boot' | 'features' | 'beginner';

export const RECOMMENDATION_PRIORITY_OPTIONS: {
  value: RecommendationPriority;
  label: string;
}[] = [
  { value: 'balanced', label: 'Balanced' },
  { value: 'fast-boot', label: 'Fast Boot & Sleep' },
  { value: 'features', label: 'Features & PortMaster' },
  { value: 'beginner', label: 'Beginner Friendly' },
];

export interface OsRecommendation {
  os: HandheldOsEntry;
  deviceTarget: HandheldTarget;
  bestForLabel: string;
  reasonSummary: string;
  recommendedSdSpec: string;
}

export interface DeviceRecommendationPlan {
  deviceName: string;
  chipset: string;
  primary: OsRecommendation;
  alternatives: OsRecommendation[];
}

const PRIORITY_DEVICE_ORDER: Record<RecommendationPriority, Record<string, string[]>> = {
  balanced: {
    'TrimUI Brick': ['nextui', 'knulli', 'pakui', 'crossmix', 'nxredux', 'rocknix', 'spruce'],
    'TrimUI Smart Pro': ['crossmix', 'knulli', 'nextui'],
    'Anbernic RG35XX Plus / H / SP': ['muos', 'knulli', 'rocknix'],
    'Anbernic RG40XX H / V': ['muos', 'knulli', 'rocknix'],
    'Anbernic RG CubeXX': ['muos', 'knulli', 'rocknix'],
    'Anbernic RG34XX': ['muos', 'knulli'],
    'Anbernic RG28XX': ['muos', 'knulli'],
    'Anbernic RG35XX (2024 H700)': ['muos', 'knulli'],
    'Anbernic RG35XX (2022 Original)': ['garlicos'],
    'Anbernic RG353V / VS / M / P': ['arkos', 'rocknix'],
    'Anbernic RG503': ['arkos', 'rocknix'],
    'Anbernic RG ARC-D / ARC-S': ['rocknix'],
    'Anbernic RG351P / M': ['amberelec', 'arkos'],
    'Anbernic RG351V / MP': ['amberelec', 'arkos'],
    'Anbernic RG552': ['amberelec'],
    'Powkiddy RGB30': ['rocknix', 'arkos', 'knulli'],
    'Powkiddy RGB20SX': ['rocknix', 'arkos', 'knulli'],
    'Powkiddy X55': ['rocknix'],
    'Powkiddy RGB10 Max 3': ['rocknix'],
    'Powkiddy RK2023': ['rocknix', 'arkos'],
    'Powkiddy V10': ['arkos', 'amberelec', 'rocknix'],
    'Powkiddy RGB20S / RGB10 Max 2': ['amberelec', 'arkos'],
    'Retroid Pocket 6': ['rocknix', 'armadaos', 'lineageos'],
    'Retroid Pocket 5': ['rocknix', 'armadaos', 'lineageos'],
    'Retroid Pocket 4 / 4 Pro': ['lineageos'],
    'Retroid Pocket Mini': ['rocknix', 'armadaos', 'lineageos'],
    'Retroid Pocket Flip 2': ['rocknix', 'armadaos'],
    'Retroid Pocket 3+ / Flip': ['lineageos'],
    'AYN Odin 2 / Odin 2 Mini / Portal': ['armadaos', 'rocknix', 'lineageos'],
    'AYN Odin (Base / Pro)': ['lineageos', 'armadaos'],
    'Miyoo A30': ['spruce'],
    'Miyoo Mini / Miyoo Mini+': ['onionos'],
  },
  'fast-boot': {
    'TrimUI Brick': ['nextui', 'pakui', 'nxredux', 'crossmix', 'knulli'],
    'TrimUI Smart Pro': ['nextui', 'crossmix', 'knulli'],
    'Anbernic RG35XX Plus / H / SP': ['muos', 'knulli', 'rocknix'],
    'Anbernic RG40XX H / V': ['muos', 'knulli', 'rocknix'],
    'Anbernic RG CubeXX': ['muos', 'knulli', 'rocknix'],
    'Anbernic RG34XX': ['muos', 'knulli'],
    'Anbernic RG28XX': ['muos', 'knulli'],
    'Anbernic RG35XX (2024 H700)': ['muos', 'knulli'],
    'Anbernic RG35XX (2022 Original)': ['garlicos'],
    'Anbernic RG353V / VS / M / P': ['arkos', 'rocknix'],
    'Anbernic RG503': ['arkos', 'rocknix'],
    'Anbernic RG351P / M': ['arkos', 'amberelec'],
    'Anbernic RG351V / MP': ['arkos', 'amberelec'],
    'Powkiddy RGB30': ['arkos', 'rocknix', 'knulli'],
    'Powkiddy RGB20SX': ['arkos', 'rocknix', 'knulli'],
    'Powkiddy RK2023': ['arkos', 'rocknix'],
    'Powkiddy V10': ['arkos', 'amberelec', 'rocknix'],
    'Powkiddy RGB20S / RGB10 Max 2': ['arkos', 'amberelec'],
    'Retroid Pocket 6': ['armadaos', 'rocknix', 'lineageos'],
    'Retroid Pocket 5': ['armadaos', 'rocknix', 'lineageos'],
    'Retroid Pocket 4 / 4 Pro': ['lineageos'],
    'Retroid Pocket Mini': ['armadaos', 'rocknix', 'lineageos'],
    'Retroid Pocket Flip 2': ['armadaos', 'rocknix'],
    'Retroid Pocket 3+ / Flip': ['lineageos'],
    'AYN Odin 2 / Odin 2 Mini / Portal': ['armadaos', 'rocknix', 'lineageos'],
    'AYN Odin (Base / Pro)': ['armadaos', 'lineageos'],
  },
  features: {
    'TrimUI Brick': ['knulli', 'crossmix', 'pakui', 'nxredux', 'nextui', 'rocknix'],
    'TrimUI Smart Pro': ['knulli', 'crossmix', 'nextui'],
    'Anbernic RG35XX Plus / H / SP': ['knulli', 'muos', 'rocknix'],
    'Anbernic RG40XX H / V': ['knulli', 'muos', 'rocknix'],
    'Anbernic RG CubeXX': ['knulli', 'muos', 'rocknix'],
    'Anbernic RG34XX': ['knulli', 'muos'],
    'Anbernic RG28XX': ['knulli', 'muos'],
    'Anbernic RG353V / VS / M / P': ['rocknix', 'arkos'],
    'Anbernic RG503': ['rocknix', 'arkos'],
    'Anbernic RG351P / M': ['arkos', 'amberelec'],
    'Anbernic RG351V / MP': ['arkos', 'amberelec'],
    'Powkiddy RGB30': ['rocknix', 'knulli', 'arkos'],
    'Powkiddy RGB20SX': ['rocknix', 'knulli', 'arkos'],
    'Powkiddy RK2023': ['rocknix', 'arkos'],
    'Powkiddy V10': ['rocknix', 'arkos', 'amberelec'],
    'Powkiddy RGB20S / RGB10 Max 2': ['arkos', 'amberelec'],
    'Retroid Pocket 6': ['lineageos', 'rocknix', 'armadaos'],
    'Retroid Pocket 5': ['lineageos', 'rocknix', 'armadaos'],
    'Retroid Pocket 4 / 4 Pro': ['lineageos'],
    'Retroid Pocket Mini': ['lineageos', 'rocknix', 'armadaos'],
    'Retroid Pocket Flip 2': ['rocknix', 'armadaos'],
    'Retroid Pocket 3+ / Flip': ['lineageos'],
    'AYN Odin 2 / Odin 2 Mini / Portal': ['lineageos', 'armadaos', 'rocknix'],
    'AYN Odin (Base / Pro)': ['lineageos', 'armadaos'],
  },
  beginner: {
    'TrimUI Brick': ['nextui', 'crossmix', 'nxredux', 'knulli', 'pakui'],
    'TrimUI Smart Pro': ['crossmix', 'nextui', 'knulli'],
    'Anbernic RG35XX Plus / H / SP': ['muos', 'knulli', 'rocknix'],
    'Anbernic RG40XX H / V': ['muos', 'knulli', 'rocknix'],
    'Anbernic RG CubeXX': ['muos', 'knulli', 'rocknix'],
    'Anbernic RG34XX': ['muos', 'knulli'],
    'Anbernic RG28XX': ['muos', 'knulli'],
    'Anbernic RG353V / VS / M / P': ['arkos', 'rocknix'],
    'Anbernic RG503': ['arkos', 'rocknix'],
    'Anbernic RG351P / M': ['amberelec', 'arkos'],
    'Anbernic RG351V / MP': ['amberelec', 'arkos'],
    'Powkiddy RGB30': ['rocknix', 'knulli', 'arkos'],
    'Powkiddy RGB20SX': ['rocknix', 'knulli', 'arkos'],
    'Powkiddy RK2023': ['rocknix', 'arkos'],
    'Powkiddy V10': ['amberelec', 'arkos', 'rocknix'],
    'Powkiddy RGB20S / RGB10 Max 2': ['amberelec', 'arkos'],
    'Retroid Pocket 6': ['rocknix', 'armadaos', 'lineageos'],
    'Retroid Pocket 5': ['rocknix', 'armadaos', 'lineageos'],
    'Retroid Pocket 4 / 4 Pro': ['lineageos'],
    'Retroid Pocket Mini': ['rocknix', 'armadaos', 'lineageos'],
    'Retroid Pocket Flip 2': ['rocknix', 'armadaos'],
    'Retroid Pocket 3+ / Flip': ['lineageos'],
    'AYN Odin 2 / Odin 2 Mini / Portal': ['rocknix', 'armadaos', 'lineageos'],
    'AYN Odin (Base / Pro)': ['lineageos', 'armadaos'],
  },
};

function buildReasonSummary(
  os: HandheldOsEntry,
  deviceTarget: HandheldTarget,
  priority: RecommendationPriority,
  isPrimary: boolean
): { bestForLabel: string; reasonSummary: string } {
  const isBrick = deviceTarget.name === 'TrimUI Brick';

  if (os.id === 'nextui' && isBrick) {
    return {
      bestForLabel: isPrimary ? 'Best Overall for TrimUI Brick' : 'Fastest Boot & Deep Sleep',
      reasonSummary:
        'Purpose-built for TrimUI Brick 1024×768 scaling with <0.3%/hr deep sleep, native Fn switch support, and simple FAT32 folder setup.',
    };
  }
  if (os.id === 'knulli') {
    return {
      bestForLabel:
        priority === 'features' || !isPrimary
          ? 'Best Frontend & PortMaster'
          : 'Best Overall Frontend',
      reasonSummary: `Batocera EmulationStation interface with box-art scraping, shaders, Bluetooth audio, and PortMaster tuned for ${deviceTarget.chipset}.`,
    };
  }
  if (os.id === 'muos') {
    return {
      bestForLabel:
        priority === 'fast-boot'
          ? 'Fastest Cold Boot (9s)'
          : isPrimary
          ? 'Best Overall for Anbernic H700'
          : 'Fastest Boot & exFAT ROMs',
      reasonSummary: `9-second cold boot on ${deviceTarget.chipset}, native clamshell/sleep handling, and Android/PC-readable exFAT ROM storage.`,
    };
  }
  if (os.id === 'arkos') {
    return {
      bestForLabel: isPrimary ? 'Best Performance on Rockchip' : 'Maximum Emulator Speed',
      reasonSummary: `Ubuntu ARM64 performance profile for ${deviceTarget.chipset} with standalone N64, Dreamcast, PSP, and Saturn cores plus exFAT EASYROMS.`,
    };
  }
  if (os.id === 'amberelec') {
    return {
      bestForLabel: isPrimary ? 'Best Turnkey RK3326/RK3399 OS' : 'Easiest Pre-Tuned Presets',
      reasonSummary: `Curated out-of-the-box RetroArch bezels, shaders, and controller mappings tailored to ${deviceTarget.name}.`,
    };
  }
  if (os.id === 'rocknix') {
    return {
      bestForLabel: isPrimary ? 'Best Mainline Linux OS' : 'Best Mainline Panfrost GPU',
      reasonSummary: `Up-to-date mainline Linux kernel with Mesa/Panfrost Vulkan drivers and unified EmulationStation across ${deviceTarget.chipset}.`,
    };
  }
  if (os.id === 'garlicos') {
    return {
      bestForLabel: 'Best Overall for 2022 RG35XX',
      reasonSummary:
        'Dedicated instant-boot RetroArch firmware with Quick Switcher built exclusively for the Actions ATM7039S board.',
    };
  }
  if (os.id === 'pakui') {
    return {
      bestForLabel: 'Best for RetroAchievements & BitPal',
      reasonSummary:
        'TrimUI Brick-specific MinUI extension adding Wi-Fi RetroAchievements, BitPal companion, and custom Brick LED controls.',
    };
  }
  if (os.id === 'crossmix') {
    return {
      bestForLabel: isPrimary ? 'Best Stock-Enhanced OS' : 'Best for Stock Compatibility',
      reasonSummary:
        'Enhances TrimUI Stock OS with PortMaster, OTA updates, Bluetooth audio, and pre-tuned RetroArch overlays.',
    };
  }
  if (os.id === 'spruce') {
    return {
      bestForLabel:
        deviceTarget.name === 'Miyoo A30'
          ? 'Best Overall for Miyoo A30'
          : 'Experimental Nightly Option',
      reasonSummary:
        deviceTarget.name === 'Miyoo A30'
          ? 'Fast GameSwitcher, auto-save/resume, and Syncthing tailored to Miyoo A30.'
          : 'Early Allwinner A133P alpha build with GameSwitcher; recommended on a spare card.',
    };
  }
  if (os.id === 'onionos') {
    return {
      bestForLabel: 'Best Overall for Miyoo Mini',
      reasonSummary:
        'Gold-standard GameSwitcher, Cartridge Mode, and OTA updates for SigmaStar SSD202D handhelds.',
    };
  }
  if (os.id === 'nxredux') {
    return {
      bestForLabel: isPrimary ? 'Top TrimUI Brick Firmware' : 'Clean Stock-Based Brick OS',
      reasonSummary:
        'Streamlined TrimUI Brick firmware with 1024×768 RetroArch presets, Fn switch support, and simple FAT32 setup.',
    };
  }
  if (os.id === 'armadaos') {
    return {
      bestForLabel: isPrimary ? 'Best Console-Style Snapdragon Linux' : 'ES-DE & Turnip Vulkan OS',
      reasonSummary: `ARM64 Linux with EmulationStation-DE, Mesa Turnip Vulkan drivers, and PortMaster tuned for ${deviceTarget.chipset} microSD boot.`,
    };
  }
  if (os.id === 'lineageos') {
    return {
      bestForLabel: isPrimary ? 'Best Clean Android SD Dual-Boot' : 'De-Bloated Android 15 ROM',
      reasonSummary: `Bloat-free LineageOS 22.1 booting from microSD on ${deviceTarget.chipset} with native controller HAL and zero internal storage changes.`,
    };
  }

  return {
    bestForLabel: isPrimary ? 'Top Match' : 'Compatible Alternative',
    reasonSummary: deviceTarget.notes || os.summary,
  };
}

export function suggestBestOsByDevice(
  catalog: HandheldOsEntry[],
  deviceName: string,
  priority: RecommendationPriority = 'balanced'
): DeviceRecommendationPlan | null {
  const candidates: { os: HandheldOsEntry; deviceTarget: HandheldTarget }[] = [];

  for (const os of catalog) {
    const match = os.devices.find((d) => d.name === deviceName);
    if (match) {
      candidates.push({ os, deviceTarget: match });
    }
  }

  if (candidates.length === 0) return null;

  const preferredOrder = PRIORITY_DEVICE_ORDER[priority]?.[deviceName] ?? [];

  const sorted = [...candidates].sort((a, b) => {
    const idxA = preferredOrder.indexOf(a.os.id);
    const idxB = preferredOrder.indexOf(b.os.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;

    // Fallback: Verified TrimUI Brick before Experimental, then newest releaseDate
    if (deviceName === 'TrimUI Brick') {
      const rank = { Verified: 0, Experimental: 1, 'Other Handhelds': 2 };
      const diff = rank[a.os.trimuiBrickSupport] - rank[b.os.trimuiBrickSupport];
      if (diff !== 0) return diff;
    }
    return b.os.releaseDate.localeCompare(a.os.releaseDate);
  });

  const mapped: OsRecommendation[] = sorted.map((entry, idx) => {
    const { bestForLabel, reasonSummary } = buildReasonSummary(
      entry.os,
      entry.deviceTarget,
      priority,
      idx === 0
    );
    return {
      os: entry.os,
      deviceTarget: entry.deviceTarget,
      bestForLabel,
      reasonSummary,
      recommendedSdSpec: `${entry.os.recommendedCardRange} (${entry.os.recommendedFormat})`,
    };
  });

  return {
    deviceName,
    chipset: sorted[0].deviceTarget.chipset,
    primary: mapped[0],
    alternatives: mapped.slice(1, 3),
  };
}
