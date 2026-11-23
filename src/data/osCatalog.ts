export type FlashMethod = 'raw-img' | 'fat32-package';

export type TrimuiBrickSupport = 'Verified' | 'Experimental' | 'Other Handhelds';

export interface PartitionSpec {
  label: string;
  filesystem: 'FAT32' | 'ext4' | 'exFAT' | 'NTFS' | 'RAW-EMU';
  sizeDescription: string;
  role: string;
  fractionPercent: number;
}

export interface HandheldTarget {
  id: string;
  name: string;
  chipset: string;
  recommendedCardMinGb: number;
  notes: string;
}

export interface OsCreatorCredits {
  creators: string;
  basedOn: string;
  license: string;
  projectUrl: string;
  projectLabel: string;
}

export interface HandheldOsEntry {
  id: string;
  name: string;
  version: string;
  releaseDate: string;
  baseSystem: string;
  credits: OsCreatorCredits;
  method: FlashMethod;
  methodLabel: string;
  imageSizeBytes: number;
  imageSizeLabel: string;
  minCardGb: number;
  recommendedCardGb: number;
  recommendedCardRange: string;
  recommendedFormat: 'FAT32' | 'exFAT' | 'NTFS';
  trimuiBrickSupport: TrimuiBrickSupport;
  supportedHardwareSummary: string;
  sha256: string;
  summary: string;
  flashingInstructions: string[];
  knownIssues: string[];
  bootInstructions: string[];
  partitions: PartitionSpec[];
  devices: HandheldTarget[];
}

export const HANDHELD_OS_CATALOG: HandheldOsEntry[] = [
  {
    id: 'knulli',
    name: 'Knulli',
    version: 'Firefly (2025.04)',
    releaseDate: '2025-04-10',
    baseSystem: 'Batocera Linux + EmulationStation',
    credits: {
      creators: 'KNULLI Team & Contributors',
      basedOn: 'Batocera.linux & EmulationStation',
      license: 'GPL-2.0 (mixed component licenses)',
      projectUrl: 'https://github.com/knulli-cfw/distribution',
      projectLabel: 'github.com/knulli-cfw/distribution',
    },
    method: 'raw-img',
    methodLabel: 'Raw Sector Image (.img.gz)',
    imageSizeBytes: 2_580_000_000,
    imageSizeLabel: '2.40 GB',
    minCardGb: 16,
    recommendedCardGb: 64,
    recommendedCardRange: '64 GB – 256 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Verified',
    supportedHardwareSummary:
      'TrimUI Brick, TrimUI Smart Pro, Anbernic RG35XX Plus/H/SP/2024, RG40XX H/V, RG CubeXX, RG34XX, RG28XX, Powkiddy RGB30/RGB20SX',
    sha256: '8f3e9b1d4c7a20e5f11b829d6044a77e12c8b093d451e9a87c65f3210b8e4a19',
    summary:
      'Batocera-powered custom firmware featuring hardware-accelerated EmulationStation, PortMaster support, Bluetooth audio, and automatic SHARE partition expansion on first boot.',
    flashingInstructions: [
      'Select the exact device build (e.g., trimui-brick, rg35xx-h, rg-cubexx, or rg34xx) and flash raw sectors via USB OTG without unpacking manually.',
      'Do not interrupt the 45–90 second first boot while Knulli resizes the SHARE partition to fill remaining microSD capacity.',
      'For dual-OS or Windows/Android ROM drag-and-drop, optionally format SHARE to exFAT inside System Settings > Developer.',
    ],
    knownIssues: [
      'Default SHARE partition uses ext4, which Android/Windows cannot browse natively over card readers without SFTP or USB MTP.',
      'TrimUI Brick rear/top RGB LED triggers require Firefly 2025.04 or newer for custom Fn switch profiles.',
      'Deep sleep battery drain is slightly higher (~1.5%/hr) compared to MinUI/NextUI; enable auto-shutdown after 10 min idle.',
    ],
    bootInstructions: [
      'Insert the flashed microSD card into TF1 (internal OS slot) while powered off.',
      'Hold Power for 3 seconds; Knulli automatically expands SHARE on first boot (45–90 seconds).',
      'Copy BIOS and ROM files to SHARE via Wi-Fi SFTP, USB MTP, or a TF2 exFAT ROM card.',
    ],
    partitions: [
      {
        label: 'BATOCERA',
        filesystem: 'FAT32',
        sizeDescription: '4.0 GB Boot',
        role: 'Linux kernel, device DTB, squashfs root',
        fractionPercent: 28,
      },
      {
        label: 'SHARE',
        filesystem: 'ext4',
        sizeDescription: 'Auto-expands to remaining space',
        role: 'ROMs, BIOS, saves, themes, PortMaster',
        fractionPercent: 72,
      },
    ],
    devices: [
      {
        id: 'trimui-brick',
        name: 'TrimUI Brick',
        chipset: 'Allwinner A133P',
        recommendedCardMinGb: 64,
        notes: 'Verified A133P support with 1024×768 scaling, Wi-Fi, and rear LED controls.',
      },
      {
        id: 'trimui-smart-pro',
        name: 'TrimUI Smart Pro',
        chipset: 'Allwinner A133P',
        recommendedCardMinGb: 32,
        notes: 'Uses single front microSD slot; LED ring configurable in system menu.',
      },
      {
        id: 'rg35xx-plus',
        name: 'Anbernic RG35XX Plus / H / SP',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 32,
        notes: 'Supports single or dual microSD card layout and HDMI output.',
      },
      {
        id: 'rg35xx-2024',
        name: 'Anbernic RG35XX (2024 H700)',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 32,
        notes: 'Shares H700 Firefly build with RG35XX Plus/H/SP (not 2022 ATM7039S).',
      },
      {
        id: 'rg40xx-h',
        name: 'Anbernic RG40XX H / V',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 32,
        notes: 'Includes analog stick calibration and RGB thumbstick LED driver.',
      },
      {
        id: 'rg-cubexx',
        name: 'Anbernic RG CubeXX',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 64,
        notes: 'Native 720×720 1:1 square integer shaders and RGB ring profiles.',
      },
      {
        id: 'rg34xx',
        name: 'Anbernic RG34XX',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 32,
        notes: 'Native 720×480 3:2 GBA aspect presets preconfigured.',
      },
      {
        id: 'rg28xx',
        name: 'Anbernic RG28XX',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 16,
        notes: 'Compact 4:3 theme scaling; requires USB-C dongle for Wi-Fi.',
      },
      {
        id: 'powkiddy-rgb30',
        name: 'Powkiddy RGB30',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 32,
        notes: 'Batocera 720×720 1:1 square aspect themes and Bluetooth audio.',
      },
      {
        id: 'powkiddy-rgb20sx',
        name: 'Powkiddy RGB20SX',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 32,
        notes: 'Vertical 1:1 screen profile with PortMaster & EmulationStation scraping.',
      },
    ],
  },
  {
    id: 'muos',
    name: 'muOS',
    version: 'Pixie (2502.0)',
    releaseDate: '2025-02-22',
    baseSystem: 'Minimal Buildroot Linux + RetroArch',
    credits: {
      creators: 'The MustardOS Crew',
      basedOn: 'Buildroot Linux & RetroArch',
      license: 'GPL-3.0',
      projectUrl: 'https://github.com/MustardOS/frontend',
      projectLabel: 'github.com/MustardOS/frontend',
    },
    method: 'raw-img',
    methodLabel: 'Raw Sector Image (.img.gz)',
    imageSizeBytes: 1_920_000_000,
    imageSizeLabel: '1.79 GB',
    minCardGb: 16,
    recommendedCardGb: 32,
    recommendedCardRange: '32 GB – 128 GB',
    recommendedFormat: 'exFAT',
    trimuiBrickSupport: 'Other Handhelds',
    supportedHardwareSummary:
      'Anbernic RG35XX Plus/H/SP/2024, RG40XX H/V, RG CubeXX, RG34XX, RG28XX (Allwinner H700)',
    sha256: '7b90e3c1a542f881d2069b4e13c7a22f60d814b9e32c5071a8f49d62e103b548',
    summary:
      'Ultra-fast 9-second cold boot firmware engineered for Anbernic H700 Linux handhelds with native clamshell sleep, exFAT ROM partition, PortMaster, and Syncthing.',
    flashingInstructions: [
      'Flash the exact H700 Anbernic device build (.img.gz) to TF1 using raw sector mode.',
      'Boot once so muOS expands its exFAT ROMS partition; TF2 can also be formatted as exFAT for ROMs.',
    ],
    knownIssues: [
      'Targets Allwinner H700 Anbernic boards only; not bootable on TrimUI Brick (Allwinner A133P) or Rockchip devices.',
      'Minimalist grid/list frontend relies on community themes for box-art scraping.',
    ],
    bootInstructions: [
      'Flash to TF1 microSD card and boot the handheld once to initialize MUOS partitions.',
      'Optionally format a second TF2 card as exFAT for ROMs, saves, and themes.',
    ],
    partitions: [
      {
        label: 'BOOT',
        filesystem: 'FAT32',
        sizeDescription: '128 MB Boot',
        role: 'U-Boot, kernel, H700 device tree',
        fractionPercent: 12,
      },
      {
        label: 'ROMS',
        filesystem: 'exFAT',
        sizeDescription: 'Auto-expands to remaining space',
        role: 'MUOS system, ROMs, saves, themes (Android/PC readable)',
        fractionPercent: 88,
      },
    ],
    devices: [
      {
        id: 'rg35xx-plus',
        name: 'Anbernic RG35XX Plus / H / SP',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 32,
        notes: 'Best-in-class 9s boot & clamshell hinge sleep/wake on RG35XX SP.',
      },
      {
        id: 'rg40xx-h',
        name: 'Anbernic RG40XX H / V',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 32,
        notes: 'Includes 4.0" 640×480 scaling & RGB stick control.',
      },
      {
        id: 'rg-cubexx',
        name: 'Anbernic RG CubeXX',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 32,
        notes: 'Dedicated 720×720 square aspect overlays for GB/GBC/NGPC/Arcade.',
      },
      {
        id: 'rg34xx',
        name: 'Anbernic RG34XX',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 32,
        notes: '3:2 720×480 integer GBA scaling out of the box.',
      },
      {
        id: 'rg28xx',
        name: 'Anbernic RG28XX',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 16,
        notes: 'Compact screen theme preloaded; lightweight footprint.',
      },
      {
        id: 'rg35xx-2024',
        name: 'Anbernic RG35XX (2024 H700)',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 32,
        notes: 'Use the 2024 H700 build (distinct from the 2022 ATM7039S model).',
      },
    ],
  },
  {
    id: 'arkos',
    name: 'ArkOS',
    version: 'v2.0 (02/2025)',
    releaseDate: '2025-02-09',
    baseSystem: 'Ubuntu 22.04 LTS ARM64 + EmulationStation',
    credits: {
      creators: 'Christian Haitian (@christianhaitian) & Contributors',
      basedOn: 'Ubuntu ARM64 & EmulationStation',
      license: 'MIT',
      projectUrl: 'https://github.com/christianhaitian/arkos',
      projectLabel: 'github.com/christianhaitian/arkos',
    },
    method: 'raw-img',
    methodLabel: 'Raw Sector Image (.img.gz)',
    imageSizeBytes: 3_120_000_000,
    imageSizeLabel: '2.91 GB',
    minCardGb: 16,
    recommendedCardGb: 64,
    recommendedCardRange: '32 GB – 256 GB',
    recommendedFormat: 'exFAT',
    trimuiBrickSupport: 'Other Handhelds',
    supportedHardwareSummary:
      'Anbernic RG353V/VS/M/P, RG503, RG351P/M, RG351V/MP, Powkiddy RGB30, RGB20SX, RK2023, V10, RGB20S / RGB10 Max 2',
    sha256: '5e81d4c3b907f2a184e60d29c7b148f0a3e291d6c4508b72a91f30e6c8241d93',
    summary:
      'Performance-tuned Ubuntu-based Linux OS for Rockchip RK3566 and RK3326 Anbernic and Powkiddy handhelds featuring standalone Dreamcast/N64/Saturn/PSP cores and easy exFAT EASYROMS access.',
    flashingInstructions: [
      'Flash the exact Anbernic or Powkiddy model image (e.g., RG353M, RG353V/VS/P, RG351MP/V, RGB30, RGB20SX, RK2023, V10) to TF1.',
      'Wait 2–3 minutes on first boot while ArkOS expands the exFAT EASYROMS partition.',
      'For dual-card Anbernic or Powkiddy devices (RG353 series, RG351V/MP, RK2023), switch to TF2 ROMs in Options > Advanced.',
    ],
    knownIssues: [
      'Does not support Allwinner H700 (RG35XX Plus/H/SP) or Allwinner A133P (TrimUI Brick) devices.',
      'Dual-boot RG353V/M/P models require removing TF1 to boot into internal Android eMMC.',
      'Always use Options > Quit > Shutdown System to avoid corrupting the Ubuntu rootfs.',
    ],
    bootInstructions: [
      'Insert flashed card into TF1 (INT slot) and allow 2–3 minutes for initial EASYROMS expansion.',
      'Connect via Wi-Fi for PortMaster, RetroAchievements, and OTA OS updates.',
    ],
    partitions: [
      {
        label: 'BOOT',
        filesystem: 'FAT32',
        sizeDescription: '128 MB Kernel & DTB',
        role: 'U-Boot, RK3566/RK3326 Linux kernel & panel DTB',
        fractionPercent: 10,
      },
      {
        label: 'ROOTFS',
        filesystem: 'ext4',
        sizeDescription: '8.0 GB Ubuntu Base',
        role: 'Ubuntu ARM64 system, RetroArch, standalone cores',
        fractionPercent: 25,
      },
      {
        label: 'EASYROMS',
        filesystem: 'exFAT',
        sizeDescription: 'Auto-expands to remaining space',
        role: 'ROMs, BIOS, saves (Android/Windows readable)',
        fractionPercent: 65,
      },
    ],
    devices: [
      {
        id: 'rg353-series',
        name: 'Anbernic RG353V / VS / M / P',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 64,
        notes: 'Top performance for N64, Dreamcast, PSP, and Sega Saturn on RK3566.',
      },
      {
        id: 'rg503',
        name: 'Anbernic RG503',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 64,
        notes: 'Tuned for 960×544 4.95" OLED widescreen PSP & PortMaster.',
      },
      {
        id: 'rg351mp-v',
        name: 'Anbernic RG351V / MP',
        chipset: 'Rockchip RK3326',
        recommendedCardMinGb: 32,
        notes: '640×480 4:3 dual-SD slot RK3326 configuration.',
      },
      {
        id: 'rg351p-m',
        name: 'Anbernic RG351P / M',
        chipset: 'Rockchip RK3326',
        recommendedCardMinGb: 32,
        notes: '3:2 480×320 screen ideal for GBA; single microSD slot.',
      },
      {
        id: 'powkiddy-rgb30',
        name: 'Powkiddy RGB30',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 32,
        notes: '720×720 1:1 integer scaling; excellent Dreamcast, N64, and PICO-8 performance.',
      },
      {
        id: 'powkiddy-rgb20sx',
        name: 'Powkiddy RGB20SX',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 32,
        notes: 'Vertical 720×720 1:1 RGB30 sibling using the dedicated RK3566 ArkOS build.',
      },
      {
        id: 'powkiddy-rk2023',
        name: 'Powkiddy RK2023',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 32,
        notes: 'Compact 4:3 640×480 pocket handheld with dual-microSD support.',
      },
      {
        id: 'powkiddy-v10',
        name: 'Powkiddy V10',
        chipset: 'Rockchip RK3326',
        recommendedCardMinGb: 32,
        notes: '3:2 480×320 GBA-focused handheld with dedicated ArkOS V10 build.',
      },
      {
        id: 'powkiddy-rgb20s',
        name: 'Powkiddy RGB20S / RGB10 Max 2',
        chipset: 'Rockchip RK3326',
        recommendedCardMinGb: 32,
        notes: 'Classic RK3326 hardware with pre-mapped RetroArch hotkeys.',
      },
    ],
  },
  {
    id: 'amberelec',
    name: 'AmberELEC',
    version: '20241222',
    releaseDate: '2024-12-22',
    baseSystem: 'LibreELEC / JELOS Fork + EmulationStation',
    credits: {
      creators: 'AmberELEC Team & Contributors',
      basedOn: '351ELEC / LibreELEC & EmulationStation',
      license: 'GPL-2.0-or-later',
      projectUrl: 'https://github.com/AmberELEC/AmberELEC',
      projectLabel: 'github.com/AmberELEC/AmberELEC',
    },
    method: 'raw-img',
    methodLabel: 'Raw Sector Image (.img.gz)',
    imageSizeBytes: 1_640_000_000,
    imageSizeLabel: '1.53 GB',
    minCardGb: 16,
    recommendedCardGb: 64,
    recommendedCardRange: '32 GB – 128 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Other Handhelds',
    supportedHardwareSummary:
      'Anbernic RG351P/M, RG351V/MP (RK3326), RG552 (RK3399), Powkiddy RGB20S / RGB10 Max 2, V10',
    sha256: '2b74c9a10e83d5f461c09b3a7e82d415f6c90a37e418b52c9f07a63d8e14c205',
    summary:
      'Beginner-friendly, curated Linux custom firmware for classic RK3326 & RK3399 Anbernic and Powkiddy handhelds with pre-configured per-system shaders, bezels, and automatic controller mapping.',
    flashingInstructions: [
      'Choose the exact Anbernic or Powkiddy RK3326/RK3399 image and flash raw sectors to TF1.',
      'Allow 60 seconds on first boot to expand the GAMES partition.',
    ],
    knownIssues: [
      'Development targets RK3326/RK3399 boards; RK3566 (RG353, RGB30, X55) and H700 devices should use ArkOS, ROCKNIX, or muOS.',
      'Default GAMES partition is ext4 unless re-initialized via settings; use Wi-Fi SFTP/SMB for transfers.',
    ],
    bootInstructions: [
      'Insert flashed microSD into TF1 and wait for automatic GAMES partition expansion.',
      'Use EmulationStation Network menu to enable Wi-Fi and copy ROMs via SMB/SFTP.',
    ],
    partitions: [
      {
        label: 'AMBERELEC',
        filesystem: 'FAT32',
        sizeDescription: '2.0 GB System',
        role: 'Kernel, SYSTEM squashfs image, device trees',
        fractionPercent: 25,
      },
      {
        label: 'GAMES',
        filesystem: 'ext4',
        sizeDescription: 'Auto-expands to remaining space',
        role: 'ROMs, BIOS, bezels, saves',
        fractionPercent: 75,
      },
    ],
    devices: [
      {
        id: 'rg351p-m',
        name: 'Anbernic RG351P / M',
        chipset: 'Rockchip RK3326',
        recommendedCardMinGb: 32,
        notes: 'Curated 3:2 GBA shaders and zero-config RetroArch presets.',
      },
      {
        id: 'rg351mp-v',
        name: 'Anbernic RG351V / MP',
        chipset: 'Rockchip RK3326',
        recommendedCardMinGb: 32,
        notes: 'Supports dual-SD card ROM storage on TF2.',
      },
      {
        id: 'rg552',
        name: 'Anbernic RG552',
        chipset: 'Rockchip RK3399',
        recommendedCardMinGb: 64,
        notes: 'High-DPI 1920×1152 integer scaling & active fan profile.',
      },
      {
        id: 'powkiddy-rgb20s',
        name: 'Powkiddy RGB20S / RGB10 Max 2',
        chipset: 'Rockchip RK3326',
        recommendedCardMinGb: 32,
        notes: 'Turnkey EmulationStation with pre-configured Powkiddy RK3326 button mappings.',
      },
      {
        id: 'powkiddy-v10',
        name: 'Powkiddy V10',
        chipset: 'Rockchip RK3326',
        recommendedCardMinGb: 32,
        notes: 'Pre-tuned 3:2 GBA integer shaders and clean single-card setup.',
      },
    ],
  },
  {
    id: 'rocknix',
    name: 'ROCKNIX',
    version: '20250217',
    releaseDate: '2025-02-17',
    baseSystem: 'Mainline Linux + Panfrost / Mesa',
    credits: {
      creators: 'ROCKNIX Community & Maintainers',
      basedOn: 'Mainline Linux, Mesa & JELOS legacy',
      license: 'Apache-2.0 / GPL-2.0 (CC BY-NC-SA 4.0 branding)',
      projectUrl: 'https://github.com/ROCKNIX/distribution',
      projectLabel: 'github.com/ROCKNIX/distribution',
    },
    method: 'raw-img',
    methodLabel: 'Raw Sector Image (.img.gz)',
    imageSizeBytes: 2_310_000_000,
    imageSizeLabel: '2.15 GB',
    minCardGb: 16,
    recommendedCardGb: 64,
    recommendedCardRange: '32 GB – 256 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Experimental',
    supportedHardwareSummary:
      'Powkiddy RGB30/RGB20SX/X55/RK2023/V10, Anbernic RG353/RG503/RG ARC/RG35XX Plus/H/SP/CubeXX, Retroid Pocket 6/5/Mini/Flip 2, AYN Odin 2 Series, TrimUI Brick (WIP)',
    sha256: '4d82c6f0e19a73b5c4081d29e6f3a11c78b504d2f91e63a08c75b214d90e3f81',
    summary:
      'Community-maintained mainline Linux distribution with Panfrost/Turnip/Mesa Vulkan drivers, EmulationStation, and microSD dual-boot support across Powkiddy, Anbernic, Retroid, and AYN handhelds.',
    flashingInstructions: [
      'Flash the device-specific .img.gz image (RK3566, H700, SM8250 for Retroid Pocket 5/Mini, or SM8550 for Retroid Pocket 6 / AYN Odin 2) as raw sectors onto your microSD card.',
      'Do not unplug during the initial boot expansion of the STORAGE partition.',
      'On AYN and Retroid Qualcomm handhelds, hold Volume Up + Power (or trigger ABL SD-boot) to boot ROCKNIX from microSD without altering internal Android.',
    ],
    knownIssues: [
      'Retroid Pocket 5/Mini and AYN Odin 2 require an A2/U3 microSD card and holding Volume Up + Power on cold boot to select the SD Linux target.',
      'Mainline A133P support for TrimUI Brick lacks hardware video decode and full deep-sleep power gating in current builds.',
      'Default STORAGE partition uses ext4; use SFTP/SMB over Wi-Fi for ROM transfers.',
    ],
    bootInstructions: [
      'Flash the device-specific ROCKNIX image onto TF1 / microSD.',
      'On AYN & Retroid devices, hold Volume Up while powering on to launch the Linux bootloader from microSD; STORAGE expands automatically.',
    ],
    partitions: [
      {
        label: 'ROCKNIX',
        filesystem: 'FAT32',
        sizeDescription: '2.5 GB System',
        role: 'Mainline Linux kernel & squashfs SYSTEM image',
        fractionPercent: 25,
      },
      {
        label: 'STORAGE',
        filesystem: 'ext4',
        sizeDescription: 'Auto-expands to remaining space',
        role: 'Games, saves, overlays, RetroArch configs',
        fractionPercent: 75,
      },
    ],
    devices: [
      {
        id: 'rg-arc',
        name: 'Anbernic RG ARC-D / ARC-S',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 64,
        notes: 'Pre-mapped 6-button Sega Saturn / Genesis layout & Panfrost GPU.',
      },
      {
        id: 'rg353-series',
        name: 'Anbernic RG353V / VS / M / P',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 64,
        notes: 'Mainline Linux kernel with Vulkan/Panfrost & dual-card support.',
      },
      {
        id: 'rg503',
        name: 'Anbernic RG503',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 64,
        notes: 'OLED color calibration & 5 GHz Wi-Fi support.',
      },
      {
        id: 'rg35xx-plus',
        name: 'Anbernic RG35XX Plus / H / SP',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 32,
        notes: 'Mainline H700 image; great for unified ROCKNIX library syncing.',
      },
      {
        id: 'rg-cubexx',
        name: 'Anbernic RG CubeXX',
        chipset: 'Allwinner H700',
        recommendedCardMinGb: 32,
        notes: '720×720 square aspect profile.',
      },
      {
        id: 'powkiddy-rgb30',
        name: 'Powkiddy RGB30',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 32,
        notes: 'Mainline kernel fixes RGB30 battery drain & sleep issues; 720×720 1:1 scaling.',
      },
      {
        id: 'powkiddy-rgb20sx',
        name: 'Powkiddy RGB20SX',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 32,
        notes: 'Vertical 720×720 1:1 screen with Panfrost GPU & improved sleep.',
      },
      {
        id: 'powkiddy-x55',
        name: 'Powkiddy X55',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 64,
        notes: '5.5" 1280×720 IPS widescreen ideal for PSP, PortMaster, and Moonlight.',
      },
      {
        id: 'powkiddy-rgb10-max3',
        name: 'Powkiddy RGB10 Max 3',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 64,
        notes: '5.0" 1280×720 Linux build with mainline GPU drivers and HDMI audio.',
      },
      {
        id: 'powkiddy-rk2023',
        name: 'Powkiddy RK2023',
        chipset: 'Rockchip RK3566',
        recommendedCardMinGb: 32,
        notes: '640×480 4:3 mainline build with improved thermal & battery reporting.',
      },
      {
        id: 'powkiddy-v10',
        name: 'Powkiddy V10',
        chipset: 'Rockchip RK3326',
        recommendedCardMinGb: 32,
        notes: 'Compact 3:2 480×320 RK3326 build with mainline RetroArch.',
      },
      {
        id: 'retroid-pocket-6',
        name: 'Retroid Pocket 6',
        chipset: 'Snapdragon 8 Gen 2',
        recommendedCardMinGb: 64,
        notes: 'SM8550 120Hz AMOLED mainline Linux SD boot with Turnip Vulkan drivers.',
      },
      {
        id: 'retroid-pocket-5',
        name: 'Retroid Pocket 5',
        chipset: 'Snapdragon 865',
        recommendedCardMinGb: 64,
        notes: 'Dual-boot Linux from microSD via Volume Up + Power with Turnip Vulkan.',
      },
      {
        id: 'retroid-pocket-mini',
        name: 'Retroid Pocket Mini',
        chipset: 'Snapdragon 865',
        recommendedCardMinGb: 64,
        notes: 'OLED 1280×960 4:3 mainline Linux SD boot without touching internal Android.',
      },
      {
        id: 'retroid-pocket-flip2',
        name: 'Retroid Pocket Flip 2',
        chipset: 'Snapdragon 865',
        recommendedCardMinGb: 64,
        notes: 'Shares SM8250 Turnip/Mesa Linux kernel with clamshell sleep support.',
      },
      {
        id: 'ayn-odin2',
        name: 'AYN Odin 2 / Odin 2 Mini / Portal',
        chipset: 'Snapdragon 8 Gen 2',
        recommendedCardMinGb: 128,
        notes: 'Mainline SM8550 Linux SD boot with hardware Vulkan for PS2, GC, and Switch.',
      },
      {
        id: 'trimui-brick',
        name: 'TrimUI Brick',
        chipset: 'Allwinner A133P',
        recommendedCardMinGb: 32,
        notes: 'Experimental mainline Linux A133P image; GPU/sleep drivers in development.',
      },
    ],
  },
  {
    id: 'garlicos',
    name: 'GarlicOS',
    version: 'v1.4.9',
    releaseDate: '2024-05-18',
    baseSystem: 'Lightweight Linux + RetroArch',
    credits: {
      creators: 'Black Seraph',
      basedOn: 'Custom Linux & RetroArch',
      license: 'Freeware / Mixed OSS Components',
      projectUrl: 'https://www.patreon.com/blackseraph',
      projectLabel: 'patreon.com/blackseraph',
    },
    method: 'raw-img',
    methodLabel: 'Raw Sector Image (.img)',
    imageSizeBytes: 890_000_000,
    imageSizeLabel: '849 MB',
    minCardGb: 16,
    recommendedCardGb: 32,
    recommendedCardRange: '16 GB – 64 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Other Handhelds',
    supportedHardwareSummary:
      'Anbernic RG35XX (2022 Original, Actions ATM7039S)',
    sha256: '0d94e1f7b3a26c8591e47b2a08c6f3d1e5b29a47c803f1d62e9a4b7c10d3e8f2',
    summary:
      'Signature instant-boot, quick-resume RetroArch firmware created specifically for the original 2022 Anbernic RG35XX.',
    flashingInstructions: [
      'Flash the GarlicOS .img onto TF1 (only for the original 2022 RG35XX with Actions ATM7039S, not the 2024 H700 revision).',
      'Expand the FAT32 ROMS partition or use a FAT32-formatted TF2 card for games.',
    ],
    knownIssues: [
      'Only boots on the original 2022 RG35XX (ATM7039S); 2024 RG35XX and RG35XX Plus/H/SP use H700 builds (muOS/Knulli).',
      'No Wi-Fi hardware on the original RG35XX; updates require flashing or copying files via microSD reader.',
    ],
    bootInstructions: [
      'Insert flashed card into TF1 on the 2022 Anbernic RG35XX and press Power.',
      'Press Menu to toggle instant Quick Switcher between recent games.',
    ],
    partitions: [
      {
        label: 'MISC',
        filesystem: 'FAT32',
        sizeDescription: '512 MB Boot & Kernel',
        role: 'uImage, dtb, CFW RetroArch binaries',
        fractionPercent: 20,
      },
      {
        label: 'ROMS',
        filesystem: 'FAT32',
        sizeDescription: 'Expandable ROM Partition',
        role: 'Roms, BIOS, CFW/saves',
        fractionPercent: 80,
      },
    ],
    devices: [
      {
        id: 'rg35xx-2022',
        name: 'Anbernic RG35XX (2022 Original)',
        chipset: 'Actions ATM7039S',
        recommendedCardMinGb: 32,
        notes: 'Definitive OS for the original 2022 RG35XX with instant save-state boot.',
      },
    ],
  },
  {
    id: 'nextui',
    name: 'NextUI',
    version: 'v3.2.0-Brick',
    releaseDate: '2025-05-02',
    baseSystem: 'TrimUI Stock Kernel + MinUI Shell',
    credits: {
      creators: 'LoveRetro & NextUI Contributors',
      basedOn: 'MinUI by Shaun Inman',
      license: 'PolyForm Noncommercial 1.0.0',
      projectUrl: 'https://github.com/LoveRetro/NextUI',
      projectLabel: 'github.com/LoveRetro/NextUI',
    },
    method: 'fat32-package',
    methodLabel: 'FAT32 32KB Package',
    imageSizeBytes: 420_000_000,
    imageSizeLabel: '401 MB',
    minCardGb: 16,
    recommendedCardGb: 64,
    recommendedCardRange: '32 GB – 128 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Verified',
    supportedHardwareSummary:
      'TrimUI Brick (Allwinner A133P), TrimUI Smart Pro (Allwinner A133P)',
    sha256: '6a41b8e2f7c093d1a5e88b04c27f91e305d2a74c89b16e3f02a49c7b1e5d8304',
    summary:
      'Purpose-built minimalist TrimUI Brick firmware extending MinUI with native 1024×768 shaders, ultra-low-power deep sleep, LED Pak support, and instant resume.',
    flashingInstructions: [
      'Format the microSD card to MBR FAT32 with 32 KB clusters in SD Formatter (required for 64 GB–512 GB cards).',
      'Extract the NextUI release archive (including the trimui/ folder) directly to the card root.',
      'Insert card and power on normally; no raw sector flashing or partition resizing needed.',
    ],
    knownIssues: [
      'Does not boot if the card is formatted as exFAT or GPT on TrimUI Brick stock bootloader.',
      'N64, Dreamcast, and PSP require optional community Paks and lack hardware Vulkan acceleration.',
      'Requires TrimUI Brick stock firmware v1.0.6+ installed on internal eMMC for proper deep-sleep wakeup.',
    ],
    bootInstructions: [
      'Format card as MBR FAT32 (32 KB cluster) and verify the trimui/ folder sits at root.',
      'Power on TrimUI Brick; NextUI completes setup in under 10 seconds.',
      'Add ROMs under /Roms/[CONSOLE] and optional LED/shader Paks under /Tools.',
    ],
    partitions: [
      {
        label: 'NEXTUI',
        filesystem: 'FAT32',
        sizeDescription: '100% Single MBR Volume (32 KB cluster)',
        role: 'trimui/ boot hook, MinUI.pak, Roms, Saves',
        fractionPercent: 100,
      },
    ],
    devices: [
      {
        id: 'trimui-brick',
        name: 'TrimUI Brick',
        chipset: 'Allwinner A133P',
        recommendedCardMinGb: 32,
        notes: 'Primary target; supports hardware Fn mute/LED switch and <0.3%/hr deep sleep.',
      },
      {
        id: 'trimui-smart-pro',
        name: 'TrimUI Smart Pro',
        chipset: 'Allwinner A133P',
        recommendedCardMinGb: 32,
        notes: 'Shares A133P MinUI/NextUI base pak.',
      },
    ],
  },
  {
    id: 'crossmix',
    name: 'CrossMix OS',
    version: 'v1.3.0',
    releaseDate: '2025-03-18',
    baseSystem: 'TrimUI Stock OS Enhanced + RetroArch',
    credits: {
      creators: 'cizia64 & CrossMix OS Contributors',
      basedOn: 'TrimUI Stock OS & RetroArch',
      license: 'GPL-3.0',
      projectUrl: 'https://github.com/cizia64/CrossMix-OS',
      projectLabel: 'github.com/cizia64/CrossMix-OS',
    },
    method: 'fat32-package',
    methodLabel: 'FAT32 32KB Package',
    imageSizeBytes: 2_180_000_000,
    imageSizeLabel: '2.03 GB',
    minCardGb: 32,
    recommendedCardGb: 128,
    recommendedCardRange: '64 GB – 256 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Verified',
    supportedHardwareSummary:
      'TrimUI Smart Pro (A133P), TrimUI Brick (A133P)',
    sha256: '1f9c4e72a830d5b49e27c61a04f8d3b27e91c50a38d64b7e2f190a4c8d3e6521',
    summary:
      'Feature-complete enhancement over TrimUI Stock OS adding PortMaster, pre-configured bezels for 1024×768 screens, OTA updater, and native RetroArch.',
    flashingInstructions: [
      'Format microSD card as MBR FAT32 (32 KB clusters) — do not use exFAT even on 128 GB+ cards.',
      'Extract CrossMix release archive directly onto the root of the FAT32 volume.',
      'On TrimUI Brick, ensure the Brick 4:3 theme & resolution pack is enabled on first launch.',
    ],
    knownIssues: [
      'Some TrimUI Smart Pro 16:9 widescreen bezels appear cropped on the Brick’s 4:3 1024×768 display until switched in Apps > System Tools.',
      'Large extraction (~14,000 small files) can take several minutes over slow USB 2.0 OTG readers.',
      'FAT32 4 GB single-file limit prevents storing uncompressed PS2/DVD images larger than 4 GB.',
    ],
    bootInstructions: [
      'Ensure microSD is MBR FAT32 (32 KB clusters) with CrossMix folders at root.',
      'Boot TrimUI Brick; initial System Tools script configures RetroArch and PortMaster.',
      'Select 4:3 Brick Display Profile in Apps > Display Settings if migrating from Smart Pro.',
    ],
    partitions: [
      {
        label: 'CROSSMIX',
        filesystem: 'FAT32',
        sizeDescription: '100% Single MBR Volume (32 KB cluster)',
        role: 'TrimUI Stock OS overlay, RetroArch, Apps, Roms',
        fractionPercent: 100,
      },
    ],
    devices: [
      {
        id: 'trimui-brick',
        name: 'TrimUI Brick',
        chipset: 'Allwinner A133P',
        recommendedCardMinGb: 64,
        notes: 'Full stock hardware support including Wi-Fi, Bluetooth audio, and Fn switch.',
      },
      {
        id: 'trimui-smart-pro',
        name: 'TrimUI Smart Pro',
        chipset: 'Allwinner A133P',
        recommendedCardMinGb: 64,
        notes: 'Flagship target with 16:9 PSP/PortMaster profiles.',
      },
    ],
  },
  {
    id: 'pakui',
    name: 'PakUI',
    version: 'v1.4.2',
    releaseDate: '2025-04-28',
    baseSystem: 'Modular MinUI + BitPal / RetroAchievements',
    credits: {
      creators: 'tenlevels & PakUI Contributors',
      basedOn: 'MinUI by Shaun Inman',
      license: 'MIT',
      projectUrl: 'https://github.com/tenlevels/PakUI',
      projectLabel: 'github.com/tenlevels/PakUI',
    },
    method: 'fat32-package',
    methodLabel: 'FAT32 32KB Package',
    imageSizeBytes: 540_000_000,
    imageSizeLabel: '515 MB',
    minCardGb: 16,
    recommendedCardGb: 64,
    recommendedCardRange: '32 GB – 128 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Verified',
    supportedHardwareSummary:
      'TrimUI Brick (A133P)',
    sha256: 'c42d81f90e7a35b612d9c8e401a7f53b98e2d04c61a93b7e5f0284c1d6a9b307',
    summary:
      'TrimUI Brick-exclusive modular firmware combining MinUI speed with Wi-Fi RetroAchievements, BitPal companion app, and custom Brick LED & Fn switch toggles.',
    flashingInstructions: [
      'Format any 16 GB–256 GB microSD card to MBR FAT32 (32 KB clusters) using SD Formatter.',
      'Extract PakUI release zip directly onto the card root without renaming the trimui/ directory.',
      'Connect to Wi-Fi once in Tools > Network to sync RetroAchievements and scraper cache.',
    ],
    knownIssues: [
      'Designed specifically for TrimUI Brick 1024×768 geometry; UI elements clip on 16:9 Smart Pro screens.',
      'Enabling continuous Wi-Fi polling reduces battery life by ~15% during sleep unless Toggle Wi-Fi on Sleep is enabled.',
    ],
    bootInstructions: [
      'Insert FAT32-formatted microSD card into TrimUI Brick and power on.',
      'Use the side Fn switch to toggle LED mode or mute depending on PakUI settings.',
    ],
    partitions: [
      {
        label: 'PAKUI',
        filesystem: 'FAT32',
        sizeDescription: '100% Single MBR Volume (32 KB cluster)',
        role: 'TrimUI Brick MinUI base, BitPal, RetroAchievements Paks',
        fractionPercent: 100,
      },
    ],
    devices: [
      {
        id: 'trimui-brick',
        name: 'TrimUI Brick',
        chipset: 'Allwinner A133P',
        recommendedCardMinGb: 32,
        notes: 'Built exclusively around TrimUI Brick 3.2" 1024×768 screen and Fn toggle.',
      },
    ],
  },
  {
    id: 'spruce',
    name: 'Spruce',
    version: 'v3.3.2',
    releaseDate: '2025-03-04',
    baseSystem: 'Stock Kernel + RetroArch + GameSwitcher',
    credits: {
      creators: 'spruceUI Team & Contributors',
      basedOn: 'Stock Linux Kernel & RetroArch',
      license: 'MIT',
      projectUrl: 'https://github.com/spruceUI/spruceOS',
      projectLabel: 'github.com/spruceUI/spruceOS',
    },
    method: 'fat32-package',
    methodLabel: 'FAT32 32KB Package',
    imageSizeBytes: 1_450_000_000,
    imageSizeLabel: '1.35 GB',
    minCardGb: 16,
    recommendedCardGb: 64,
    recommendedCardRange: '32 GB – 128 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Experimental',
    supportedHardwareSummary:
      'Miyoo A30 (Primary), TrimUI Brick (A133P Nightly Alpha)',
    sha256: '3c7a19e4b28d0091e4f62c77b8a105d3e98f22a4c7160d95a3b821e4f906c217',
    summary:
      'Fast-booting custom OS package featuring instant GameSwitcher, auto-save/resume, Syncthing, and pre-tuned RetroArch cores; Miyoo A30 stable with early TrimUI Brick alpha.',
    flashingInstructions: [
      'Format the microSD card as MBR FAT32 with 32 KB clusters (required even on 64 GB–512 GB cards).',
      'Copy the Spruce archive root directories directly to the FAT32 partition.',
      'For TrimUI Brick testing, use the A133P nightly build and update eMMC stock firmware to v1.0.6+ first.',
    ],
    knownIssues: [
      'TrimUI Brick build is experimental: rear LED zone triggers and Bluetooth audio reconnection remain incomplete.',
      'exFAT or GPT-formatted cards fail to trigger the stock bootloader hook on both Miyoo A30 and TrimUI Brick.',
    ],
    bootInstructions: [
      'Ensure the microSD card is MBR-formatted to FAT32 with 32 KB clusters.',
      'Insert card and power on; Spruce runs its first-time app indexing script.',
      'Place ROMs inside /Roms/[SYSTEM] and BIOS inside /RetroArch/.retroarch/system.',
    ],
    partitions: [
      {
        label: 'SPRUCE',
        filesystem: 'FAT32',
        sizeDescription: '100% Single MBR Volume (32 KB cluster)',
        role: 'Boot hooks, RetroArch, GameSwitcher, ROMs, saves',
        fractionPercent: 100,
      },
    ],
    devices: [
      {
        id: 'miyoo-a30',
        name: 'Miyoo A30',
        chipset: 'Allwinner A33',
        recommendedCardMinGb: 64,
        notes: 'Primary stable release target; 32 KB FAT32 clusters required.',
      },
      {
        id: 'trimui-brick',
        name: 'TrimUI Brick',
        chipset: 'Allwinner A133P',
        recommendedCardMinGb: 64,
        notes: 'Experimental A133P nightly branch; test on a secondary card.',
      },
    ],
  },
  {
    id: 'nxredux',
    name: 'nxRedux',
    version: 'v2.1.0-Brick',
    releaseDate: '2025-04-16',
    baseSystem: 'TrimUI Stock Linux + Redux RetroArch Shell',
    credits: {
      creators: 'Mohammad Syuhada (@mohammadsyuhada)',
      basedOn: 'NextUI (LoveRetro) & MinUI (Shaun Inman)',
      license: 'PolyForm Noncommercial 1.0.0 / Upstream Terms',
      projectUrl: 'https://github.com/mohammadsyuhada/nx-redux',
      projectLabel: 'github.com/mohammadsyuhada/nx-redux',
    },
    method: 'fat32-package',
    methodLabel: 'FAT32 32KB Package',
    imageSizeBytes: 1_240_000_000,
    imageSizeLabel: '1.15 GB',
    minCardGb: 16,
    recommendedCardGb: 64,
    recommendedCardRange: '32 GB – 128 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Verified',
    supportedHardwareSummary: 'TrimUI Brick (Allwinner A133P)',
    sha256: 'e12d44a9c8f730b2d19584a709f3c65e88b21a09d34f71c26b0e589a3c417d60',
    summary:
      'Streamlined TrimUI Brick custom firmware rebuilding the stock A133P Linux shell with curated RetroArch cores, 1024×768 integer scaling, fast resume, and clean FAT32 deployment.',
    flashingInstructions: [
      'Format any 16 GB–256 GB microSD card as MBR FAT32 with 32 KB clusters before copying files.',
      'Extract the nxRedux TrimUI Brick release archive directly onto the root of the FAT32 volume.',
      'Insert the card into your TrimUI Brick and power on; initial boot finishes core indexing in under 20 seconds.',
    ],
    knownIssues: [
      'Requires an MBR FAT32 volume; exFAT or GPT-partitioned cards will not trigger the TrimUI Brick bootloader hook.',
      'Built specifically for TrimUI Brick 1024×768 4:3 display scaling and Fn switch controls.',
      'Update TrimUI Brick internal eMMC stock firmware to v1.0.6+ for reliable deep-sleep power gating.',
    ],
    bootInstructions: [
      'Format card as MBR FAT32 (32 KB clusters) and verify nxRedux folders sit at the card root.',
      'Power on TrimUI Brick; nxRedux initializes shaders, RetroArch configs, and ROM directories automatically.',
      'Drop ROMs into /Roms/[SYSTEM] and BIOS files into /RetroArch/.retroarch/system.',
    ],
    partitions: [
      {
        label: 'NXREDUX',
        filesystem: 'FAT32',
        sizeDescription: '100% Single MBR Volume (32 KB cluster)',
        role: 'TrimUI Brick boot hook, RetroArch Redux, Roms, Saves',
        fractionPercent: 100,
      },
    ],
    devices: [
      {
        id: 'trimui-brick',
        name: 'TrimUI Brick',
        chipset: 'Allwinner A133P',
        recommendedCardMinGb: 32,
        notes: 'TrimUI Brick 1024×768 firmware with clean RetroArch presets and Fn switch support.',
      },
    ],
  },
  {
    id: 'onionos',
    name: 'OnionOS',
    version: 'v4.3.1',
    releaseDate: '2024-09-14',
    baseSystem: 'Miyoo Stock OS Layer + GameSwitcher',
    credits: {
      creators: 'OnionUI Development Team',
      basedOn: 'Miyoo Mini Stock OS & RetroArch',
      license: 'GPL-3.0',
      projectUrl: 'https://github.com/OnionUI/Onion',
      projectLabel: 'github.com/OnionUI/Onion',
    },
    method: 'fat32-package',
    methodLabel: 'FAT32 32KB Package',
    imageSizeBytes: 980_000_000,
    imageSizeLabel: '935 MB',
    minCardGb: 16,
    recommendedCardGb: 64,
    recommendedCardRange: '64 GB – 128 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Other Handhelds',
    supportedHardwareSummary:
      'Miyoo Mini / Miyoo Mini+ (SigmaStar SSD202D)',
    sha256: '9a14f7c2d80e5b31a6c94e02d7f8b13e50c4a928f16d703b8e25c491a0f6d372',
    summary:
      'Signature custom interface for Miyoo Mini and Mini+ featuring instant GameSwitcher, Cartridge Mode, OTA Wi-Fi updates, and curated emulators.',
    flashingInstructions: [
      'Format microSD card as MBR FAT32 (32 KB cluster size) regardless of card capacity.',
      'Copy the hidden .tmp_update folder and Onion root folders onto the FAT32 root.',
    ],
    knownIssues: [
      'Exclusive to SigmaStar SSD202D Miyoo Mini devices; incompatible with TrimUI Brick (A133P) and Anbernic models.',
      'Fails to trigger installer if hidden dot-folders (.tmp_update) are skipped during copy.',
    ],
    bootInstructions: [
      'Format microSD card as MBR FAT32 (32 KB cluster size) regardless of card capacity.',
      'Insert card into Miyoo Mini / Mini+ and select desired consoles in the Package Manager.',
    ],
    partitions: [
      {
        label: 'ONION',
        filesystem: 'FAT32',
        sizeDescription: '100% Single MBR Volume (32 KB cluster)',
        role: '.tmp_update installer, RetroArch, Roms, Saves',
        fractionPercent: 100,
      },
    ],
    devices: [
      {
        id: 'miyoo-mini-plus',
        name: 'Miyoo Mini / Miyoo Mini+',
        chipset: 'SigmaStar SSD202D',
        recommendedCardMinGb: 64,
        notes: 'Must be MBR FAT32 (exFAT is not recognized by bootloader).',
      },
    ],
  },
  {
    id: 'armadaos',
    name: 'Armada OS',
    version: 'v1.8.4-ARM64',
    releaseDate: '2025-04-24',
    baseSystem: 'ARM64 Linux + Turnip Vulkan + ES-DE',
    credits: {
      creators: 'virtudude & Armada OS Contributors',
      basedOn: 'Fedora bootc & ROCKNIX device support',
      license: 'Open Source (Upstream Repo Terms)',
      projectUrl: 'https://github.com/armada-os/armada',
      projectLabel: 'github.com/armada-os/armada',
    },
    method: 'raw-img',
    methodLabel: 'Raw Sector Image (.img.gz)',
    imageSizeBytes: 3_420_000_000,
    imageSizeLabel: '3.19 GB',
    minCardGb: 64,
    recommendedCardGb: 128,
    recommendedCardRange: '128 GB – 512 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Other Handhelds',
    supportedHardwareSummary:
      'AYN Odin 2 / Odin 2 Mini / Portal, AYN Odin (Base / Pro), Retroid Pocket 6, Retroid Pocket 5, Retroid Pocket Mini, Retroid Pocket Flip 2',
    sha256: '9f4c2e81b6a37d04e59c1a73b820d4f6e139a5c7b2048d1e6f3a9c5b0d247e18',
    summary:
      'Console-style Linux firmware built specifically for Snapdragon-powered AYN and Retroid handhelds, combining EmulationStation-DE, Mesa Turnip drivers, PortMaster, and standalone PS2/GameCube/Switch cores off a microSD card.',
    flashingInstructions: [
      'Use a U3 / A2 rated 64 GB–512 GB microSD card for fast ARM64 shader cache and PS2/GameCube ISO streaming.',
      'Select your exact AYN or Retroid device build (SM8550 for Odin 2 series / Retroid Pocket 6, SM8250 for Retroid Pocket 5/Mini/Flip 2, or SDM845 for Odin 1) and flash raw sectors.',
      'Boot from microSD by holding Volume Up + Power on cold start without modifying internal Android eMMC.',
    ],
    knownIssues: [
      'Requires an unlocked ABL or SD-boot trigger on first setup; check your handheld bootloader prompt if it boots directly into stock Android.',
      'Default ARMADA_DATA partition expands to ext4 on first boot; use Wi-Fi SFTP/MTP or a secondary exFAT card for large disc images.',
      'Designed strictly for Qualcomm Snapdragon AYN/Retroid handhelds — not compatible with Allwinner or Rockchip boards.',
    ],
    bootInstructions: [
      'Insert the flashed microSD card into your AYN or Retroid handheld while powered off.',
      'Hold Volume Up + Power for 3 seconds to chainload ARMADA_BOOT from microSD and allow 60 seconds for partition expansion.',
      'Configure Wi-Fi and copy BIOS/ROMs into /roms via SFTP or USB-C MTP.',
    ],
    partitions: [
      {
        label: 'ARMADA_BOOT',
        filesystem: 'FAT32',
        sizeDescription: '2.0 GB Boot & DTB',
        role: 'Qualcomm ABL chainloader, Linux kernel, Adreno Turnip blobs',
        fractionPercent: 22,
      },
      {
        label: 'ARMADA_DATA',
        filesystem: 'ext4',
        sizeDescription: 'Auto-expands to remaining space',
        role: 'ES-DE frontend, standalone emulators, ROMs, BIOS, saves',
        fractionPercent: 78,
      },
    ],
    devices: [
      {
        id: 'ayn-odin2',
        name: 'AYN Odin 2 / Odin 2 Mini / Portal',
        chipset: 'Snapdragon 8 Gen 2',
        recommendedCardMinGb: 128,
        notes: 'Full SM8550 Turnip Vulkan driver support with active fan curve profiles.',
      },
      {
        id: 'retroid-pocket-6',
        name: 'Retroid Pocket 6',
        chipset: 'Snapdragon 8 Gen 2',
        recommendedCardMinGb: 128,
        notes: 'High-frame-rate SM8550 Turnip Vulkan profile tuned for 120Hz AMOLED output.',
      },
      {
        id: 'retroid-pocket-5',
        name: 'Retroid Pocket 5',
        chipset: 'Snapdragon 865',
        recommendedCardMinGb: 64,
        notes: 'AMOLED 1080p scaling, Wi-Fi 6, and zero-touch internal Android dual-boot.',
      },
      {
        id: 'retroid-pocket-mini',
        name: 'Retroid Pocket Mini',
        chipset: 'Snapdragon 865',
        recommendedCardMinGb: 64,
        notes: '4:3 1280×960 integer overlays tuned for GameCube, PS2, and Dreamcast.',
      },
      {
        id: 'retroid-pocket-flip2',
        name: 'Retroid Pocket Flip 2',
        chipset: 'Snapdragon 865',
        recommendedCardMinGb: 64,
        notes: 'Clamshell Hall-sensor sleep and pre-mapped analog triggers.',
      },
      {
        id: 'ayn-odin1',
        name: 'AYN Odin (Base / Pro)',
        chipset: 'Snapdragon 845',
        recommendedCardMinGb: 64,
        notes: 'SDM845 Linux SD profile with custom fan control and HDMI-out.',
      },
    ],
  },
  {
    id: 'lineageos',
    name: 'LineageOS',
    version: '22.1 (Android 15)',
    releaseDate: '2025-05-05',
    baseSystem: 'LineageOS AOSP ARM64 + Handheld Hardware HAL',
    credits: {
      creators: 'The LineageOS Project & Handheld Maintainers',
      basedOn: 'Android Open Source Project (AOSP)',
      license: 'Apache-2.0 / GPL-2.0',
      projectUrl: 'https://lineageos.org',
      projectLabel: 'lineageos.org',
    },
    method: 'raw-img',
    methodLabel: 'Hybrid SD Image (.img.gz)',
    imageSizeBytes: 2_890_000_000,
    imageSizeLabel: '2.69 GB',
    minCardGb: 64,
    recommendedCardGb: 128,
    recommendedCardRange: '64 GB – 512 GB',
    recommendedFormat: 'FAT32',
    trimuiBrickSupport: 'Other Handhelds',
    supportedHardwareSummary:
      'Retroid Pocket 6, Retroid Pocket 5, Retroid Pocket 4 / 4 Pro, Retroid Pocket Mini, Retroid Pocket 3+ / Flip, AYN Odin 2 Series, AYN Odin (Base / Pro)',
    sha256: '3a7e19c4d08b52f6a1d947e3c508b2a4f7d613e8c09b5a24d1e7f83c6a09b412',
    summary:
      'Clean, bloat-free LineageOS Android ROM packaged for microSD dual-boot on supported AYN and Retroid handhelds with native controller mapping, Turnip driver support, and zero Google bloatware.',
    flashingInstructions: [
      'Format or target an A2 / V30 UHS-I microSD card (64 GB+) — Android userdata performance depends heavily on random 4K IOPS.',
      'Flash the device-matched LineageOS microSD hybrid .img.gz image directly via CFW Studio raw sector mode.',
      'Boot into your handheld fastboot/recovery SD-boot slot to launch LineageOS from microSD without wiping stock firmware.',
    ],
    knownIssues: [
      'Requires an A2-rated microSD card; budget U1 cards cause noticeable Android app launch stutter.',
      'Play Integrity / Widevine defaults to L3 on unlocked LineageOS SD dual-boot builds; streaming apps cap at SD resolution.',
      'Retroid Pocket 3+ / Flip (Unisoc T618) builds require flashing the matching T618 bootloader unlock shim before SD boot.',
    ],
    bootInstructions: [
      'Insert the flashed microSD card and hold Volume Up + Power (or reboot to fastboot SD entry) to start LineageOS Setup.',
      'Wait 60–90 seconds for initial ART dex optimization and USERDATA expansion.',
      'Install your preferred Android frontend (ES-DE, Daijisho, Beacon) or sideload F-Droid / RetroArch APKs.',
    ],
    partitions: [
      {
        label: 'LINEAGE_BOOT',
        filesystem: 'FAT32',
        sizeDescription: '1.0 GB Boot & DTBO',
        role: 'boot, vendor_boot, dtbo, optional MindTheGapps package',
        fractionPercent: 18,
      },
      {
        label: 'LINEAGE_SYS',
        filesystem: 'ext4',
        sizeDescription: '6.0 GB System & Vendor',
        role: 'LineageOS 22.1 ARM64 system, Handheld Input HAL',
        fractionPercent: 32,
      },
      {
        label: 'USERDATA',
        filesystem: 'ext4',
        sizeDescription: 'Auto-expands to remaining space',
        role: 'Android apps, RetroArch APKs, ROMs, saves',
        fractionPercent: 50,
      },
    ],
    devices: [
      {
        id: 'retroid-pocket-6',
        name: 'Retroid Pocket 6',
        chipset: 'Snapdragon 8 Gen 2',
        recommendedCardMinGb: 128,
        notes: 'Android 15 SD dual-boot with 120Hz AMOLED frame-rate control and Turnip Vulkan.',
      },
      {
        id: 'retroid-pocket-5',
        name: 'Retroid Pocket 5',
        chipset: 'Snapdragon 865',
        recommendedCardMinGb: 128,
        notes: 'Clean Android 15 SD boot with full 1080p AMOLED display & RGB ring support.',
      },
      {
        id: 'retroid-pocket-4',
        name: 'Retroid Pocket 4 / 4 Pro',
        chipset: 'MediaTek Dimensity 900 / 1100',
        recommendedCardMinGb: 64,
        notes: 'Clean LineageOS build with custom active fan curves and handheld controller HAL.',
      },
      {
        id: 'retroid-pocket-mini',
        name: 'Retroid Pocket Mini',
        chipset: 'Snapdragon 865',
        recommendedCardMinGb: 64,
        notes: 'De-bloated AOSP with custom TDP profiles and Xbox/Switch button swap.',
      },
      {
        id: 'ayn-odin2',
        name: 'AYN Odin 2 / Odin 2 Mini / Portal',
        chipset: 'Snapdragon 8 Gen 2',
        recommendedCardMinGb: 128,
        notes: 'High-performance LineageOS 22.1 SD dual-boot with active fan & LED service.',
      },
      {
        id: 'ayn-odin1',
        name: 'AYN Odin (Base / Pro)',
        chipset: 'Snapdragon 845',
        recommendedCardMinGb: 64,
        notes: 'Modern Android 14/15 upgrade path preserving stock Android 10 on internal storage.',
      },
      {
        id: 'retroid-pocket-3plus',
        name: 'Retroid Pocket 3+ / Flip',
        chipset: 'Unisoc T618',
        recommendedCardMinGb: 64,
        notes: 'Lightweight LineageOS build extending security patches and Mali GPU performance.',
      },
    ],
  },
];
