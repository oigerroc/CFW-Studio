export const MIN_SUPPORTED_ANDROID_VERSION = 9;

export interface AndroidCompatibilityInput {
  userAgent: string;
  webUsbSupported: boolean;
  directoryPickerSupported: boolean;
  webkitDirectorySupported: boolean;
  webCryptoSupported: boolean;
  isSecureContext: boolean;
}

export type AndroidStorageStrategy =
  | 'webusb-and-saf-picker'
  | 'webusb-and-webkitdirectory'
  | 'webkitdirectory-only'
  | 'virtual-fallback';

export interface AndroidCompatibilityReport {
  isAndroid: boolean;
  minimumAndroidVersion: number;
  detectedAndroidVersion: number | null;
  meetsAndroid9Minimum: boolean;
  isReducedAndroidUa: boolean;
  storageStrategy: AndroidStorageStrategy;
  summary: string;
  notes: string[];
}

/**
 * Extracts the Android OS version from a browser User-Agent string.
 * Returns null for non-Android user agents.
 * Note: Modern Chrome (110+) freezes the UA token to "Android 10; K" on Android 10–15+.
 */
export function parseAndroidVersion(userAgent: string): number | null {
  const match = userAgent.match(/Android\s+(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  const parsed = Number.parseFloat(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

/**
 * Evaluates Android 9+ (API 28+) runtime capabilities and selects the right
 * OTG / Storage Access Framework strategy for CFW Studio.
 */
export function assessAndroidCompatibility(
  input: AndroidCompatibilityInput
): AndroidCompatibilityReport {
  const detectedAndroidVersion = parseAndroidVersion(input.userAgent);
  const isAndroid = detectedAndroidVersion !== null || /Android/i.test(input.userAgent);
  const isReducedAndroidUa = /Android\s+10;\s*K\b/i.test(input.userAgent);
  const meetsAndroid9Minimum =
    detectedAndroidVersion === null || detectedAndroidVersion >= MIN_SUPPORTED_ANDROID_VERSION;

  let storageStrategy: AndroidStorageStrategy = 'virtual-fallback';
  if (input.webUsbSupported && input.directoryPickerSupported) {
    storageStrategy = 'webusb-and-saf-picker';
  } else if (input.webUsbSupported && input.webkitDirectorySupported) {
    storageStrategy = 'webusb-and-webkitdirectory';
  } else if (input.webkitDirectorySupported) {
    storageStrategy = 'webkitdirectory-only';
  }

  const notes: string[] = [
    'Targets Android 9.0 (Pie / API 28) or later with Chrome for Android or updated System WebView.',
  ];

  if (isAndroid && !meetsAndroid9Minimum && detectedAndroidVersion !== null) {
    notes.push(
      `Detected Android ${detectedAndroidVersion}; Android 9.0 or later is recommended for reliable USB-C OTG Mass Storage and WebUSB permissions.`
    );
  } else if (isAndroid) {
    notes.push(
      'On Android 9 & 10, if the system mounts your USB-C reader automatically, open Settings -> Storage -> Eject/Unmount (without unplugging) before pairing WebUSB.'
    );
  }

  if (isAndroid && !input.directoryPickerSupported && input.webkitDirectorySupported) {
    notes.push(
      'Chrome for Android omits showDirectoryPicker; Mount SD Folder uses SAF directory inspection while WebUSB OTG handles sector writes.'
    );
  }

  if (!input.isSecureContext || !input.webCryptoSupported) {
    notes.push('Use HTTPS so WebUSB OTG and hardware-accelerated SHA-256 verification remain active.');
  }

  let summary = 'Compatible with Android 9+ (Chrome USB OTG & Desktop Chrome/Edge)';
  if (isAndroid && !meetsAndroid9Minimum && detectedAndroidVersion !== null) {
    summary = `Android ${detectedAndroidVersion} detected — upgrade to Android 9+ or Chrome for Android for full WebUSB OTG support.`;
  } else if (isAndroid && input.webUsbSupported) {
    summary = isReducedAndroidUa
      ? 'Android 10+ detected (UA reduced) — WebUSB OTG + SAF folder fallback ready.'
      : `Android ${detectedAndroidVersion ?? '9+'} detected — WebUSB OTG + SAF folder fallback ready.`;
  } else if (isAndroid) {
    summary = `Android ${detectedAndroidVersion ?? '9+'} detected — use Chrome for Android over HTTPS for WebUSB OTG.`;
  }

  return {
    isAndroid,
    minimumAndroidVersion: MIN_SUPPORTED_ANDROID_VERSION,
    detectedAndroidVersion,
    meetsAndroid9Minimum,
    isReducedAndroidUa,
    storageStrategy,
    summary,
    notes,
  };
}

/**
 * Reads a Blob/File into an ArrayBuffer with FileReader fallback for Android 9
 * stock WebViews / Chrome versions earlier than Chrome 76 (which lack Blob.prototype.arrayBuffer).
 */
export function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }

  return new Promise<ArrayBuffer>((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      reject(new Error('FileReader API is unavailable in this environment.'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
      } else {
        reject(new Error('Unexpected non-ArrayBuffer result from FileReader.'));
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read binary slice via FileReader.'));
    };
    reader.readAsArrayBuffer(blob);
  });
}

export function supportsWebkitDirectoryInput(): boolean {
  if (typeof document === 'undefined') return false;
  const input = document.createElement('input');
  return 'webkitdirectory' in input;
}
