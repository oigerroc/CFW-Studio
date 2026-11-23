import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Compass,
  Eraser,
  HardDrive,
  Layers,
  Power,
  Usb,
  X,
} from 'lucide-react';
import { HANDHELD_OS_CATALOG } from '../data/osCatalog';
import { getUniqueDeviceModels } from '../utils/catalogFilters';
import { suggestBestOsByDevice } from '../utils/osRecommender';
import { AppView } from './TopNav';

interface WalkthroughModalProps {
  open: boolean;
  onClose: () => void;
  onNavigate: (view: AppView) => void;
  onOpenConnectModal: () => void;
  onApplyRecommendedOs: (osId: string, deviceId?: string) => void;
}

interface WalkthroughStepMeta {
  id: number;
  shortTitle: string;
  title: string;
  subtitle: string;
}

const STEPS: WalkthroughStepMeta[] = [
  {
    id: 1,
    shortTitle: '1. Handheld & SD',
    title: 'Pick Your Handheld & Check Your microSD Card',
    subtitle: 'Start with a reliable name-brand microSD card and let CFW Studio match the best beginner OS.',
  },
  {
    id: 2,
    shortTitle: '2. OS Type',
    title: 'Know the Two Types of Handheld OS Downloads',
    subtitle: 'Never extract or drag-and-drop a raw .img file like a normal folder — CFW Studio picks the right mode.',
  },
  {
    id: 3,
    shortTitle: '3. Connect OTG',
    title: 'Connect Your microSD Card Without Root',
    subtitle: 'Android phones and tablets require an external USB-C card reader for rootless flashing.',
  },
  {
    id: 4,
    shortTitle: '4. Format & Flash',
    title: 'Format (When Needed) and Flash Safely',
    subtitle: 'Double-check card capacity before erasing, and keep SHA-256 verification turned on.',
  },
  {
    id: 5,
    shortTitle: '5. First Boot',
    title: 'Insert into TF1, Wait for Setup & Add Games',
    subtitle: 'First boot expands partitions automatically and can take 45–90 seconds.',
  },
];

export function WalkthroughModal({
  open,
  onClose,
  onNavigate,
  onOpenConnectModal,
  onApplyRecommendedOs,
}: WalkthroughModalProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [starterDevice, setStarterDevice] = useState('TrimUI Brick');

  const deviceModels = useMemo(
    () => getUniqueDeviceModels(HANDHELD_OS_CATALOG),
    []
  );

  const starterPlan = useMemo(
    () => suggestBestOsByDevice(HANDHELD_OS_CATALOG, starterDevice, 'beginner'),
    [starterDevice]
  );

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const currentStep = STEPS[stepIndex];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 p-3 sm:p-5 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="walkthrough-modal-title"
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-400">
              <BookOpen className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h2
                id="walkthrough-modal-title"
                className="font-display text-lg font-bold text-slate-900 dark:text-slate-100 truncate"
              >
                Beginner Walkthrough Guide
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Step {stepIndex + 1} of {STEPS.length} · Rootless microSD setup from start to first boot
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close beginner walkthrough"
            className="flex min-h-[38px] min-w-[38px] shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Interactive Step Tabs */}
        <div
          role="tablist"
          aria-label="Walkthrough steps"
          className="grid grid-cols-5 gap-1 border-b border-slate-200 bg-slate-50 px-4 py-2 dark:border-slate-800 dark:bg-slate-950/60 sm:px-6"
        >
          {STEPS.map((step, idx) => {
            const active = idx === stepIndex;
            const visited = idx < stepIndex;
            return (
              <button
                key={step.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setStepIndex(idx)}
                className={`min-h-[36px] rounded-md px-2 py-1 text-[11px] font-semibold transition-colors truncate focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  active
                    ? 'bg-blue-600 text-white'
                    : visited
                    ? 'bg-white text-slate-900 border border-slate-200 dark:bg-slate-800 dark:text-slate-100 dark:border-slate-700'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100'
                }`}
              >
                {step.shortTitle}
              </button>
            );
          })}
        </div>

        {/* Step Body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4 sm:px-6">
          <div>
            <h3 className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
              {currentStep.title}
            </h3>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              {currentStep.subtitle}
            </p>
          </div>

          {stepIndex === 0 && (
            <div className="space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-950/60">
                <label
                  htmlFor="walkthrough-handheld-select"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200"
                >
                  <Compass className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                  <span>Which handheld are you setting up?</span>
                </label>
                <select
                  id="walkthrough-handheld-select"
                  value={starterDevice}
                  onChange={(e) => setStarterDevice(e.target.value)}
                  className="block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                >
                  {deviceModels.map((model) => (
                    <option key={model} value={model}>
                      {model}
                    </option>
                  ))}
                </select>

                {starterPlan && (
                  <div className="rounded-lg border border-slate-200 bg-white p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Recommended Starter OS: {starterPlan.primary.os.name}
                      </div>
                      <span className="font-mono text-xs text-blue-700 dark:text-blue-400">
                        {starterPlan.primary.recommendedSdSpec}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {starterPlan.primary.reasonSummary}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        onApplyRecommendedOs(
                          starterPlan.primary.os.id,
                          starterPlan.primary.deviceTarget.id
                        );
                        onNavigate('flasher');
                        onClose();
                      }}
                      className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
                    >
                      <span>Pre-select {starterPlan.primary.os.name} in Flasher</span>
                      <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 text-xs">
                <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Replace Generic Stock Cards
                  </div>
                  <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-400">
                    Unbranded microSD cards included in handheld boxes fail frequently. Use a reputable 32 GB–128 GB UHS-I (A1 or A2) card from a trusted manufacturer.
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 p-3.5 dark:border-slate-800">
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Single vs. Two-Card Handhelds
                  </div>
                  <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-400">
                    The operating system always goes on <strong>TF1 (INT)</strong>. If your handheld has a <strong>TF2</strong> slot, keep ROMs there in exFAT or FAT32.
                  </p>
                </div>
              </div>
            </div>
          )}

          {stepIndex === 1 && (
            <div className="space-y-3.5">
              <div className="rounded-lg border border-slate-200 p-4 space-y-1.5 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    <HardDrive className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                    <span>Type A: Raw Disk Image (.img / .img.gz / .img.xz)</span>
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">Sector Flash</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Used by <strong>Knulli, muOS, ArkOS, AmberELEC, ROCKNIX, GarlicOS, Armada OS, and LineageOS</strong>. Do <em>not</em> copy these files onto a formatted card like a photo — they contain multiple hidden boot partitions and must be flashed directly from sector 0.
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 p-4 space-y-1.5 dark:border-slate-800">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
                    <Layers className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span>Type B: FAT32 32 KB Package (.zip / .7z)</span>
                  </span>
                  <span className="font-mono text-xs text-slate-500 dark:text-slate-400">FAT32 + Extract</span>
                </div>
                <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                  Used by <strong>NextUI, CrossMix OS, PakUI, Spruce, nxRedux, and OnionOS</strong>. Your microSD card must be formatted as <strong>MBR FAT32 with 32 KB clusters</strong> (even on 64 GB–512 GB cards where Windows/Android try to force exFAT), then the archive folders go directly on the root of the card.
                </p>
              </div>

              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tip: If you select a GitHub release link or local `.zip` / `.7z` / `.img.gz` file in the Flasher, CFW Studio inspects the file header and picks the correct strategy automatically.
              </p>
            </div>
          )}

          {stepIndex === 2 && (
            <div className="space-y-4">
              <ol className="list-decimal space-y-2.5 pl-5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 sm:text-sm">
                <li>
                  <strong>Use Android 9.0 (Pie) or later with Chrome:</strong> Plug into an external USB-C microSD reader rather than the phone&apos;s built-in SD/SIM tray, which Android locks behind its storage sandbox without root.
                </li>
                <li>
                  <strong>Unmount in Android Settings (for Raw Images):</strong> On Android 9+, if the system opens a file manager when you plug in the reader, open <em>Android Settings → Storage → Eject / Unmount</em> (without unplugging!) so WebUSB can claim raw sectors.
                </li>
                <li>
                  <strong>Click Connect Reader → Pair USB OTG Reader:</strong> Grant permission in the Chrome USB prompt, or use <strong>Mount SD Folder</strong> via Android SAF for folder inspection.
                </li>
              </ol>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenConnectModal();
                  }}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
                >
                  <Usb className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Open Connect Reader</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('guide');
                    onClose();
                  }}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  <span>Check Browser OTG Readiness</span>
                </button>
              </div>
            </div>
          )}

          {stepIndex === 3 && (
            <div className="space-y-4">
              <div className="space-y-2.5 text-xs leading-relaxed text-slate-700 dark:text-slate-300 sm:text-sm">
                <p>
                  <strong>When should you run SD Formatter first?</strong> Always format to <strong>FAT32 (32 KB clusters)</strong> before installing FAT32 packages (NextUI, CrossMix OS, PakUI, Spruce, nxRedux, OnionOS), or format a second TF2 game card to <strong>exFAT</strong> if you store PS2/GameCube/PSP ISOs larger than 4 GB.
                </p>
                <p>
                  <strong>Confirm before erasing:</strong> In <strong>OS Flasher</strong>, choose your OS (or paste a GitHub link / upload a local file), select the target microSD card, keep <strong>Verify written sectors (SHA-256 readback)</strong> checked, and verify the capacity in the red confirmation modal before flashing.
                </p>
              </div>

              <div className="flex flex-wrap gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('formatter');
                    onClose();
                  }}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
                >
                  <Eraser className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Open SD Formatter</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onNavigate('flasher');
                    onClose();
                  }}
                  className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 whitespace-nowrap"
                >
                  <span>Go to OS Flasher</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {stepIndex === 4 && (
            <div className="space-y-3.5">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 space-y-2 dark:border-emerald-800/60 dark:bg-emerald-950/40">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-900 dark:text-emerald-300">
                  <Power className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  <span>First Boot Checklist (Don&apos;t Interrupt!)</span>
                </div>
                <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-emerald-950 dark:text-emerald-100">
                  <li>
                    <strong>Power off your handheld completely</strong> before inserting the microSD card into <strong>TF1</strong>.
                  </li>
                  <li>
                    <strong>Wait 45–90 seconds on first boot:</strong> Raw Linux OSes (Knulli, ArkOS, ROCKNIX, muOS, Armada OS) expand the ROMs partition to fill the rest of your card on first power-on.
                  </li>
                  <li>
                    <strong>AYN &amp; Retroid Qualcomm dual-boot:</strong> Hold <strong>Volume Up + Power</strong> when turning on to boot ROCKNIX, Armada OS, or LineageOS from microSD without touching internal Android.
                  </li>
                  <li>
                    <strong>Copy your games &amp; BIOS:</strong> Drop ROM files into the system folders created under <code className="font-mono">/Roms</code> (or transfer over Wi-Fi SFTP/MTP if SHARE/STORAGE uses <code className="font-mono">ext4</code>).
                  </li>
                </ol>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>You can reopen this walkthrough anytime from the top workspace bar or OTG Guide.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/60 sm:px-6">
          <button
            type="button"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((prev) => Math.max(0, prev - 1))}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 whitespace-nowrap"
          >
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Previous</span>
          </button>

          {stepIndex < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => setStepIndex((prev) => Math.min(STEPS.length - 1, prev + 1))}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap"
            >
              <span>Next Step</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onNavigate('flasher');
                onClose();
              }}
              className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 whitespace-nowrap"
            >
              <span>Start Flashing</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
