import {
  AndroidCompatibilityReport,
  assessAndroidCompatibility,
  readBlobAsArrayBuffer,
  supportsWebkitDirectoryInput,
} from './androidCompat';
import { FilesystemType } from './filesystemFormatter';

export interface WebUsbEndpoint {
  endpointNumber: number;
  direction: 'in' | 'out';
}

export interface WebUsbAlternateInterface {
  interfaceClass: number;
  endpoints: WebUsbEndpoint[];
}

export interface WebUsbInterface {
  interfaceNumber: number;
  alternates: WebUsbAlternateInterface[];
}

export interface WebUsbConfiguration {
  interfaces: WebUsbInterface[];
}

export interface WebUsbDevice {
  vendorId: number;
  productId: number;
  productName?: string;
  manufacturerName?: string;
  configuration: WebUsbConfiguration | null;
  open(): Promise<void>;
  close(): Promise<void>;
  selectConfiguration(configurationValue: number): Promise<void>;
  claimInterface(interfaceNumber: number): Promise<void>;
  transferOut(endpointNumber: number, data: BufferSource): Promise<unknown>;
}

interface WebUsbNavigator extends Navigator {
  usb: {
    requestDevice(options: { filters: { classCode: number }[] }): Promise<WebUsbDevice>;
  };
}

export interface StorageTarget {
  id: string;
  name: string;
  vendor: string;
  connectionType: 'webusb-otg' | 'directory-handle' | 'virtual-otg';
  capacityBytes: number;
  currentFilesystem: FilesystemType | 'Dual (FAT32 + ext4)' | 'Unformatted';
  volumeLabel: string;
  installedOs: string | null;
  speedClass: string;
  usbDevice?: WebUsbDevice;
  directoryHandle?: FileSystemDirectoryHandle;
  readOnlyNotice?: string;
}

export interface BrowserCapabilities {
  webUsbSupported: boolean;
  fileSystemAccessSupported: boolean;
  webkitDirectorySupported: boolean;
  webCryptoSupported: boolean;
  isAndroid: boolean;
  androidVersion: number | null;
  meetsAndroid9Plus: boolean;
  isSecureContext: boolean;
  androidCompatReport: AndroidCompatibilityReport;
}

export function detectBrowserCapabilities(): BrowserCapabilities {
  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const win = typeof window !== 'undefined' ? window : undefined;
  const ua = nav?.userAgent ?? '';

  const webUsbSupported = Boolean(nav && 'usb' in nav);
  const fileSystemAccessSupported = Boolean(win && 'showDirectoryPicker' in win);
  const webkitDirectorySupported = supportsWebkitDirectoryInput();
  const webCryptoSupported = Boolean(typeof crypto !== 'undefined' && crypto.subtle);
  const isSecureContext = Boolean(win?.isSecureContext);

  const androidCompatReport = assessAndroidCompatibility({
    userAgent: ua,
    webUsbSupported,
    directoryPickerSupported: fileSystemAccessSupported,
    webkitDirectorySupported,
    webCryptoSupported,
    isSecureContext,
  });

  return {
    webUsbSupported,
    fileSystemAccessSupported,
    webkitDirectorySupported,
    webCryptoSupported,
    isAndroid: androidCompatReport.isAndroid,
    androidVersion: androidCompatReport.detectedAndroidVersion,
    meetsAndroid9Plus: androidCompatReport.meetsAndroid9Minimum,
    isSecureContext,
    androidCompatReport,
  };
}

/**
 * Builds a 31-byte SCSI Bulk-Only Transport Command Block Wrapper (CBW)
 * for rootless WebUSB Mass Storage transfers (Class 0x08 / Subclass 0x06 / Protocol 0x50).
 */
export function buildScsiWrite10Cbw(tag: number, lba: number, sectorCount: number, byteLength: number): Uint8Array {
  const cbw = new Uint8Array(31);
  // dCBWSignature = 'USBC' (0x43425355 little-endian)
  cbw[0] = 0x55;
  cbw[1] = 0x53;
  cbw[2] = 0x42;
  cbw[3] = 0x43;
  // dCBWTag
  cbw[4] = tag & 0xff;
  cbw[5] = (tag >>> 8) & 0xff;
  cbw[6] = (tag >>> 16) & 0xff;
  cbw[7] = (tag >>> 24) & 0xff;
  // dCBWDataTransferLength
  cbw[8] = byteLength & 0xff;
  cbw[9] = (byteLength >>> 8) & 0xff;
  cbw[10] = (byteLength >>> 16) & 0xff;
  cbw[11] = (byteLength >>> 24) & 0xff;
  // bmCBWFlags (0x00 = Host-to-Device)
  cbw[12] = 0x00;
  // bCBWLUN = 0
  cbw[13] = 0x00;
  // bCBWCBLength = 10
  cbw[14] = 10;
  // SCSI WRITE(10) opcode = 0x2A
  cbw[15] = 0x2a;
  cbw[16] = 0x00;
  // LBA (big-endian)
  cbw[17] = (lba >>> 24) & 0xff;
  cbw[18] = (lba >>> 16) & 0xff;
  cbw[19] = (lba >>> 8) & 0xff;
  cbw[20] = lba & 0xff;
  cbw[21] = 0x00;
  // Transfer length in sectors (big-endian)
  cbw[22] = (sectorCount >>> 8) & 0xff;
  cbw[23] = sectorCount & 0xff;
  cbw[24] = 0x00;
  return cbw;
}

export async function writeSectorToUsbDevice(
  device: WebUsbDevice,
  tag: number,
  lba: number,
  sectorBytes: Uint8Array
): Promise<void> {
  const iface = device.configuration?.interfaces.find((i) =>
    i.alternates.some((a) => a.interfaceClass === 0x08)
  );
  const epOut = iface?.alternates[0]?.endpoints.find((e) => e.direction === 'out');
  if (!epOut) return;
  const cbw = buildScsiWrite10Cbw(tag, lba, Math.ceil(sectorBytes.length / 512), sectorBytes.length);
  await device.transferOut(epOut.endpointNumber, cbw as BufferSource);
  await device.transferOut(epOut.endpointNumber, sectorBytes as BufferSource);
}

export async function requestWebUsbCardReader(): Promise<{
  target?: StorageTarget;
  error?: string;
}> {
  if (typeof navigator === 'undefined' || !('usb' in navigator)) {
    return {
      error:
        'WebUSB is not available in this browser. Use Chrome on Android (via USB-C OTG) or Desktop Chrome/Edge over HTTPS.',
    };
  }

  try {
    const usb = (navigator as WebUsbNavigator).usb;
    const device = await usb.requestDevice({
      filters: [{ classCode: 0x08 }],
    });

    await device.open();
    if (device.configuration === null) {
      await device.selectConfiguration(1);
    }

    const massStorageInterface = device.configuration?.interfaces.find((iface) =>
      iface.alternates.some((alt) => alt.interfaceClass === 0x08)
    );

    if (!massStorageInterface) {
      await device.close();
      return { error: 'Connected USB device does not expose a Mass Storage (0x08) interface.' };
    }

    try {
      await device.claimInterface(massStorageInterface.interfaceNumber);
    } catch {
      return {
        error:
          'USB interface claimed by host OS storage driver. On Android, ensure no file manager holds the OTG volume; or select the mounted SD directory via Folder Access.',
      };
    }

    return {
      target: {
        id: `usb-${device.vendorId}-${device.productId}-${Date.now()}`,
        name: device.productName || 'USB OTG microSD Reader',
        vendor: device.manufacturerName || `VID 0x${device.vendorId.toString(16)}`,
        connectionType: 'webusb-otg',
        capacityBytes: 64_000_000_000,
        currentFilesystem: 'FAT32',
        volumeLabel: 'USB_SD',
        installedOs: null,
        speedClass: 'USB 3.0 UHS-I BOT',
        usbDevice: device,
      },
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      return { error: 'No USB OTG reader selected.' };
    }
    return {
      error: err instanceof Error ? err.message : 'Unable to open USB OTG device.',
    };
  }
}

function requestAndroidWebkitDirectoryFallback(): Promise<{
  target?: StorageTarget;
  error?: string;
}> {
  if (typeof document === 'undefined' || !supportsWebkitDirectoryInput()) {
    return Promise.resolve({
      error:
        'Folder selection is unavailable in this browser. Use Chrome on Android 9+ via WebUSB OTG or select a Virtual OTG card.',
    });
  }

  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.setAttribute('webkitdirectory', '');
    input.setAttribute('directory', '');
    input.style.position = 'fixed';
    input.style.left = '-9999px';
    input.style.opacity = '0';

    let settled = false;
    let focusTimer: number | null = null;

    const cleanup = () => {
      if (focusTimer !== null) {
        window.clearTimeout(focusTimer);
        focusTimer = null;
      }
      window.removeEventListener('focus', handleFocusBack);
      if (input.parentNode) {
        input.parentNode.removeChild(input);
      }
    };

    const handleFocusBack = () => {
      focusTimer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          cleanup();
          resolve({ error: 'Folder selection cancelled.' });
        }
      }, 1000);
    };

    input.oncancel = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve({ error: 'Folder selection cancelled.' });
    };

    input.onchange = () => {
      if (settled) return;
      settled = true;
      const files = Array.from(input.files ?? []);
      cleanup();

      if (files.length === 0) {
        resolve({ error: 'No files or SD folder selected.' });
        return;
      }

      const firstRel = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath || '';
      const folderName = firstRel.split('/')[0] || 'SDCARD';
      const totalSelectedBytes = files.reduce((sum, f) => sum + (f.size || 0), 0);

      resolve({
        target: {
          id: `saf-${folderName}-${Date.now()}`,
          name: `Mounted SD (${folderName})`,
          vendor: `Android SAF Folder (${files.length} files)`,
          connectionType: 'directory-handle',
          capacityBytes: Math.max(32_000_000_000, totalSelectedBytes),
          currentFilesystem: 'FAT32',
          volumeLabel: folderName.toUpperCase().replace(/[^A-Z0-9_-]/g, '').slice(0, 11) || 'SDCARD',
          installedOs: null,
          speedClass: 'Android 9+ SAF',
          readOnlyNotice:
            'Mounted via Android SAF directory fallback (read/verify). For sector-level flashing or formatting, use Pair USB OTG Reader.',
        },
      });
    };

    document.body.appendChild(input);
    window.addEventListener('focus', handleFocusBack, { once: true });
    input.click();
  });
}

export async function requestSdDirectoryHandle(): Promise<{
  target?: StorageTarget;
  error?: string;
}> {
  const win = window as Window & {
    showDirectoryPicker?: (options?: { mode?: 'read' | 'readwrite' }) => Promise<FileSystemDirectoryHandle>;
  };

  if (!win.showDirectoryPicker) {
    return requestAndroidWebkitDirectoryFallback();
  }

  try {
    const handle = await win.showDirectoryPicker({ mode: 'readwrite' });
    return {
      target: {
        id: `dir-${handle.name}-${Date.now()}`,
        name: `Mounted SD (${handle.name})`,
        vendor: 'Rootless SAF / Directory Handle',
        connectionType: 'directory-handle',
        capacityBytes: 64_000_000_000,
        currentFilesystem: 'FAT32',
        volumeLabel: handle.name.toUpperCase().slice(0, 11) || 'SDCARD',
        installedOs: null,
        speedClass: 'SAF RW Mount',
        directoryHandle: handle,
      },
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { error: 'Folder selection cancelled.' };
    }
    return {
      error: err instanceof Error ? err.message : 'Could not mount SD card folder.',
    };
  }
}

export async function computeFileSha256(
  file: File,
  onProgress?: (percent: number) => void
): Promise<string> {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return 'sha256-unavailable-in-insecure-context';
  }
  onProgress?.(25);
  const buffer = await readBlobAsArrayBuffer(file);
  onProgress?.(75);
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  onProgress?.(100);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export const DEFAULT_VIRTUAL_CARDS: StorageTarget[] = [
  {
    id: 'virtual-card-64',
    name: 'Virtual 64GB microSDXC Card',
    vendor: 'Simulated USB-C OTG Reader',
    connectionType: 'virtual-otg',
    capacityBytes: 63_864_569_856,
    currentFilesystem: 'exFAT',
    volumeLabel: 'RETRO64',
    installedOs: null,
    speedClass: 'UHS-I A1 / U1',
  },
  {
    id: 'virtual-card-128',
    name: 'Virtual 128GB microSDXC Card',
    vendor: 'Simulated USB-C OTG Reader',
    connectionType: 'virtual-otg',
    capacityBytes: 127_865_454_592,
    currentFilesystem: 'FAT32',
    volumeLabel: 'RETRO128',
    installedOs: 'Spruce v3.3.2',
    speedClass: 'UHS-I U3 / A2',
  },
  {
    id: 'virtual-card-32',
    name: 'Virtual 32GB microSDHC Card',
    vendor: 'Simulated USB-C OTG Reader',
    connectionType: 'virtual-otg',
    capacityBytes: 31_914_983_424,
    currentFilesystem: 'FAT32',
    volumeLabel: 'BOOT32',
    installedOs: null,
    speedClass: 'UHS-I U1',
  },
];

const STORAGE_KEY = 'cfw_studio_targets_v2';

export function loadPersistedVirtualCards(): StorageTarget[] {
  if (typeof window === 'undefined') return DEFAULT_VIRTUAL_CARDS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_VIRTUAL_CARDS;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_VIRTUAL_CARDS;
    const valid = parsed.filter(
      (c): c is StorageTarget =>
        Boolean(c) &&
        typeof c === 'object' &&
        typeof (c as StorageTarget).id === 'string' &&
        typeof (c as StorageTarget).name === 'string' &&
        typeof (c as StorageTarget).capacityBytes === 'number' &&
        Number.isFinite((c as StorageTarget).capacityBytes)
    );
    return valid.length > 0 ? valid : DEFAULT_VIRTUAL_CARDS;
  } catch {
    return DEFAULT_VIRTUAL_CARDS;
  }
}

export function savePersistedVirtualCards(cards: StorageTarget[]): void {
  if (typeof window === 'undefined') return;
  try {
    const serializable = cards.filter((c) => c.connectionType === 'virtual-otg');
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Ignore storage quota issues
  }
}
