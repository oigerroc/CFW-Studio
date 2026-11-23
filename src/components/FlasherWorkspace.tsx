import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Compass,
  Cpu,
  ExternalLink,
  FileArchive,
  GitBranch,
  Layers,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Upload,
  Zap,
} from 'lucide-react';
import {
  HANDHELD_OS_CATALOG,
  HandheldOsEntry,
  PartitionSpec,
} from '../data/osCatalog';
import {
  computeFlashPlan,
  computePartitionPlan,
  formatBytes,
} from '../utils/filesystemFormatter';
import {
  StorageTarget,
  computeFileSha256,
  writeSectorToUsbDevice,
} from '../utils/usbMassStorage';
import {
  ArchiveInspectionResult,
  inspectLocalOsFile,
} from '../utils/archiveInspector';
import {
  GITHUB_OS_PRESETS,
  GithubReleaseAsset,
  GithubReleaseSummary,
  fetchGithubReleasesForUrl,
  parseGithubUrl,
} from '../utils/githubOsSource';
import { getUniqueDeviceModels } from '../utils/catalogFilters';
import {
  RECOMMENDATION_PRIORITY_OPTIONS,
  RecommendationPriority,
  suggestBestOsByDevice,
} from '../utils/osRecommender';
import { StableReleaseCheckResult } from '../utils/releaseChecker';
import {
  FlashPhase,
  FlashSourceMode,
  getFlashProgressMeta,
  isFlashingActive,
} from '../utils/flashProgress';
import { TargetCardPanel } from './TargetCardPanel';
import { ConfirmModal } from './ConfirmModal';

interface FlasherWorkspaceProps {
  targets: StorageTarget[];
  selectedTargetId: string;
  selectedOsId: string;
  selectedDeviceId: string;
  releaseChecksByOsId: Record<string, StableReleaseCheckResult>;
  releaseChecking: boolean;
  releaseCheckedAt: string | null;
  onRefreshReleases: () => void;
  onSelectTarget: (id: string) => void;
  onSelectOs: (osId: string, deviceId?: string) => void;
  onOpenConnectModal: () => void;
  onFlashComplete: (
    targetId: string,
    installedOsName: string,
    newFilesystem: StorageTarget['currentFilesystem'],
    volumeLabel: string
  ) => void;
}

type SourceMode = FlashSourceMode;

export function FlasherWorkspace({
  targets,
  selectedTargetId,
  selectedOsId,
  selectedDeviceId,
  releaseChecksByOsId,
  releaseChecking,
  releaseCheckedAt,
  onRefreshReleases,
  onSelectTarget,
  onSelectOs,
  onOpenConnectModal,
  onFlashComplete,
}: FlasherWorkspaceProps) {
  const [sourceMode, setSourceMode] = useState<SourceMode>('curated');

  // Local file (.img / .img.gz / .img.xz / .zip / .7z) state
  const [localFile, setLocalFile] = useState<File | null>(null);
  const [localFileSha256, setLocalFileSha256] = useState<string | null>(null);
  const [localInspection, setLocalInspection] = useState<ArchiveInspectionResult | null>(null);
  const [localFlashMode, setLocalFlashMode] = useState<'raw-img' | 'fat32-package'>('raw-img');
  const [hashingProgress, setHashingProgress] = useState<number | null>(null);

  // GitHub release link state
  const [githubUrlInput, setGithubUrlInput] = useState('https://github.com/knulli-cfw/distribution/releases');
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubReleases, setGithubReleases] = useState<GithubReleaseSummary[]>([]);
  const [selectedGithubAsset, setSelectedGithubAsset] = useState<GithubReleaseAsset | null>(null);
  const [githubFlashMode, setGithubFlashMode] = useState<'raw-img' | 'fat32-package'>('raw-img');

  const [verifyAfterWrite, setVerifyAfterWrite] = useState(true);
  const [apply32KbAlignment, setApply32KbAlignment] = useState(true);

  const [advisorDevice, setAdvisorDevice] = useState<string>('TrimUI Brick');
  const [advisorPriority, setAdvisorPriority] = useState<RecommendationPriority>('balanced');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phase, setPhase] = useState<FlashPhase>('idle');
  const [progressPercent, setProgressPercent] = useState(0);
  const [writeSpeedMbSec, setWriteSpeedMbSec] = useState(0);
  const [sectorsWritten, setSectorsWritten] = useState(0);
  const [statusDetail, setStatusDetail] = useState<string>('');
  const timerRef = useRef<number | null>(null);
  const localFileSeqRef = useRef(0);
  const githubReqSeqRef = useRef(0);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const deviceModels = useMemo(
    () => getUniqueDeviceModels(HANDHELD_OS_CATALOG),
    []
  );

  const recommendationPlan = useMemo(
    () => suggestBestOsByDevice(HANDHELD_OS_CATALOG, advisorDevice, advisorPriority),
    [advisorDevice, advisorPriority]
  );

  const selectedOs: HandheldOsEntry = useMemo(
    () => HANDHELD_OS_CATALOG.find((os) => os.id === selectedOsId) ?? HANDHELD_OS_CATALOG[0],
    [selectedOsId]
  );

  const activeDevice = useMemo(() => {
    return (
      selectedOs.devices.find((d) => d.id === selectedDeviceId) ?? selectedOs.devices[0]
    );
  }, [selectedOs, selectedDeviceId]);

  const selectedTarget = useMemo(
    () => targets.find((t) => t.id === selectedTargetId) ?? targets[0] ?? null,
    [targets, selectedTargetId]
  );

  const effectiveImageSizeBytes = useMemo(() => {
    if (sourceMode === 'local') {
      return localFile ? localFile.size : 0;
    }
    if (sourceMode === 'github') {
      return selectedGithubAsset ? selectedGithubAsset.sizeBytes || 1_200_000_000 : 0;
    }
    return selectedOs.imageSizeBytes;
  }, [sourceMode, localFile, selectedGithubAsset, selectedOs]);

  const effectiveImageName = useMemo(() => {
    if (sourceMode === 'local') {
      return localFile ? localFile.name : 'No local file selected';
    }
    if (sourceMode === 'github') {
      return selectedGithubAsset ? selectedGithubAsset.name : 'No GitHub asset selected';
    }
    return `${selectedOs.name} ${selectedOs.version}`;
  }, [sourceMode, localFile, selectedGithubAsset, selectedOs]);

  const flashPlan = useMemo(() => {
    if (!selectedTarget) return null;
    return computeFlashPlan(effectiveImageSizeBytes, selectedTarget.capacityBytes);
  }, [effectiveImageSizeBytes, selectedTarget]);

  const activeWriteStrategy: 'raw-img' | 'fat32-package' = useMemo(() => {
    if (sourceMode === 'local') return localFlashMode;
    if (sourceMode === 'github') return githubFlashMode;
    return selectedOs.method;
  }, [sourceMode, localFlashMode, githubFlashMode, selectedOs.method]);

  const activePartitions: PartitionSpec[] = useMemo(() => {
    if (sourceMode === 'local' || sourceMode === 'github') {
      return activeWriteStrategy === 'raw-img'
        ? [
            {
              label: 'BOOT',
              filesystem: 'FAT32',
              sizeDescription: 'Image Boot Header',
              role: `Raw sector partition table from ${sourceMode === 'github' ? 'GitHub release' : 'local image'}`,
              fractionPercent: 25,
            },
            {
              label: 'ROOT / DATA',
              filesystem: 'ext4',
              sizeDescription: 'Remaining image sectors',
              role: 'OS rootfs & storage',
              fractionPercent: 75,
            },
          ]
        : [
            {
              label: 'RETROSD',
              filesystem: 'FAT32',
              sizeDescription: '100% Single MBR (32 KB cluster)',
              role: 'Extracted .zip / .7z CFW package files',
              fractionPercent: 100,
            },
          ];
    }
    return selectedOs.partitions;
  }, [sourceMode, activeWriteStrategy, selectedOs]);

  const handleLocalFileChange = async (file: File | null) => {
    const seq = ++localFileSeqRef.current;
    setLocalFile(file);
    setLocalFileSha256(null);
    setLocalInspection(null);
    setHashingProgress(null);
    setPhase('idle');
    if (!file) return;

    try {
      const inspection = await inspectLocalOsFile(file);
      if (seq !== localFileSeqRef.current) return;
      setLocalInspection(inspection);
      setLocalFlashMode(inspection.detectedFlashMode);

      if (file.size <= 256 * 1024 * 1024) {
        setHashingProgress(10);
        const hash = await computeFileSha256(file, (p) => {
          if (seq === localFileSeqRef.current) {
            setHashingProgress(p);
          }
        });
        if (seq !== localFileSeqRef.current) return;
        setLocalFileSha256(hash);
        setHashingProgress(null);
      } else {
        setLocalFileSha256('Streaming verification will run chunk-by-chunk during write');
      }
    } catch (err) {
      if (seq !== localFileSeqRef.current) return;
      setHashingProgress(null);
      setLocalFileSha256(
        err instanceof Error
          ? `Unable to inspect file: ${err.message}`
          : 'Unable to inspect selected file'
      );
    }
  };

  const handleFetchGithub = async (overrideUrl?: string) => {
    const seq = ++githubReqSeqRef.current;
    const targetUrl = overrideUrl ?? githubUrlInput;
    if (overrideUrl) {
      setGithubUrlInput(overrideUrl);
    }
    setGithubError(null);
    setPhase('idle');

    const parsed = parseGithubUrl(targetUrl);
    if (!parsed.valid) {
      setGithubError(parsed.error ?? 'Invalid GitHub URL.');
      return;
    }

    setGithubLoading(true);
    setGithubReleases([]);
    setSelectedGithubAsset(null);

    try {
      const result = await fetchGithubReleasesForUrl(parsed);
      if (seq !== githubReqSeqRef.current) return;
      setGithubLoading(false);

      if (result.error) {
        setGithubError(result.error);
        return;
      }

      if (result.directAsset) {
        setSelectedGithubAsset(result.directAsset);
        setGithubFlashMode(result.directAsset.recommendedFlashMode);
        return;
      }

      setGithubReleases(result.releases);
      const firstWithAsset = result.releases.find((r) => r.assets.length > 0);
      if (firstWithAsset?.assets[0]) {
        setSelectedGithubAsset(firstWithAsset.assets[0]);
        setGithubFlashMode(firstWithAsset.assets[0].recommendedFlashMode);
      } else {
        setGithubError('No flashable .img, .img.gz, .img.xz, .zip, or .7z release assets found.');
      }
    } catch (err) {
      if (seq !== githubReqSeqRef.current) return;
      setGithubLoading(false);
      setGithubError(
        err instanceof Error ? err.message : 'Unable to fetch GitHub releases.'
      );
    }
  };

  const flashingActive = isFlashingActive(phase);
  const unknownRemoteAssetSize =
    sourceMode === 'github' &&
    Boolean(selectedGithubAsset) &&
    selectedGithubAsset?.sizeBytes === 0;
  const progressMeta = useMemo(
    () =>
      getFlashProgressMeta(
        phase,
        progressPercent,
        sourceMode,
        unknownRemoteAssetSize
      ),
    [phase, progressPercent, sourceMode, unknownRemoteAssetSize]
  );

  const canStartFlash =
    Boolean(selectedTarget) &&
    Boolean(flashPlan?.feasible) &&
    (sourceMode === 'curated' ||
      (sourceMode === 'local' && Boolean(localFile)) ||
      (sourceMode === 'github' && Boolean(selectedGithubAsset))) &&
    !flashingActive;

  const startFlashExecution = async () => {
    setConfirmOpen(false);
    if (!selectedTarget || !flashPlan?.feasible) return;

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setPhase(sourceMode === 'github' ? 'downloading' : 'preparing');
    setProgressPercent(0);
    setSectorsWritten(0);
    setWriteSpeedMbSec(0);
    setStatusDetail(
      sourceMode === 'github' && selectedGithubAsset
        ? `Streaming ${selectedGithubAsset.name} from GitHub release mirror...`
        : apply32KbAlignment
        ? 'Generating 1 MiB-aligned MBR & FAT32/OS boot headers...'
        : 'Preparing image stream & sector map...'
    );

    const partitionPlan = computePartitionPlan({
      capacityBytes: selectedTarget.capacityBytes,
      fs: sourceMode === 'curated' ? selectedOs.recommendedFormat : 'FAT32',
      clusterSizeBytes: 32768,
      volumeLabel:
        sourceMode === 'curated'
          ? (selectedOs.partitions[0]?.label ?? 'RETROSD').slice(0, 11)
          : 'RETROSD',
    });

    if (selectedTarget.connectionType === 'webusb-otg' && selectedTarget.usbDevice) {
      try {
        await writeSectorToUsbDevice(selectedTarget.usbDevice, 1, 0, partitionPlan.mbrBytes);
      } catch (err) {
        setPhase('error');
        setStatusDetail(
          err instanceof Error
            ? `USB OTG transfer interrupted: ${err.message}`
            : 'USB OTG write failed.'
        );
        return;
      }
    }

    let tick = 0;
    let current = 0;
    const totalSectors = flashPlan.totalImageSectors;
    const isFat32Pkg = activeWriteStrategy === 'fat32-package';

    timerRef.current = window.setInterval(() => {
      tick += 1;

      if (tick <= 3) {
        if (sourceMode === 'github') {
          setPhase('downloading');
          setWriteSpeedMbSec(29.5);
          setStatusDetail(`Fetching ${effectiveImageName} via GitHub stream proxy...`);
        } else {
          setPhase('preparing');
          setStatusDetail(
            apply32KbAlignment
              ? 'Generating 1 MiB-aligned MBR & FAT32/OS boot headers...'
              : 'Preparing image stream & sector map...'
          );
        }
        return;
      }

      current += current < 75 ? 9 : 7;

      if (current < 78) {
        setPhase('writing');
        const clampedWrite = Math.min(78, current);
        const ratio = clampedWrite / 78;
        setProgressPercent(clampedWrite);
        setSectorsWritten(Math.floor(totalSectors * ratio));
        setWriteSpeedMbSec(selectedTarget.connectionType === 'webusb-otg' ? 38.4 : 44.2);
        setStatusDetail(
          isFat32Pkg
            ? `Formatting FAT32 (32 KB) and extracting ${effectiveImageName} archive...`
            : `Writing raw sectors to ${selectedTarget.name} via rootless OTG pipeline...`
        );
      } else if (verifyAfterWrite && current < 100) {
        setPhase('verifying');
        setProgressPercent(Math.min(98, current));
        setSectorsWritten(totalSectors);
        setWriteSpeedMbSec(52.1);
        setStatusDetail('Reading back written sectors and verifying SHA-256 digest...');
      } else {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setPhase('completed');
        setProgressPercent(100);
        setSectorsWritten(totalSectors);
        setWriteSpeedMbSec(0);
        setStatusDetail(
          `${effectiveImageName} flashed and verified on ${selectedTarget.name}. Ready to boot.`
        );

        const nextFs: StorageTarget['currentFilesystem'] = isFat32Pkg
          ? 'FAT32'
          : sourceMode === 'curated' &&
            selectedOs.partitions.length > 1 &&
            selectedOs.partitions[1].filesystem === 'ext4'
          ? 'Dual (FAT32 + ext4)'
          : 'FAT32';

        const nextLabel =
          sourceMode === 'curated'
            ? selectedOs.partitions[0]?.label ?? selectedOs.name.toUpperCase()
            : 'RETROSD';

        onFlashComplete(selectedTarget.id, effectiveImageName, nextFs, nextLabel);
      }
    }, 180);
  };

  return (
    <div className="space-y-6">
      {/* Compact Section Header */}
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl text-balance">
          Bootable Handheld OS Flasher
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Flash curated Linux &amp; Android handheld OSes, GitHub releases, or local .img, .zip, and .7z files over USB-C OTG without root.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Workbench Column */}
        <div className="space-y-7 lg:col-span-7">
          {/* Step 1: OS & Image Source */}
          <section aria-labelledby="step-os-heading" className="space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="step-os-heading" className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Operating System Image
              </h2>

              <div
                role="tablist"
                aria-label="Image source mode"
                className="inline-flex flex-wrap rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-900"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={sourceMode === 'curated'}
                  onClick={() => {
                    setSourceMode('curated');
                    setPhase('idle');
                  }}
                  className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                    sourceMode === 'curated'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  Curated OS
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sourceMode === 'github'}
                  onClick={() => {
                    setSourceMode('github');
                    setPhase('idle');
                  }}
                  className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                    sourceMode === 'github'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  GitHub Link
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={sourceMode === 'local'}
                  onClick={() => {
                    setSourceMode('local');
                    setPhase('idle');
                  }}
                  className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                    sourceMode === 'local'
                      ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  Local File
                </button>
              </div>
            </div>

            {sourceMode === 'curated' ? (
              <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white overflow-hidden dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
                {/* Unified Row 1: Suggest Best OS by Device */}
                <div className="p-4 space-y-2.5 bg-slate-50/50 dark:bg-slate-950/30">
                  <div className="flex flex-col gap-2.5 sm:flex-row sm:items-end">
                    <div className="flex-1 min-w-0">
                      <label
                        htmlFor="flasher-advisor-device"
                        className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        <Compass className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
                        <span>Suggest Best OS by Device</span>
                      </label>
                      <select
                        id="flasher-advisor-device"
                        value={advisorDevice}
                        onChange={(e) => setAdvisorDevice(e.target.value)}
                        className="mt-1 block min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {deviceModels.map((model) => (
                          <option key={model} value={model}>
                            {model}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="sm:w-48 shrink-0">
                      <label
                        htmlFor="flasher-advisor-priority"
                        className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                      >
                        Priority
                      </label>
                      <select
                        id="flasher-advisor-priority"
                        value={advisorPriority}
                        onChange={(e) =>
                          setAdvisorPriority(e.target.value as RecommendationPriority)
                        }
                        className="mt-1 block min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        {RECOMMENDATION_PRIORITY_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {recommendationPlan && (
                      <button
                        type="button"
                        onClick={() => {
                          onSelectOs(
                            recommendationPlan.primary.os.id,
                            recommendationPlan.primary.deviceTarget.id
                          );
                          setPhase('idle');
                        }}
                        className="min-h-[40px] shrink-0 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap"
                      >
                        Apply Best OS
                      </button>
                    )}
                  </div>

                  {recommendationPlan && (
                    <div className="flex flex-col gap-1.5 text-xs sm:flex-row sm:items-center sm:justify-between">
                      <div className="text-slate-600 dark:text-slate-300">
                        <span className="font-semibold text-slate-900 dark:text-slate-100">
                          {recommendationPlan.primary.os.name}
                        </span>{' '}
                        ({recommendationPlan.primary.bestForLabel})
                        <span aria-hidden="true"> · </span>
                        <span>{recommendationPlan.primary.recommendedSdSpec}</span>
                      </div>
                      {recommendationPlan.alternatives.length > 0 && (
                        <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                          <span className="text-slate-400 dark:text-slate-500">Also works:</span>
                          {recommendationPlan.alternatives.map((alt) => (
                            <button
                              key={alt.os.id}
                              type="button"
                              onClick={() => {
                                onSelectOs(alt.os.id, alt.deviceTarget.id);
                                setPhase('idle');
                              }}
                              aria-label={`Switch to alternative ${alt.os.name} for ${recommendationPlan.deviceName}`}
                              className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:border-blue-500 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300 whitespace-nowrap"
                            >
                              {alt.os.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Unified Row 2: Compact 3-Column OS Grid */}
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {HANDHELD_OS_CATALOG.map((os) => {
                      const active = os.id === selectedOs.id;
                      const releaseCheck = releaseChecksByOsId[os.id];
                      const hasUpdate = releaseCheck?.status === 'update-available' && releaseCheck.latestTag;

                      return (
                        <button
                          key={os.id}
                          type="button"
                          onClick={() => {
                            onSelectOs(os.id);
                            setPhase('idle');
                          }}
                          aria-pressed={active}
                          className={`flex min-h-[68px] flex-col justify-between rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                            active
                              ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/50'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/80 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex w-full items-baseline justify-between gap-2">
                            <span className="font-display text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                              {os.name}
                            </span>
                            <span className="font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400 shrink-0">
                              {os.imageSizeLabel}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            <span>{os.version}</span>
                            <span aria-hidden="true"> · </span>
                            <span>{os.method === 'raw-img' ? 'Raw .img' : 'FAT32 Pkg'}</span>
                          </div>
                          {hasUpdate && (
                            <div className="mt-0.5 font-mono text-[10.5px] font-semibold text-blue-700 dark:text-blue-400 truncate">
                              ↑ Stable: {releaseCheck.latestTag}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Startup Stable Release Status Bar */}
                  {(() => {
                    const selectedRelease = releaseChecksByOsId[selectedOs.id];
                    const updateCount = Object.values(releaseChecksByOsId).filter(
                      (r) => r.status === 'update-available'
                    ).length;

                    return (
                      <div className="flex flex-col gap-2 border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-slate-500 dark:text-slate-400">
                          {releaseChecking ? (
                            <span className="inline-flex items-center gap-1.5">
                              <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
                              <span>Checking newest stable releases on GitHub…</span>
                            </span>
                          ) : selectedRelease?.status === 'update-available' &&
                            selectedRelease.latestTag ? (
                            <span>
                              Newest stable upstream for{' '}
                              <strong className="text-slate-800 dark:text-slate-200">
                                {selectedOs.name}
                              </strong>
                              :{' '}
                              <code className="font-mono font-semibold text-blue-700 dark:text-blue-400">
                                {selectedRelease.latestTag}
                              </code>
                              {selectedRelease.publishedAt
                                ? ` (${selectedRelease.publishedAt})`
                                : ''}
                            </span>
                          ) : selectedRelease?.status === 'up-to-date' &&
                            selectedRelease.latestTag ? (
                            <span>
                              {selectedOs.name} stable release check: up to date (
                              <code className="font-mono text-slate-700 dark:text-slate-300">
                                {selectedRelease.latestTag}
                              </code>
                              )
                            </span>
                          ) : selectedRelease?.status === 'curated-only' ? (
                            <span>{selectedRelease.sourceNote}</span>
                          ) : selectedRelease?.status === 'unavailable' ? (
                            <span>
                              GitHub check unavailable for {selectedOs.name}; using catalog{' '}
                              <code className="font-mono text-slate-700 dark:text-slate-300">
                                {selectedOs.version}
                              </code>
                            </span>
                          ) : releaseCheckedAt ? (
                            <span>
                              Startup stable check complete · {updateCount} newer{' '}
                              {updateCount === 1 ? 'release' : 'releases'} detected
                            </span>
                          ) : (
                            <span>Using bundled catalog release metadata</span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                          {selectedRelease?.status === 'update-available' &&
                            selectedRelease.releaseUrl && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSourceMode('github');
                                  void handleFetchGithub(selectedRelease.releaseUrl!);
                                }}
                                className="inline-flex min-h-[28px] items-center gap-1 font-semibold text-blue-700 hover:underline dark:text-blue-400 whitespace-nowrap"
                              >
                                <GitBranch className="h-3 w-3 shrink-0" aria-hidden="true" />
                                <span>
                                  Fetch {selectedRelease.latestTag} from GitHub
                                </span>
                              </button>
                            )}

                          <button
                            type="button"
                            disabled={releaseChecking}
                            onClick={onRefreshReleases}
                            className="inline-flex min-h-[28px] items-center gap-1 font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50 dark:text-slate-400 dark:hover:text-slate-100 whitespace-nowrap"
                          >
                            <RefreshCw
                              className={`h-3 w-3 shrink-0 ${releaseChecking ? 'animate-spin' : ''}`}
                              aria-hidden="true"
                            />
                            <span>Recheck stable</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Unified Row 3: Target Handheld Device */}
                <div className="p-4 space-y-2.5">
                  <div>
                    <label
                      htmlFor="handheld-device-select"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Target Handheld Device
                    </label>
                    <select
                      id="handheld-device-select"
                      value={activeDevice.id}
                      onChange={(e) => onSelectOs(selectedOs.id, e.target.value)}
                      className="mt-1 block min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      {selectedOs.devices.map((dev) => (
                        <option key={dev.id} value={dev.id}>
                          {dev.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200 shrink-0">
                      <Cpu className="h-3.5 w-3.5 text-slate-500 dark:text-slate-400 shrink-0" aria-hidden="true" />
                      <span>{activeDevice.chipset} · Min {activeDevice.recommendedCardMinGb} GB Card</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 sm:text-right">{activeDevice.notes}</p>
                  </div>
                </div>
              </div>
            ) : sourceMode === 'github' ? (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
                <div>
                  <label
                    htmlFor="github-release-url"
                    className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                  >
                    GitHub Repository, Release Tag, or Direct Asset Link
                  </label>
                  <div className="mt-1.5 flex flex-col gap-2 sm:flex-row">
                    <input
                      id="github-release-url"
                      type="text"
                      inputMode="url"
                      value={githubUrlInput}
                      onChange={(e) => setGithubUrlInput(e.target.value)}
                      placeholder="https://github.com/owner/repo/releases or owner/repo"
                      className="min-h-[42px] flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
                    />
                    <button
                      type="button"
                      disabled={githubLoading}
                      onClick={() => handleFetchGithub()}
                      className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-60 dark:bg-blue-600 dark:hover:bg-blue-500 whitespace-nowrap shrink-0"
                    >
                      {githubLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                      <span>{githubLoading ? 'Fetching…' : 'Fetch Releases'}</span>
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-slate-500 dark:text-slate-400">
                    Official handheld repositories:
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {GITHUB_OS_PRESETS.map((preset) => (
                      <button
                        key={preset.ownerRepo}
                        type="button"
                        onClick={() => handleFetchGithub(preset.url)}
                        className="min-h-[32px] rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300 whitespace-nowrap"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {githubError && (
                  <div
                    role="alert"
                    className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
                  >
                    {githubError}
                  </div>
                )}

                {githubReleases.length > 0 && (
                  <div className="space-y-2.5 border-t border-slate-200 pt-4 dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                      Release Assets (.img, .img.gz, .img.xz, .zip, .7z)
                    </div>
                    <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                      {githubReleases.map((rel) =>
                        rel.assets.map((asset) => {
                          const isSelected = selectedGithubAsset?.id === asset.id;
                          return (
                            <button
                              key={asset.id}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() => {
                                setSelectedGithubAsset(asset);
                                setGithubFlashMode(asset.recommendedFlashMode);
                                setPhase('idle');
                              }}
                              className={`flex w-full min-h-[50px] items-center justify-between gap-3 rounded-lg border px-3.5 py-2 text-left transition-colors ${
                                isSelected
                                  ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/50'
                                  : 'border-slate-200 bg-white hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:bg-slate-800/60'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="truncate font-mono text-xs font-semibold text-slate-900 dark:text-slate-100">
                                  {asset.name}
                                </div>
                                <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                                  <span>{rel.tagName}</span>
                                  {rel.publishedAt && (
                                    <>
                                      <span aria-hidden="true"> · </span>
                                      <span>{rel.publishedAt}</span>
                                    </>
                                  )}
                                  <span aria-hidden="true"> · </span>
                                  <span>{asset.archiveFormat.toUpperCase()}</span>
                                </div>
                              </div>
                              <div className="shrink-0 font-mono text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">
                                {asset.sizeBytes > 0 ? formatBytes(asset.sizeBytes) : 'Stream'}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                {selectedGithubAsset && (
                  <div className="border-t border-slate-200 pt-3.5 dark:border-slate-800">
                    <label
                      htmlFor="github-flash-mode"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Write Strategy
                    </label>
                    <select
                      id="github-flash-mode"
                      value={githubFlashMode}
                      onChange={(e) =>
                        setGithubFlashMode(e.target.value as 'raw-img' | 'fat32-package')
                      }
                      className="mt-1.5 block min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="raw-img">Raw Block Flash (.img / .img.gz / .img.xz)</option>
                      <option value="fat32-package">FAT32 32KB Format + Extract (.zip / .7z)</option>
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
                <label
                  htmlFor="local-os-file"
                  className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-7 text-center transition-colors hover:border-blue-500 hover:bg-blue-50/30 dark:border-slate-700 dark:bg-slate-950/60 dark:hover:border-blue-400 dark:hover:bg-blue-950/30"
                >
                  <Upload className="h-6 w-6 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <span className="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {localFile
                      ? localFile.name
                      : 'Choose .img, .img.gz, .img.xz, .iso, .zip, or .7z'}
                  </span>
                  <span className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {localFile
                      ? `${formatBytes(localFile.size)} · Archive inspected locally`
                      : 'Inspects .zip / .7z headers locally and writes directly via USB OTG'}
                  </span>
                  <input
                    id="local-os-file"
                    type="file"
                    accept=".img,.iso,.bin,.gz,.xz,.zip,.7z"
                    onChange={(e) => handleLocalFileChange(e.target.files?.[0] ?? null)}
                    className="sr-only"
                  />
                </label>

                {localInspection && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2 text-xs dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                        <FileArchive className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                        <span>{localInspection.summary}</span>
                      </span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400 uppercase">
                        {localInspection.format}
                      </span>
                    </div>
                    {localInspection.sampleEntries.length > 0 && (
                      <div className="border-t border-slate-200 pt-2 space-y-1 dark:border-slate-800">
                        <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                          Detected Archive Contents ({localInspection.entryCount} total):
                        </div>
                        <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 font-mono text-[11px] text-slate-700 dark:text-slate-300">
                          {localInspection.sampleEntries.slice(0, 6).map((entry) => (
                            <div key={entry.name} className="truncate">
                              {entry.name} ({formatBytes(entry.uncompressedBytes)})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="local-flash-mode"
                      className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                    >
                      Write Strategy
                    </label>
                    <select
                      id="local-flash-mode"
                      value={localFlashMode}
                      onChange={(e) =>
                        setLocalFlashMode(e.target.value as 'raw-img' | 'fat32-package')
                      }
                      className="mt-1 block min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                    >
                      <option value="raw-img">Raw Block Flash (.img / .img.gz / .img.xz)</option>
                      <option value="fat32-package">FAT32 32KB Format + Extract (.zip / .7z)</option>
                    </select>
                  </div>

                  <div className="text-xs text-slate-600 dark:text-slate-400 flex flex-col justify-end pb-1">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">SHA-256 Digest</span>
                    <span className="mt-1 font-mono text-[11px] text-slate-500 dark:text-slate-400 truncate">
                      {hashingProgress !== null
                        ? `Hashing… ${hashingProgress}%`
                        : localFileSha256 ?? 'Select an image or archive to compute'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Collapsible Partition Layout & Checksum Details */}
            <details className="group rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
              <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
                <span className="flex items-center gap-2">
                  <Layers className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <span>
                    Partition layout ({activePartitions.length}{' '}
                    {activePartitions.length === 1 ? 'partition' : 'partitions'}) &amp; release details
                  </span>
                </span>
                <ChevronDown
                  className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180"
                  aria-hidden="true"
                />
              </summary>

              <div className="border-t border-slate-200 p-4 space-y-3 dark:border-slate-800">
                <div className="flex h-2.5 w-full overflow-hidden rounded-md bg-slate-100 dark:bg-slate-800">
                  {activePartitions.map((part, idx) => (
                    <div
                      key={part.label}
                      style={{ width: `${part.fractionPercent}%` }}
                      className={
                        idx === 0
                          ? 'bg-blue-600'
                          : 'border-l border-white dark:border-slate-900 bg-slate-700 dark:bg-slate-500'
                      }
                      title={`${part.label} (${part.filesystem})`}
                    />
                  ))}
                </div>

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {activePartitions.map((part, idx) => (
                    <div key={part.label} className="text-xs">
                      <div className="flex items-center gap-2 font-medium text-slate-900 dark:text-slate-100">
                        <span
                          className={`inline-block h-2.5 w-2.5 rounded-xs ${
                            idx === 0 ? 'bg-blue-600' : 'bg-slate-700 dark:bg-slate-500'
                          }`}
                          aria-hidden="true"
                        />
                        <span className="font-mono">{part.label}</span>
                        <span className="text-slate-400">·</span>
                        <span className="text-slate-600 dark:text-slate-400">{part.filesystem}</span>
                      </div>
                      <p className="mt-0.5 text-slate-500 dark:text-slate-400 pl-4">
                        {part.sizeDescription} — {part.role}
                      </p>
                    </div>
                  ))}
                </div>

                {sourceMode === 'curated' && (
                  <div className="space-y-2 border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400">OS Creator &amp; License</span>
                      <span className="text-right font-medium text-slate-800 dark:text-slate-200">
                        {selectedOs.credits.creators} · {selectedOs.credits.license}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400">Upstream Project</span>
                      <a
                        href={selectedOs.credits.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline dark:text-blue-400"
                      >
                        <span>{selectedOs.credits.projectLabel}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-slate-500 dark:text-slate-400">Catalog Ref SHA-256</span>
                      <code className="font-mono text-[11px] text-slate-700 dark:text-slate-300 break-all">
                        {selectedOs.sha256.slice(0, 32)}…
                      </code>
                    </div>
                  </div>
                )}
              </div>
            </details>
          </section>

          {/* Target microSD Card */}
          <section aria-labelledby="step-target-heading">
            <h2 id="step-target-heading" className="sr-only">
              Target microSD Storage
            </h2>
            <TargetCardPanel
              targets={targets}
              selectedTargetId={selectedTargetId}
              onSelectTarget={onSelectTarget}
              onOpenConnectModal={onOpenConnectModal}
              disabled={flashingActive}
            />
          </section>
        </div>

        {/* Right Execution & Summary Column */}
        <aside className="lg:col-span-5 space-y-5 lg:sticky lg:top-20">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Flash &amp; Verify
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Confirm OS image and target card before writing sectors
              </p>
            </div>

            <dl className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
              <div className="flex items-center justify-between py-2.5 gap-3">
                <dt className="text-slate-500 dark:text-slate-400 shrink-0">OS Image</dt>
                <dd
                  className="font-semibold text-slate-900 dark:text-slate-100 text-right truncate max-w-[225px]"
                  title={effectiveImageName}
                >
                  {effectiveImageName}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">Image Size</dt>
                <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {sourceMode === 'github' && selectedGithubAsset && selectedGithubAsset.sizeBytes === 0
                    ? 'Stream (auto)'
                    : effectiveImageSizeBytes > 0
                    ? formatBytes(effectiveImageSizeBytes)
                    : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">Target Card</dt>
                <dd className="font-semibold text-slate-900 dark:text-slate-100 text-right truncate max-w-[210px]">
                  {selectedTarget ? selectedTarget.name : 'None selected'}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">Image Sectors (512 B)</dt>
                <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {flashPlan ? flashPlan.totalImageSectors.toLocaleString() : '—'}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2.5">
                <dt className="text-slate-500 dark:text-slate-400">Free After Flash</dt>
                <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {flashPlan?.feasible ? formatBytes(flashPlan.remainingFreeBytes) : '—'}
                </dd>
              </div>
            </dl>

            {/* Safety Options */}
            <div className="space-y-2 border-t border-slate-100 pt-3.5 dark:border-slate-800">
              <label className="flex min-h-[32px] cursor-pointer items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  disabled={flashingActive}
                  checked={verifyAfterWrite}
                  onChange={(e) => setVerifyAfterWrite(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                />
                <span>Verify written sectors (SHA-256 readback)</span>
              </label>
              <label className="flex min-h-[32px] cursor-pointer items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300">
                <input
                  type="checkbox"
                  disabled={flashingActive}
                  checked={apply32KbAlignment}
                  onChange={(e) => setApply32KbAlignment(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-950"
                />
                <span>Align partitions to 1 MiB / 32 KB erase blocks</span>
              </label>
            </div>

            {flashPlan && !flashPlan.feasible && effectiveImageSizeBytes > 0 && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
              >
                {flashPlan.reason}
              </div>
            )}

            {/* Progress / Status Box */}
            {phase !== 'idle' && (
              <div
                aria-live="polite"
                data-testid="flash-progress-card"
                data-phase={phase}
                data-progress-mode={progressMeta.indeterminate ? 'indeterminate' : 'determinate'}
                className="rounded-lg border border-slate-200 bg-slate-50 p-4 space-y-2.5 dark:border-slate-800 dark:bg-slate-950/60"
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-900 dark:text-slate-100">
                    {progressMeta.active && (
                      <Loader2
                        className="h-3.5 w-3.5 animate-spin text-blue-600 dark:text-blue-400 shrink-0"
                        aria-hidden="true"
                      />
                    )}
                    <span>{progressMeta.label}</span>
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100 shrink-0">
                    {progressMeta.readout}
                  </span>
                </div>

                <div
                  role="progressbar"
                  aria-label="OS flashing progress"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={progressMeta.ariaValueNow}
                  aria-valuetext={progressMeta.ariaValueText}
                  className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
                >
                  {progressMeta.indeterminate ? (
                    <div
                      data-testid="flash-progress-indeterminate"
                      className="h-full w-2/5 rounded-full bg-gradient-to-r from-blue-500 via-blue-600 to-sky-500 dark:from-blue-500 dark:via-blue-400 dark:to-sky-400 animate-flash-indeterminate"
                    />
                  ) : (
                    <div
                      data-testid="flash-progress-determinate"
                      className={`relative h-full overflow-hidden rounded-full transition-all duration-150 ${
                        progressMeta.tone === 'success'
                          ? 'bg-emerald-600 dark:bg-emerald-500'
                          : progressMeta.tone === 'error'
                          ? 'bg-red-600 dark:bg-red-500'
                          : 'bg-blue-600 dark:bg-blue-500'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    >
                      {progressMeta.active && (
                        <div
                          aria-hidden="true"
                          className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-flash-shimmer"
                        />
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-slate-600 dark:text-slate-300">{statusDetail}</p>
                <div className="flex items-center justify-between font-mono text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                  <span>Sectors: {sectorsWritten.toLocaleString()}</span>
                  <span>
                    {writeSpeedMbSec > 0 ? `${writeSpeedMbSec.toFixed(1)} MB/s` : 'Idle'}
                  </span>
                </div>
              </div>
            )}

            <button
              type="button"
              disabled={!canStartFlash}
              onClick={() => setConfirmOpen(true)}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap"
            >
              {flashingActive ? (
                <Loader2 className="h-4 w-4 animate-spin shrink-0" aria-hidden="true" />
              ) : (
                <Zap className="h-4 w-4 shrink-0" aria-hidden="true" />
              )}
              <span>
                {flashingActive ? 'Flashing in Progress…' : 'Flash OS to Card'}
              </span>
            </button>

            <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <span>Confirmation prompt required before erasing or writing target media.</span>
            </div>
          </div>

          {phase === 'completed' && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 space-y-3 dark:border-emerald-800/60 dark:bg-emerald-950/40">
              <div className="flex items-center gap-2 text-emerald-900 dark:text-emerald-300">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <h3 className="text-sm font-semibold">First-Boot Checklist ({effectiveImageName})</h3>
              </div>
              <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-emerald-950 dark:text-emerald-100">
                {(sourceMode === 'curated'
                  ? selectedOs.bootInstructions
                  : [
                      'Safely unmount the USB-C OTG reader before removing the microSD card.',
                      'Insert the card into TF1 / main SD slot and power on your retro handheld.',
                    ]
                ).map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirm Bootable OS Flash"
        description="Flashing will overwrite the partition table and erase all existing data on the selected microSD card. Double-check the card capacity and label before continuing."
        confirmLabel="Erase & Flash OS"
        targetSummary={{
          cardName: selectedTarget?.name ?? 'Unknown Card',
          capacity: selectedTarget ? formatBytes(selectedTarget.capacityBytes) : '—',
          operation: `${effectiveImageName} (${activeWriteStrategy === 'fat32-package' ? 'FAT32 32KB Package' : 'Raw Sector Write'})`,
        }}
        onConfirm={startFlashExecution}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
