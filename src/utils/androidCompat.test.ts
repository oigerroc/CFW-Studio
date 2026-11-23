import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MIN_SUPPORTED_ANDROID_VERSION,
  assessAndroidCompatibility,
  parseAndroidVersion,
  readBlobAsArrayBuffer,
} from './androidCompat.ts';

test('parseAndroidVersion parses Android 9 through 15+ and legacy versions accurately', () => {
  assert.equal(
    parseAndroidVersion(
      'Mozilla/5.0 (Linux; Android 9; Pixel 3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/74.0.3729.157 Mobile Safari/537.36'
    ),
    9
  );
  assert.equal(
    parseAndroidVersion(
      'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36'
    ),
    10
  );
  assert.equal(
    parseAndroidVersion(
      'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 Chrome/124.0.0.0 Mobile Safari/537.36'
    ),
    14
  );
  assert.equal(
    parseAndroidVersion(
      'Mozilla/5.0 (Linux; Android 8.1.0; Nexus 5X) AppleWebKit/537.36 Chrome/70.0.3538.110 Mobile Safari/537.36'
    ),
    8.1
  );
  assert.equal(
    parseAndroidVersion(
      'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
    ),
    null
  );
});

test('assessAndroidCompatibility approves Android 9+ with WebUSB and webkitdirectory fallback', () => {
  const report = assessAndroidCompatibility({
    userAgent:
      'Mozilla/5.0 (Linux; Android 9; SM-G960U) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.162 Mobile Safari/537.36',
    webUsbSupported: true,
    directoryPickerSupported: false,
    webkitDirectorySupported: true,
    webCryptoSupported: true,
    isSecureContext: true,
  });

  assert.equal(report.minimumAndroidVersion, MIN_SUPPORTED_ANDROID_VERSION);
  assert.equal(report.isAndroid, true);
  assert.equal(report.detectedAndroidVersion, 9);
  assert.equal(report.meetsAndroid9Minimum, true);
  assert.equal(report.storageStrategy, 'webusb-and-webkitdirectory');
  assert.ok(report.summary.includes('Android 9'));
  assert.ok(report.notes.some((n) => n.includes('Eject/Unmount')));
});

test('assessAndroidCompatibility flags Android 8.1 as below Android 9 minimum while supporting Android 10+ reduced UA', () => {
  const legacyReport = assessAndroidCompatibility({
    userAgent: 'Mozilla/5.0 (Linux; Android 8.1.0; Pixel) Chrome/70.0 Mobile Safari/537.36',
    webUsbSupported: false,
    directoryPickerSupported: false,
    webkitDirectorySupported: true,
    webCryptoSupported: true,
    isSecureContext: true,
  });
  assert.equal(legacyReport.meetsAndroid9Minimum, false);

  const reducedReport = assessAndroidCompatibility({
    userAgent: 'Mozilla/5.0 (Linux; Android 10; K) Chrome/128.0.0.0 Mobile Safari/537.36',
    webUsbSupported: true,
    directoryPickerSupported: false,
    webkitDirectorySupported: true,
    webCryptoSupported: true,
    isSecureContext: true,
  });
  assert.equal(reducedReport.meetsAndroid9Minimum, true);
  assert.equal(reducedReport.isReducedAndroidUa, true);
});

test('readBlobAsArrayBuffer works with both modern Blob.arrayBuffer and legacy Blobs without .arrayBuffer()', async () => {
  const payload = new Uint8Array([0x50, 0x4b, 0x05, 0x06]);
  const modernBlob = new Blob([payload]);
  const modernOut = new Uint8Array(await readBlobAsArrayBuffer(modernBlob));
  assert.deepEqual(Array.from(modernOut), [0x50, 0x4b, 0x05, 0x06]);

  // Simulate Android 9 Chrome < 76 / WebView where Blob.prototype.arrayBuffer is undefined
  const fakeLegacyBlob = new Blob([payload]) as Blob & { arrayBuffer?: undefined };
  Object.defineProperty(fakeLegacyBlob, 'arrayBuffer', { value: undefined });
  // Provide minimal FileReader shim in Node test environment
  const OriginalFileReader = globalThis.FileReader;
  class MockFileReader {
    result: ArrayBuffer | null = null;
    error: Error | null = null;
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    readAsArrayBuffer(b: Blob) {
      b.text()
        .then((t) => {
          const bytes = new Uint8Array(Array.from(t).map((ch) => ch.charCodeAt(0)));
          this.result = bytes.buffer;
          this.onload?.();
        })
        .catch((err) => {
          this.error = err;
          this.onerror?.();
        });
    }
  }
  (globalThis as unknown as { FileReader: unknown }).FileReader = MockFileReader;
  try {
    const legacyOut = new Uint8Array(await readBlobAsArrayBuffer(fakeLegacyBlob));
    assert.deepEqual(Array.from(legacyOut), [0x50, 0x4b, 0x05, 0x06]);
  } finally {
    (globalThis as unknown as { FileReader: unknown }).FileReader = OriginalFileReader;
  }
});
