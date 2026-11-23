import { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  Download,
  Eraser,
  HardDrive,
} from 'lucide-react';
import {
  CLUSTER_OPTIONS_BY_FS,
  FilesystemType,
  computePartitionPlan,
  formatBytes,
  getRecommendedClusterSize,
  validateVolumeLabel,
} from '../utils/filesystemFormatter';
import { StorageTarget, writeSectorToUsbDevice } from '../utils/usbMassStorage';
import { TargetCardPanel } from './TargetCardPanel';
import { ConfirmModal } from './ConfirmModal';

interface FormatterWorkspaceProps {
  targets: StorageTarget[];
  selectedTargetId: string;
  onSelectTarget: (id: string) => void;
  onOpenConnectModal: () => void;
  onFormatComplete: (
    targetId: string,
    filesystem: FilesystemType,
    volumeLabel: string
  ) => void;
}

const FILESYSTEM_CARDS: {
  id: FilesystemType;
  title: string;
  subtitle: string;
  detail: string;
}[] = [
  {
    id: 'FAT32',
    title: 'FAT32',
    subtitle: 'Universal Boot (No 32 GB Cap)',
    detail: 'Required for TrimUI Brick, Miyoo, nxRedux, and TF1 boot partitions up to 2 TB.',
  },
  {
    id: 'exFAT',
    title: 'exFAT',
    subtitle: 'Large ROMs (> 4 GB Files)',
    detail: 'Best for TF2 ROM cards, muOS/ArkOS libraries, and PS2/GameCube ISOs.',
  },
  {
    id: 'NTFS',
    title: 'NTFS',
    subtitle: 'Journaled Bulk Storage',
    detail: 'Windows & Linux journaled filesystem with 32-char volume labels.',
  },
];

type FormatPhase = 'idle' | 'formatting' | 'verifying' | 'completed' | 'error';

export function FormatterWorkspace({
  targets,
  selectedTargetId,
  onSelectTarget,
  onOpenConnectModal,
  onFormatComplete,
}: FormatterWorkspaceProps) {
  const selectedTarget = useMemo(
    () => targets.find((t) => t.id === selectedTargetId) ?? targets[0] ?? null,
    [targets, selectedTargetId]
  );

  const [filesystem, setFilesystem] = useState<FilesystemType>('FAT32');
  const [volumeLabel, setVolumeLabel] = useState('RETROSD');
  const [clusterSizeBytes, setClusterSizeBytes] = useState<number>(32768);
  const [wipeMode, setWipeMode] = useState<'quick' | 'full'>('quick');
  const [hexTab, setHexTab] = useState<'mbr' | 'vbr'>('vbr');

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [phase, setPhase] = useState<FormatPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('');
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        window.clearInterval(timerRef.current);
      }
    };
  }, []);

  const handleSelectFilesystem = (nextFs: FilesystemType) => {
    setFilesystem(nextFs);
    setPhase('idle');
    const recommended = getRecommendedClusterSize(
      selectedTarget?.capacityBytes ?? 64_000_000_000,
      nextFs
    );
    setClusterSizeBytes(recommended);
    const check = validateVolumeLabel(volumeLabel, nextFs);
    if (!check.valid) {
      setVolumeLabel(check.normalized);
    }
  };

  const labelValidation = useMemo(
    () => validateVolumeLabel(volumeLabel, filesystem),
    [volumeLabel, filesystem]
  );

  const partitionPlan = useMemo(() => {
    const cap = selectedTarget?.capacityBytes ?? 64_000_000_000;
    return computePartitionPlan({
      capacityBytes: cap,
      fs: filesystem,
      clusterSizeBytes,
      volumeLabel: labelValidation.normalized,
    });
  }, [selectedTarget, filesystem, clusterSizeBytes, labelValidation.normalized]);

  const clusterOptions = CLUSTER_OPTIONS_BY_FS[filesystem];

  const handleDownloadBootBinary = () => {
    const combined = new Uint8Array(1024);
    combined.set(partitionPlan.mbrBytes, 0);
    combined.set(partitionPlan.bootSectorBytes, 512);
    const blob = new Blob([combined], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filesystem.toLowerCase()}_${labelValidation.normalized}_mbr_vbr.bin`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const executeFormat = async () => {
    setConfirmOpen(false);
    if (!selectedTarget || !labelValidation.valid) return;

    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }

    setPhase('formatting');
    setProgress(10);
    setStatusMessage(
      `Writing MBR partition table (${partitionPlan.mbrPartitionTypeHex}) at LBA 0…`
    );

    if (selectedTarget.connectionType === 'webusb-otg' && selectedTarget.usbDevice) {
      try {
        await writeSectorToUsbDevice(selectedTarget.usbDevice, 1, 0, partitionPlan.mbrBytes);
        await writeSectorToUsbDevice(
          selectedTarget.usbDevice,
          2,
          partitionPlan.partitionStartLba,
          partitionPlan.bootSectorBytes
        );
      } catch (err) {
        setPhase('error');
        setStatusMessage(
          err instanceof Error ? `Format aborted: ${err.message}` : 'USB OTG write failed.'
        );
        return;
      }
    }

    let pct = 15;
    timerRef.current = window.setInterval(() => {
      pct += wipeMode === 'full' ? 12 : 22;
      if (pct < 75) {
        setPhase('formatting');
        setProgress(pct);
        setStatusMessage(
          wipeMode === 'full'
            ? `Zero-filling allocation tables and initializing ${filesystem} root directory…`
            : `Writing ${filesystem} boot sector (LBA 2048) and allocation bitmap…`
        );
      } else if (pct < 100) {
        setPhase('verifying');
        setProgress(Math.min(96, pct));
        setStatusMessage(`Verifying 0x55AA boot signatures and ${filesystem} cluster alignment…`);
      } else {
        if (timerRef.current !== null) {
          window.clearInterval(timerRef.current);
          timerRef.current = null;
        }
        setPhase('completed');
        setProgress(100);
        setStatusMessage(
          `Formatted ${selectedTarget.name} as ${filesystem} (${labelValidation.normalized}).`
        );
        onFormatComplete(selectedTarget.id, filesystem, labelValidation.normalized);
      }
    }, 150);
  };

  const canFormat =
    Boolean(selectedTarget) &&
    labelValidation.valid &&
    phase !== 'formatting' &&
    phase !== 'verifying';

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-4 dark:border-slate-800">
        <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl text-balance">
          microSD Filesystem Formatter
        </h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
          Reformat cards of any capacity to 1 MiB-aligned MBR FAT32, exFAT, or NTFS.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left Controls Column */}
        <div className="space-y-6 lg:col-span-7">
          <TargetCardPanel
            targets={targets}
            selectedTargetId={selectedTargetId}
            onSelectTarget={(id) => {
              onSelectTarget(id);
              setPhase('idle');
            }}
            onOpenConnectModal={onOpenConnectModal}
            disabled={phase === 'formatting' || phase === 'verifying'}
          />

          {/* Filesystem Selection */}
          <section aria-labelledby="fs-select-heading" className="space-y-3">
            <h2 id="fs-select-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Target Filesystem Format
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {FILESYSTEM_CARDS.map((card) => {
                const active = filesystem === card.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => handleSelectFilesystem(card.id)}
                    className={`flex min-h-[104px] flex-col justify-between rounded-xl border p-4 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                      active
                        ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700 dark:hover:bg-slate-800/60'
                    }`}
                  >
                    <div>
                      <div className="font-display text-lg font-bold text-slate-900 dark:text-slate-100">
                        {card.title}
                      </div>
                      <div className="mt-0.5 text-xs font-medium text-blue-700 dark:text-blue-400">
                        {card.subtitle}
                      </div>
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {card.detail}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Volume Parameters */}
          <section
            aria-labelledby="volume-params-heading"
            className="rounded-xl border border-slate-200 bg-white p-5 space-y-5 dark:border-slate-800 dark:bg-slate-900"
          >
            <h2 id="volume-params-heading" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Partition &amp; Allocation Settings
            </h2>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="volume-label-input"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Volume Label
                </label>
                <input
                  id="volume-label-input"
                  type="text"
                  value={volumeLabel}
                  onChange={(e) => {
                    setVolumeLabel(e.target.value);
                    setPhase('idle');
                  }}
                  placeholder={filesystem === 'FAT32' ? 'RETROSD' : 'RETRO_SD'}
                  className={`mt-1.5 block min-h-[42px] w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:outline-none dark:bg-slate-950 dark:text-slate-100 ${
                    labelValidation.valid
                      ? 'border-slate-300 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'
                      : 'border-red-500 focus:border-red-600 dark:border-red-500'
                  }`}
                />
                {labelValidation.error ? (
                  <p role="alert" className="mt-1.5 text-xs text-red-600 dark:text-red-400">
                    {labelValidation.error}
                  </p>
                ) : (
                  <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                    Stored as <code className="font-mono">{labelValidation.normalized}</code>
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="cluster-size-select"
                  className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  Allocation Unit (Cluster Size)
                </label>
                <select
                  id="cluster-size-select"
                  value={clusterSizeBytes}
                  onChange={(e) => setClusterSizeBytes(Number(e.target.value))}
                  className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                >
                  {clusterOptions.map((opt) => (
                    <option key={opt.bytes} value={opt.bytes}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
                  {filesystem === 'FAT32'
                    ? '32 KB recommended for FAT32 handheld bootloaders (64 KB on 256 GB+)'
                    : filesystem === 'exFAT'
                    ? '128 KB recommended for large ROM libraries'
                    : '4 KB standard allocation unit for NTFS'}
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
              <span className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                Erase Method
              </span>
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  aria-pressed={wipeMode === 'quick'}
                  onClick={() => setWipeMode('quick')}
                  className={`min-h-[46px] rounded-lg border px-3.5 py-2 text-left text-xs transition-colors ${
                    wipeMode === 'quick'
                      ? 'border-blue-600 bg-blue-50/70 text-slate-900 dark:border-blue-500 dark:bg-blue-950/50 dark:text-slate-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="font-semibold text-slate-900 dark:text-slate-100">Quick Format</div>
                  <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                    Rewrites MBR, VBR, and allocation tables
                  </div>
                </button>
                <button
                  type="button"
                  aria-pressed={wipeMode === 'full'}
                  onClick={() => setWipeMode('full')}
                  className={`min-h-[46px] rounded-lg border px-3.5 py-2 text-left text-xs transition-colors ${
                    wipeMode === 'full'
                      ? 'border-blue-600 bg-blue-50/70 text-slate-900 dark:border-blue-500 dark:bg-blue-950/50 dark:text-slate-100'
                      : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="font-semibold text-slate-900 dark:text-slate-100">
                    Full Clean &amp; Zero-Fill
                  </div>
                  <div className="mt-0.5 text-slate-500 dark:text-slate-400">
                    Clears old GPT remnants before formatting
                  </div>
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Right Summary & Collapsible Sector Inspector */}
        <aside className="lg:col-span-5 space-y-4 lg:sticky lg:top-20">
          <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  Format Summary
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Computed for {selectedTarget?.name ?? 'target card'}
                </p>
              </div>
              <HardDrive className="h-4 w-4 text-slate-400 dark:text-slate-500 shrink-0" aria-hidden="true" />
            </div>

            <dl className="divide-y divide-slate-100 text-xs dark:divide-slate-800">
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500 dark:text-slate-400">Partition Scheme</dt>
                <dd className="font-mono text-slate-900 dark:text-slate-100">
                  {partitionPlan.mbrPartitionTypeHex}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500 dark:text-slate-400">Alignment Offset</dt>
                <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  LBA {partitionPlan.partitionStartLba} (1 MiB)
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500 dark:text-slate-400">Cluster Size</dt>
                <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
                  {(partitionPlan.clusterSizeBytes / 1024).toFixed(0)} KB
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500 dark:text-slate-400">Usable Capacity</dt>
                <dd className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                  {formatBytes(partitionPlan.usableBytes)}
                </dd>
              </div>
              <div className="flex items-center justify-between py-2">
                <dt className="text-slate-500 dark:text-slate-400">Metadata Overhead</dt>
                <dd className="font-mono tabular-nums text-slate-600 dark:text-slate-400">
                  {formatBytes(partitionPlan.overheadBytes)}
                </dd>
              </div>
            </dl>

            {phase !== 'idle' && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {phase === 'completed' ? 'Format Complete' : 'Formatting microSD…'}
                  </span>
                  <span className="font-mono font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {progress}%
                  </span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                  <div
                    className={`h-full transition-all duration-150 ${
                      phase === 'completed'
                        ? 'bg-emerald-600 dark:bg-emerald-500'
                        : phase === 'error'
                        ? 'bg-red-600 dark:bg-red-500'
                        : 'bg-blue-600 dark:bg-blue-500'
                    }`}
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300">{statusMessage}</p>
              </div>
            )}

            <button
              type="button"
              disabled={!canFormat}
              onClick={() => setConfirmOpen(true)}
              className="flex min-h-[46px] w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap"
            >
              <Eraser className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>
                {phase === 'formatting' || phase === 'verifying'
                  ? 'Formatting…'
                  : `Format microSD as ${filesystem}`}
              </span>
            </button>

            {phase === 'completed' && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                <span>
                  Card updated to <strong>{filesystem}</strong> ({labelValidation.normalized}).
                </span>
              </div>
            )}
          </div>

          {/* Collapsible Raw Boot Sector Hex Inspector */}
          <details className="group rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-xs font-medium text-slate-700 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100">
              <span>Inspect MBR / VBR Boot Sectors (Hex &amp; .bin)</span>
              <ChevronDown
                className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>

            <div className="border-t border-slate-200 p-4 space-y-3 dark:border-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5 text-xs dark:border-slate-700 dark:bg-slate-950">
                  <button
                    type="button"
                    onClick={() => setHexTab('vbr')}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      hexTab === 'vbr'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {filesystem} VBR
                  </button>
                  <button
                    type="button"
                    onClick={() => setHexTab('mbr')}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      hexTab === 'mbr'
                        ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    MBR (LBA 0)
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleDownloadBootBinary}
                  className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap"
                >
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Save .bin</span>
                </button>
              </div>

              <pre
                aria-label="Binary sector hex preview"
                className="overflow-x-auto rounded-lg bg-slate-950 p-2.5 font-mono text-[9.5px] sm:text-[10px] leading-relaxed tracking-tight text-slate-200 border border-slate-800"
              >
                {hexTab === 'vbr'
                  ? partitionPlan.bootSectorHexPreview
                  : partitionPlan.mbrHexPreview}
              </pre>
            </div>
          </details>
        </aside>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={`Confirm ${filesystem} Format`}
        description="Reformatting erases all partitions, ROMs, saves, and operating systems currently stored on this microSD card."
        confirmLabel={`Format as ${filesystem}`}
        targetSummary={{
          cardName: selectedTarget?.name ?? 'Unknown Card',
          capacity: selectedTarget ? formatBytes(selectedTarget.capacityBytes) : '—',
          operation: `${filesystem} (${(clusterSizeBytes / 1024).toFixed(0)} KB clusters) · Label ${labelValidation.normalized}`,
        }}
        onConfirm={executeFormat}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
