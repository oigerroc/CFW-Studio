import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BookOpen, Moon, Sun } from 'lucide-react';
import { AppView, TopNav } from './components/TopNav';
import { FlasherWorkspace } from './components/FlasherWorkspace';
import { FormatterWorkspace } from './components/FormatterWorkspace';
import { CatalogWorkspace } from './components/CatalogWorkspace';
import { OtgGuideWorkspace } from './components/OtgGuideWorkspace';
import { ConnectReaderModal } from './components/ConnectReaderModal';
import { WalkthroughModal } from './components/WalkthroughModal';
import { HANDHELD_OS_CATALOG } from './data/osCatalog';
import { FilesystemType, formatBytes } from './utils/filesystemFormatter';
import { StableReleaseCheckResult } from './utils/releaseChecker';
import {
  ThemeMode,
  applyThemeToDocument,
  loadStoredTheme,
} from './utils/themePreference';
import {
  StorageTarget,
  detectBrowserCapabilities,
  loadPersistedVirtualCards,
  requestSdDirectoryHandle,
  requestWebUsbCardReader,
  savePersistedVirtualCards,
} from './utils/usbMassStorage';

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('flasher');
  const [theme, setTheme] = useState<ThemeMode>(() => loadStoredTheme());
  const [targets, setTargets] = useState<StorageTarget[]>(() => loadPersistedVirtualCards());
  const [selectedTargetId, setSelectedTargetId] = useState<string>(() => targets[0]?.id ?? '');

  const [selectedOsId, setSelectedOsId] = useState<string>(HANDHELD_OS_CATALOG[0].id);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
    HANDHELD_OS_CATALOG[0].devices[0].id
  );

  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [walkthroughOpen, setWalkthroughOpen] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState<string | null>(null);
  const scrollTimerRef = useRef<number | null>(null);

  const [releaseChecksByOsId, setReleaseChecksByOsId] = useState<
    Record<string, StableReleaseCheckResult>
  >({});
  const [releaseChecking, setReleaseChecking] = useState(true);
  const [releaseCheckedAt, setReleaseCheckedAt] = useState<string | null>(null);

  const capabilities = useMemo(() => detectBrowserCapabilities(), []);

  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    savePersistedVirtualCards(targets);
  }, [targets]);

  const fetchLatestStableReleases = useCallback(async (forceRefresh = false) => {
    setReleaseChecking(true);
    try {
      const endpoint = forceRefresh
        ? '/api/os-releases/latest?refresh=true'
        : '/api/os-releases/latest';
      const res = await fetch(endpoint);
      if (!res.ok) return;
      const payload = (await res.json()) as {
        checkedAt?: string;
        results?: StableReleaseCheckResult[];
      };
      if (Array.isArray(payload.results)) {
        const mapped: Record<string, StableReleaseCheckResult> = {};
        for (const item of payload.results) {
          mapped[item.osId] = item;
        }
        setReleaseChecksByOsId(mapped);
        setReleaseCheckedAt(payload.checkedAt ?? new Date().toISOString());
      }
    } catch {
      // Fail quietly if offline; curated catalog versions remain usable
    } finally {
      setReleaseChecking(false);
    }
  }, []);

  // Automatically check newest stable releases of each listed OS on app start
  useEffect(() => {
    void fetchLatestStableReleases(false);
  }, [fetchLatestStableReleases]);

  const activeTarget = useMemo(
    () => targets.find((t) => t.id === selectedTargetId) ?? targets[0] ?? null,
    [targets, selectedTargetId]
  );

  const handleSelectOs = (osId: string, deviceId?: string) => {
    setSelectedOsId(osId);
    const os = HANDHELD_OS_CATALOG.find((entry) => entry.id === osId);
    if (deviceId) {
      setSelectedDeviceId(deviceId);
    } else if (os && os.devices.some((d) => d.id === selectedDeviceId)) {
      return;
    } else if (os?.devices[0]) {
      setSelectedDeviceId(os.devices[0].id);
    }
  };

  const handleConnectTarget = async (
    connector: () => Promise<{ target?: StorageTarget; error?: string }>
  ) => {
    setConnectionMessage(null);
    const result = await connector();
    if (result.target) {
      const newTarget = result.target;
      setTargets((prev) => [newTarget, ...prev]);
      setSelectedTargetId(newTarget.id);
      setConnectModalOpen(false);
    } else if (result.error) {
      setConnectionMessage(result.error);
    }
  };

  const handleFlashComplete = (
    targetId: string,
    installedOsName: string,
    newFilesystem: StorageTarget['currentFilesystem'],
    volumeLabel: string
  ) => {
    setTargets((prev) =>
      prev.map((card) =>
        card.id === targetId
          ? {
              ...card,
              installedOs: installedOsName,
              currentFilesystem: newFilesystem,
              volumeLabel,
            }
          : card
      )
    );
  };

  const handleFormatComplete = (
    targetId: string,
    filesystem: FilesystemType,
    volumeLabel: string
  ) => {
    setTargets((prev) =>
      prev.map((card) =>
        card.id === targetId
          ? {
              ...card,
              currentFilesystem: filesystem,
              volumeLabel,
              installedOs: null,
            }
          : card
      )
    );
  };

  useEffect(() => {
    return () => {
      if (scrollTimerRef.current !== null) {
        window.clearTimeout(scrollTimerRef.current);
      }
    };
  }, []);

  const openConnectModal = useCallback(() => {
    setConnectionMessage(null);
    setConnectModalOpen(true);
  }, []);

  return (
    <div
      id="top"
      className="min-h-screen flex flex-col bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100 transition-colors duration-150"
    >
      <TopNav
        activeView={activeView}
        onNavigate={setActiveView}
        onOpenConnectModal={openConnectModal}
      />

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 pb-24 sm:px-6 md:pb-12 lg:px-8">
        {/* Compact Workspace Utility Strip: Active Card Context + Walkthrough + Theme Switch */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div className="truncate">
            {activeTarget ? (
              <span>
                Target:{' '}
                <strong className="font-medium text-slate-800 dark:text-slate-200">
                  {activeTarget.name}
                </strong>{' '}
                <span className="font-mono tabular-nums">
                  ({formatBytes(activeTarget.capacityBytes)} · {activeTarget.currentFilesystem})
                </span>
              </span>
            ) : (
              <span>No microSD card selected</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setWalkthroughOpen(true)}
              className="inline-flex min-h-[32px] items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-blue-400 dark:hover:text-blue-300 whitespace-nowrap"
            >
              <BookOpen className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <span>Beginner Walkthrough</span>
            </button>

            <div
              role="group"
              aria-label="Color theme"
              className="inline-flex items-center rounded-lg border border-slate-200 bg-white p-0.5 dark:border-slate-800 dark:bg-slate-900 shrink-0"
            >
              <button
                type="button"
                aria-pressed={theme === 'light'}
                onClick={() => setTheme('light')}
                className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  theme === 'light'
                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <Sun className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Light</span>
              </button>
              <button
                type="button"
                aria-pressed={theme === 'dark'}
                onClick={() => setTheme('dark')}
                className={`inline-flex min-h-[30px] items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                  theme === 'dark'
                    ? 'bg-blue-600 text-white'
                    : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                }`}
              >
                <Moon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Dark</span>
              </button>
            </div>
          </div>
        </div>

        {activeView === 'flasher' && (
          <FlasherWorkspace
            targets={targets}
            selectedTargetId={selectedTargetId}
            selectedOsId={selectedOsId}
            selectedDeviceId={selectedDeviceId}
            releaseChecksByOsId={releaseChecksByOsId}
            releaseChecking={releaseChecking}
            releaseCheckedAt={releaseCheckedAt}
            onRefreshReleases={() => void fetchLatestStableReleases(true)}
            onSelectTarget={setSelectedTargetId}
            onSelectOs={handleSelectOs}
            onOpenConnectModal={openConnectModal}
            onFlashComplete={handleFlashComplete}
          />
        )}

        {activeView === 'formatter' && (
          <FormatterWorkspace
            targets={targets}
            selectedTargetId={selectedTargetId}
            onSelectTarget={setSelectedTargetId}
            onOpenConnectModal={openConnectModal}
            onFormatComplete={handleFormatComplete}
          />
        )}

        {activeView === 'catalog' && (
          <CatalogWorkspace
            releaseChecksByOsId={releaseChecksByOsId}
            releaseChecking={releaseChecking}
            onRefreshReleases={() => void fetchLatestStableReleases(true)}
            onSelectForFlash={(osId, deviceId) => {
              handleSelectOs(osId, deviceId);
              setActiveView('flasher');
            }}
          />
        )}

        {activeView === 'guide' && (
          <OtgGuideWorkspace
            capabilities={capabilities}
            onOpenWalkthrough={() => setWalkthroughOpen(true)}
            onOpenConnectModal={openConnectModal}
          />
        )}
      </main>

      <footer className="hidden md:block border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 text-xs text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
          <span>
            CFW Studio · Independent open-source handheld microSD utility (MIT)
          </span>
          <div className="flex items-center gap-4">
            <span>FAT32 · exFAT · NTFS</span>
            <button
              type="button"
              onClick={() => {
                setActiveView('guide');
                if (scrollTimerRef.current !== null) {
                  window.clearTimeout(scrollTimerRef.current);
                }
                scrollTimerRef.current = window.setTimeout(() => {
                  document
                    .getElementById('os-credits-section')
                    ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 40);
              }}
              className="font-semibold text-blue-700 hover:underline dark:text-blue-400"
            >
              OS Credits &amp; Legal
            </button>
          </div>
        </div>
      </footer>

      <ConnectReaderModal
        open={connectModalOpen}
        capabilities={capabilities}
        targets={targets}
        selectedTargetId={selectedTargetId}
        connectionMessage={connectionMessage}
        onSelectTarget={setSelectedTargetId}
        onConnectWebUsb={() => handleConnectTarget(requestWebUsbCardReader)}
        onConnectDirectory={() => handleConnectTarget(requestSdDirectoryHandle)}
        onClose={() => setConnectModalOpen(false)}
      />

      <WalkthroughModal
        open={walkthroughOpen}
        onClose={() => setWalkthroughOpen(false)}
        onNavigate={setActiveView}
        onOpenConnectModal={openConnectModal}
        onApplyRecommendedOs={handleSelectOs}
      />
    </div>
  );
}
