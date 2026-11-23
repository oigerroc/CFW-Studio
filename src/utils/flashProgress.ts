export type FlashPhase =
  | 'idle'
  | 'downloading'
  | 'preparing'
  | 'writing'
  | 'verifying'
  | 'completed'
  | 'error';

export type FlashSourceMode = 'curated' | 'github' | 'local';

export interface FlashProgressMeta {
  active: boolean;
  indeterminate: boolean;
  label: string;
  readout: string;
  tone: 'info' | 'success' | 'error' | 'idle';
  ariaValueNow: number | undefined;
  ariaValueText: string;
}

export function isFlashingActive(phase: FlashPhase): boolean {
  return (
    phase === 'downloading' ||
    phase === 'preparing' ||
    phase === 'writing' ||
    phase === 'verifying'
  );
}

export function isIndeterminateFlashPhase(
  phase: FlashPhase,
  sourceMode: FlashSourceMode,
  unknownRemoteSize = false
): boolean {
  if (phase === 'preparing' || phase === 'downloading') {
    return true;
  }
  if (phase === 'writing' && sourceMode === 'github' && unknownRemoteSize) {
    return true;
  }
  return false;
}

export function clampProgressPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function getFlashProgressMeta(
  phase: FlashPhase,
  progressPercent: number,
  sourceMode: FlashSourceMode = 'curated',
  unknownRemoteSize = false
): FlashProgressMeta {
  const clamped = clampProgressPercent(progressPercent);
  const active = isFlashingActive(phase);
  const indeterminate = isIndeterminateFlashPhase(
    phase,
    sourceMode,
    unknownRemoteSize
  );

  switch (phase) {
    case 'downloading':
      return {
        active,
        indeterminate: true,
        label: 'Streaming GitHub Release Asset…',
        readout: 'Working…',
        tone: 'info',
        ariaValueNow: undefined,
        ariaValueText: 'Streaming GitHub release asset',
      };
    case 'preparing':
      return {
        active,
        indeterminate: true,
        label: 'Preparing Partition Table…',
        readout: 'Working…',
        tone: 'info',
        ariaValueNow: undefined,
        ariaValueText: 'Preparing partition table and boot headers',
      };
    case 'writing':
      return {
        active,
        indeterminate,
        label: 'Flashing OS Image…',
        readout: indeterminate ? 'Working…' : `${clamped}%`,
        tone: 'info',
        ariaValueNow: indeterminate ? undefined : clamped,
        ariaValueText: indeterminate
          ? 'Flashing OS image stream'
          : `Flashing OS image, ${clamped} percent`,
      };
    case 'verifying':
      return {
        active,
        indeterminate: false,
        label: 'Verifying Sectors…',
        readout: `${clamped}%`,
        tone: 'info',
        ariaValueNow: clamped,
        ariaValueText: `Verifying sectors, ${clamped} percent`,
      };
    case 'completed':
      return {
        active: false,
        indeterminate: false,
        label: 'Flash & Verification Complete',
        readout: '100%',
        tone: 'success',
        ariaValueNow: 100,
        ariaValueText: 'Flash and verification complete, 100 percent',
      };
    case 'error':
      return {
        active: false,
        indeterminate: false,
        label: 'Flash Interrupted',
        readout: 'Error',
        tone: 'error',
        ariaValueNow: clamped,
        ariaValueText: 'Flash interrupted with error',
      };
    case 'idle':
    default:
      return {
        active: false,
        indeterminate: false,
        label: 'Ready',
        readout: '0%',
        tone: 'idle',
        ariaValueNow: 0,
        ariaValueText: 'Ready',
      };
  }
}
