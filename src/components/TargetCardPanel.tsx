import { HardDrive, Plus, Usb } from 'lucide-react';
import { StorageTarget } from '../utils/usbMassStorage';
import { formatBytes } from '../utils/filesystemFormatter';

interface TargetCardPanelProps {
  targets: StorageTarget[];
  selectedTargetId: string;
  onSelectTarget: (id: string) => void;
  onOpenConnectModal: () => void;
  disabled?: boolean;
}

export function TargetCardPanel({
  targets,
  selectedTargetId,
  onSelectTarget,
  onOpenConnectModal,
  disabled = false,
}: TargetCardPanelProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Target microSD Card
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select a connected USB-C OTG reader or virtual card
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenConnectModal}
          disabled={disabled}
          className="inline-flex min-h-[38px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Add Card</span>
        </button>
      </div>

      {targets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center dark:border-slate-700 dark:bg-slate-900/50">
          <Usb className="mx-auto h-6 w-6 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium text-slate-800 dark:text-slate-200">
            No microSD card detected
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Connect a USB-C OTG microSD reader or mount a card folder.
          </p>
          <button
            type="button"
            onClick={onOpenConnectModal}
            className="mt-4 inline-flex min-h-[42px] items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Connect Reader
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white overflow-hidden dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {targets.map((card) => {
            const isSelected = card.id === selectedTargetId;
            return (
              <button
                key={card.id}
                type="button"
                disabled={disabled}
                onClick={() => onSelectTarget(card.id)}
                aria-pressed={isSelected}
                className={`flex w-full min-h-[58px] items-center justify-between gap-4 px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                  isSelected
                    ? 'bg-blue-50/70 dark:bg-blue-950/40'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${
                      isSelected
                        ? 'border-blue-600 bg-blue-600 text-white dark:border-blue-500 dark:bg-blue-600'
                        : 'border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    <HardDrive className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                      {card.name}
                    </div>
                    <div className="mt-0.5 truncate text-xs text-slate-500 dark:text-slate-400">
                      <span>{card.currentFilesystem}</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono">{card.volumeLabel}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{card.speedClass}</span>
                      {card.installedOs && (
                        <>
                          <span aria-hidden="true"> · </span>
                          <span className="font-medium text-slate-700 dark:text-slate-300">
                            OS: {card.installedOs}
                          </span>
                        </>
                      )}
                    </div>
                    {card.readOnlyNotice && (
                      <div className="mt-0.5 truncate text-[11px] text-amber-700 dark:text-amber-400">
                        {card.readOnlyNotice}
                      </div>
                    )}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-slate-100">
                    {formatBytes(card.capacityBytes)}
                  </div>
                  <div className="text-[11px] text-slate-500 dark:text-slate-400">
                    {card.connectionType === 'webusb-otg'
                      ? 'USB OTG'
                      : card.connectionType === 'directory-handle'
                      ? 'SD Folder'
                      : 'Virtual OTG'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
