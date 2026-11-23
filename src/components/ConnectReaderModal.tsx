import { useEffect } from 'react';
import { FolderOpen, HardDrive, Usb, X } from 'lucide-react';
import { BrowserCapabilities, StorageTarget } from '../utils/usbMassStorage';
import { formatBytes } from '../utils/filesystemFormatter';

interface ConnectReaderModalProps {
  open: boolean;
  capabilities: BrowserCapabilities;
  targets: StorageTarget[];
  selectedTargetId: string;
  connectionMessage: string | null;
  onSelectTarget: (id: string) => void;
  onConnectWebUsb: () => void;
  onConnectDirectory: () => void;
  onClose: () => void;
}

export function ConnectReaderModal({
  open,
  capabilities,
  targets,
  selectedTargetId,
  connectionMessage,
  onSelectTarget,
  onConnectWebUsb,
  onConnectDirectory,
  onClose,
}: ConnectReaderModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="connect-reader-title"
    >
      <div className="w-full max-w-lg rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2
              id="connect-reader-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              Connect microSD Reader
            </h2>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Pair a USB-C OTG reader without Android root, mount an SD folder, or pick a virtual card.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close reader connection dialog"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={onConnectWebUsb}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap"
          >
            <Usb className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Pair USB OTG Reader</span>
          </button>
          <button
            type="button"
            onClick={onConnectDirectory}
            className="flex min-h-[48px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap"
          >
            <FolderOpen className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Mount SD Folder</span>
          </button>
        </div>

        <div className="mt-3 space-y-1 text-xs text-slate-500 dark:text-slate-400">
          <p>{capabilities.androidCompatReport.summary}</p>
          {capabilities.isAndroid && !capabilities.fileSystemAccessSupported && capabilities.webkitDirectorySupported && (
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Android Chrome uses SAF folder fallback for inspection; use <strong>Pair USB OTG Reader</strong> for raw sector writes &amp; formatting.
            </p>
          )}
        </div>

        {connectionMessage && (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/40 dark:text-amber-200">
            {connectionMessage}
          </div>
        )}

        <div className="mt-5 border-t border-slate-200 pt-4 dark:border-slate-800">
          <h3 className="text-xs font-semibold tracking-wide text-slate-500 dark:text-slate-400">
            Available Storage Targets
          </h3>
          <div className="mt-2.5 space-y-2 max-h-60 overflow-y-auto">
            {targets.map((card) => {
              const active = card.id === selectedTargetId;
              return (
                <button
                  key={card.id}
                  type="button"
                  onClick={() => {
                    onSelectTarget(card.id);
                    onClose();
                  }}
                  className={`flex w-full min-h-[52px] items-center justify-between gap-3 rounded-lg border px-3.5 py-2.5 text-left transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 ${
                    active
                      ? 'border-blue-600 bg-blue-50/70 dark:border-blue-500 dark:bg-blue-950/40'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/40 dark:hover:border-slate-700 dark:hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <HardDrive
                      className={`h-4 w-4 shrink-0 ${
                        active ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
                      }`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {card.name}
                      </div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {card.vendor} · {card.currentFilesystem} · {card.volumeLabel}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 font-mono text-xs font-medium tabular-nums text-slate-700 dark:text-slate-300">
                    {formatBytes(card.capacityBytes)}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
