import { BookOpen, Check, Download, ExternalLink, Image as ImageIcon, Info, Scale, ShieldCheck, Smartphone, Usb } from 'lucide-react';
import { HANDHELD_OS_CATALOG } from '../data/osCatalog';
import { APP_DIFFERENTIATORS, PUBLIC_RELEASE_NOTICES } from '../utils/releaseCompliance';
import { BrowserCapabilities } from '../utils/usbMassStorage';

interface OtgGuideWorkspaceProps {
  capabilities: BrowserCapabilities;
  onOpenConnectModal: () => void;
  onOpenWalkthrough: () => void;
}

export function OtgGuideWorkspace({
  capabilities,
  onOpenConnectModal,
  onOpenWalkthrough,
}: OtgGuideWorkspaceProps) {
  const capabilityRows = [
    {
      label: 'Android 9+ (Pie / API 28+) Support',
      supported: capabilities.meetsAndroid9Plus,
      detail: capabilities.androidCompatReport.summary,
    },
    {
      label: 'WebUSB Mass Storage (Rootless OTG)',
      supported: capabilities.webUsbSupported,
      detail: capabilities.webUsbSupported
        ? 'Available — Chrome can request user-space USB OTG access without Android root.'
        : 'Unavailable in this browser. Switch to Chrome for Android 9+ or Desktop Chrome/Edge.',
    },
    {
      label: 'SAF Folder Access (Desktop + Android Fallback)',
      supported: capabilities.fileSystemAccessSupported || capabilities.webkitDirectorySupported,
      detail: capabilities.fileSystemAccessSupported
        ? 'Available — Direct read/write Directory Access API for FAT32 CFW packages.'
        : capabilities.webkitDirectorySupported
        ? 'Android SAF folder inspection (webkitdirectory) ready; use WebUSB OTG for raw sector writes.'
        : 'Limited on this platform; use WebUSB OTG or Virtual OTG mode.',
    },
    {
      label: 'Web Crypto SHA-256 Verification',
      supported: capabilities.webCryptoSupported,
      detail: capabilities.webCryptoSupported
        ? 'Available — Hardware-accelerated checksum verification with Android 9 FileReader fallback.'
        : 'Requires HTTPS secure context.',
    },
    {
      label: 'HTTPS Secure Context',
      supported: capabilities.isSecureContext,
      detail: capabilities.isSecureContext
        ? 'Active — Required for WebUSB and File System Access APIs.'
        : 'Not running in a secure context.',
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl text-balance">
            USB OTG Guide, App Differentiation &amp; OS Credits
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            How CFW Studio differs from legacy disk imagers, how rootless Android OTG works, and full attribution for every listed operating system.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={onOpenWalkthrough}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 whitespace-nowrap"
          >
            <BookOpen className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <span>Step-by-Step Walkthrough</span>
          </button>

          <button
            type="button"
            onClick={onOpenConnectModal}
            className="inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
          >
            <Usb className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Test USB OTG Connection</span>
          </button>
        </div>
      </div>

      {/* How CFW Studio Differs From Existing Apps */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              How CFW Studio Differs from Existing Disk Imagers
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Purpose-built for retro handheld microSD workflows rather than general-purpose PC flashing tools.
            </p>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400 whitespace-nowrap">
            MIT Open Source · WebUSB + SAF
          </span>
        </div>

        {/* Desktop comparison table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <th className="py-2.5 pr-4 font-semibold uppercase tracking-wide text-[11px] w-44">
                  Capability
                </th>
                <th className="py-2.5 px-4 font-semibold text-blue-700 dark:text-blue-400 uppercase tracking-wide text-[11px]">
                  CFW Studio
                </th>
                <th className="py-2.5 px-4 font-semibold uppercase tracking-wide text-[11px]">
                  Desktop Imagers
                </th>
                <th className="py-2.5 pl-4 font-semibold uppercase tracking-wide text-[11px]">
                  Mobile Image Writers
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {APP_DIFFERENTIATORS.map((row) => (
                <tr key={row.capability} className="align-top">
                  <td className="py-3 pr-4 font-semibold text-slate-900 dark:text-slate-100">
                    {row.capability}
                  </td>
                  <td className="py-3 px-4 font-medium text-slate-800 dark:text-slate-200">
                    {row.cfwStudio}
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    {row.desktopImagers}
                  </td>
                  <td className="py-3 pl-4 text-slate-600 dark:text-slate-400">
                    {row.mobileWriters}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile stacked comparison */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800 md:hidden">
          {APP_DIFFERENTIATORS.map((row) => (
            <div key={row.capability} className="py-3 space-y-1.5 text-xs">
              <div className="font-semibold text-slate-900 dark:text-slate-100">
                {row.capability}
              </div>
              <p className="text-slate-800 dark:text-slate-200">
                <strong className="text-blue-700 dark:text-blue-400">CFW Studio:</strong>{' '}
                {row.cfwStudio}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                <strong>Desktop Imagers:</strong> {row.desktopImagers}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                <strong>Mobile Writers:</strong> {row.mobileWriters}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-7">
          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Live Browser Hardware Diagnostics
            </h2>
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {capabilityRows.map((row) => (
                <div key={row.label} className="flex items-start justify-between gap-4 py-3">
                  <div>
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                      {row.label}
                    </div>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{row.detail}</p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold whitespace-nowrap shrink-0 ${
                      row.supported
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-amber-700 dark:text-amber-400'
                    }`}
                  >
                    {row.supported ? (
                      <>
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Ready</span>
                      </>
                    ) : (
                      <>
                        <Info className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>Fallback</span>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
            {capabilities.androidCompatReport.notes.length > 0 && (
              <div className="border-t border-slate-100 pt-3 text-xs text-slate-500 dark:border-slate-800 dark:text-slate-400 space-y-1">
                {capabilities.androidCompatReport.notes.map((note, idx) => (
                  <p key={idx}>{note}</p>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-2">
              <Smartphone className="h-4 w-4 text-slate-500 dark:text-slate-400" aria-hidden="true" />
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Rootless Android OTG Checklist
              </h2>
            </div>
            <ol className="list-decimal space-y-3 pl-5 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
              <li>
                <strong>Supported on Android 9.0 (Pie) or later:</strong> Run in Chrome for Android (or an updated Chromium System WebView) over HTTPS — no root or custom recovery needed.
              </li>
              <li>
                <strong>Use an external USB-C microSD reader</strong> rather than the phone&apos;s internal tray so Android exposes user-space access via USB Host.
              </li>
              <li>
                <strong>Grant Chrome USB permission</strong> when prompted after clicking <em>Pair USB OTG Reader</em> to write SCSI <code className="font-mono text-xs">WRITE(10)</code> blocks from LBA 0.
              </li>
              <li>
                <strong>Unmount in Android Storage Settings (Android 9–15+):</strong> If Android claims the drive automatically, tap <em>Eject / Unmount</em> in Settings → Storage without unplugging the reader before flashing.
              </li>
              <li>
                <strong>For FAT32 packages</strong> (NextUI, CrossMix OS, PakUI, Spruce, nxRedux, OnionOS), format to MBR FAT32 (32 KB clusters) via WebUSB OTG or inspect folders via SAF Mount.
              </li>
            </ol>
          </section>
        </div>

        <aside className="lg:col-span-5 space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Filesystem Selection Matrix
            </h2>
            <div className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
              <div className="py-3 space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                  <span>FAT32 (MBR 0x0C)</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">4 GB Max File</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Best for TrimUI Brick, Miyoo A30/Mini, nxRedux, and TF1 boot partitions. Bypasses the 32 GB formatting cap cleanly.
                </p>
              </div>
              <div className="py-3 space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                  <span>exFAT (MBR 0x07)</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">No 4 GB Limit</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Best for TF2 ROM cards holding DVD/Blu-ray ISOs (PS2, Wii, GameCube) and muOS/ArkOS libraries.
                </p>
              </div>
              <div className="py-3 space-y-1">
                <div className="flex items-center justify-between font-semibold text-slate-900 dark:text-slate-100">
                  <span>NTFS (MBR 0x07)</span>
                  <span className="font-mono text-slate-500 dark:text-slate-400">Journaled</span>
                </div>
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  Best for PC-to-handheld bulk staging drives and metadata-resilient backups.
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Operating System Creator Credits & Upstream Licenses */}
      <section
        id="os-credits-section"
        className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900 scroll-mt-20"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Operating System Creator Credits &amp; Upstream Licenses
            </h2>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-500 dark:text-slate-400">
            {HANDHELD_OS_CATALOG.length} listed operating systems
          </span>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
          All listed custom firmwares and operating systems are created, maintained, and licensed by their independent communities and authors. Links below point directly to each project&apos;s official repository or homepage.
        </p>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {HANDHELD_OS_CATALOG.map((os) => (
            <div
              key={os.id}
              className="grid grid-cols-1 gap-2 py-3.5 md:grid-cols-12 md:items-center md:gap-4"
            >
              <div className="md:col-span-2">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {os.name}
                </div>
                <div className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                  {os.version}
                </div>
              </div>

              <div className="md:col-span-4 text-xs">
                <div className="font-medium text-slate-800 dark:text-slate-200">
                  {os.credits.creators}
                </div>
                <div className="text-slate-500 dark:text-slate-400">
                  Base: {os.credits.basedOn}
                </div>
              </div>

              <div className="md:col-span-3 text-xs text-slate-600 dark:text-slate-400">
                <span className="md:hidden font-semibold text-slate-700 dark:text-slate-300">
                  License:{' '}
                </span>
                {os.credits.license}
              </div>

              <div className="md:col-span-3 md:text-right">
                <a
                  href={os.credits.projectUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400 break-all md:break-normal"
                >
                  <span>{os.credits.projectLabel}</span>
                  <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Public Release, Copyright & Trademark Notices */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" aria-hidden="true" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
            Copyright, Trademarks &amp; Public Release Notice
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {PUBLIC_RELEASE_NOTICES.map((notice) => (
            <div
              key={notice.id}
              className="rounded-lg border border-slate-200 bg-slate-50/70 p-4 space-y-1.5 dark:border-slate-800 dark:bg-slate-950/60"
            >
              <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                {notice.title}
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                {notice.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Brand Identity: App Icon, Thumbnail & Enhanced Wordmark */}
      <section
        id="app-brand-assets"
        className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <ImageIcon className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              CFW Studio Brand Assets (Icon, Thumbnail &amp; Wordmark)
            </h2>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
            PNG · Favicon, OpenGraph &amp; Launcher Ready
          </span>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
          <div className="md:col-span-3 rounded-lg border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">App Icon</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">Up to 2048²</span>
              </div>
              <div className="flex items-center justify-center rounded-lg border border-slate-200 bg-slate-100 p-4 dark:border-slate-800 dark:bg-slate-900">
                <img
                  src="/assets/branding/cfw-studio-icon-512.png"
                  srcSet="/assets/branding/cfw-studio-icon-192.png 1x, /assets/branding/cfw-studio-icon-512.png 2x, /assets/branding/cfw-studio-icon-1024.png 3x"
                  alt="CFW Studio square app icon"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="h-24 w-24 object-contain"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs">
              <a
                href="/assets/branding/cfw-studio-icon-2048.png"
                download="cfw-studio-icon-2048.png"
                className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:underline dark:text-blue-400"
              >
                <Download className="h-3.5 w-3.5" aria-hidden="true" />
                <span>2048px</span>
              </a>
              <a
                href="/assets/branding/cfw-studio-icon-512.png"
                download="cfw-studio-icon-512.png"
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
              >
                <span>512px</span>
              </a>
              <a
                href="/assets/branding/cfw-studio-icon-192.png"
                download="cfw-studio-icon-192.png"
                className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-slate-900 hover:underline dark:text-slate-400 dark:hover:text-slate-200"
              >
                <span>192px</span>
              </a>
            </div>
          </div>

          <div className="md:col-span-5 rounded-lg border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">App Thumbnail (OpenGraph 16:9)</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">1280×720</span>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-[#040718] dark:border-slate-800">
                <img
                  src="/assets/branding/cfw-studio-thumbnail.png"
                  alt="CFW Studio 16:9 application thumbnail banner"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="aspect-video w-full object-cover"
                />
              </div>
            </div>
            <a
              href="/assets/branding/cfw-studio-thumbnail.png"
              download="cfw-studio-thumbnail.png"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400 self-start"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Thumbnail PNG</span>
            </a>
          </div>

          <div className="md:col-span-4 rounded-lg border border-slate-200 bg-slate-50/70 p-4 flex flex-col justify-between gap-3 dark:border-slate-800 dark:bg-slate-950/60">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-900 dark:text-slate-100">Brand Lockup (Logo + Wordmark)</span>
                <span className="font-mono text-slate-500 dark:text-slate-400">1200×600</span>
              </div>
              <div className="overflow-hidden rounded-lg border border-slate-200 bg-[#040718] dark:border-slate-800">
                <img
                  src="/assets/branding/cfw-studio-wordmark.png"
                  alt="CFW Studio logo and wordmark banner"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className="aspect-2/1 w-full object-cover"
                />
              </div>
            </div>
            <a
              href="/assets/branding/cfw-studio-wordmark.png"
              download="cfw-studio-wordmark.png"
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 hover:underline dark:text-blue-400 self-start"
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Download Lockup PNG</span>
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

