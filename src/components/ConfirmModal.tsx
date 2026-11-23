import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  targetSummary: {
    cardName: string;
    capacity: string;
    operation: string;
  };
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmModal({
  open,
  title,
  description,
  confirmLabel,
  targetSummary,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <h2
              id="confirm-modal-title"
              className="text-lg font-semibold text-slate-900 dark:text-slate-100"
            >
              {title}
            </h2>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close confirmation dialog"
            className="flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {description}
        </p>

        <dl className="mt-4 space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-3.5 text-xs dark:border-slate-800 dark:bg-slate-950/60">
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Target microSD</dt>
            <dd className="font-medium text-slate-900 dark:text-slate-100 text-right">
              {targetSummary.cardName}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Capacity</dt>
            <dd className="font-mono tabular-nums text-slate-900 dark:text-slate-100">
              {targetSummary.capacity}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt className="text-slate-500 dark:text-slate-400">Operation</dt>
            <dd className="font-medium text-red-700 dark:text-red-400 text-right">
              {targetSummary.operation}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-[44px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="min-h-[44px] rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 focus-visible:outline-2 focus-visible:outline-red-600 whitespace-nowrap"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
