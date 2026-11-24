import { Usb } from 'lucide-react';

export type AppView = 'flasher' | 'formatter' | 'catalog' | 'guide';

interface TopNavProps {
  activeView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenConnectModal: () => void;
}

const NAV_ITEMS: { id: AppView; label: string; mobileLabel: string }[] = [
  { id: 'flasher', label: 'OS Flasher', mobileLabel: 'Flasher' },
  { id: 'formatter', label: 'SD Formatter', mobileLabel: 'Formatter' },
  { id: 'catalog', label: 'Handheld Catalog', mobileLabel: 'Catalog' },
  { id: 'guide', label: 'Guide & Credits', mobileLabel: 'Guide' },
];

export function TopNav({ activeView, onNavigate, onOpenConnectModal }: TopNavProps) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 py-3 sm:px-6 lg:px-8">
          {/* Zone 1: Single-element Brand Icon + Wordmark */}
          <a
            href="#top"
            onClick={(e) => {
              e.preventDefault();
              onNavigate('flasher');
            }}
            className="inline-flex items-center gap-2.5 font-display text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600"
          >
            <img
              src="/assets/branding/cfw-studio-icon-128.png"
              srcSet="/assets/branding/cfw-studio-icon-64.png 1x, /assets/branding/cfw-studio-icon-128.png 2x, /assets/branding/cfw-studio-icon-192.png 3x"
              alt=""
              width={28}
              height={28}
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-7 w-7 rounded-md shrink-0"
            />
            <span>CFW Studio</span>
          </a>

          {/* Zone 2: 4 Single-line Navigation Links */}
          <nav aria-label="Primary navigation" className="hidden md:flex items-center gap-6">
            {NAV_ITEMS.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`relative min-h-[40px] px-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
                    isActive
                      ? 'text-slate-950 dark:text-white'
                      : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-0 -bottom-[13px] h-0.5 bg-blue-600 dark:bg-blue-500"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onOpenConnectModal}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
            >
              <Usb className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Connect Reader</span>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Thumb-Zone Bottom Bar (<= 52px + safe area inset, well below 15% mobile sticky cap) */}
      <nav
        aria-label="Mobile navigation"
        className="fixed bottom-0 left-0 right-0 z-40 grid grid-cols-4 border-t border-slate-200 bg-white/95 pb-safe backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/95 md:hidden"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              className={`flex min-h-[52px] items-center justify-center px-2 text-xs font-semibold transition-colors whitespace-nowrap ${
                isActive
                  ? 'border-t-2 border-blue-600 text-blue-700 bg-blue-50/40 dark:border-blue-500 dark:text-blue-400 dark:bg-blue-950/40'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {item.mobileLabel}
            </button>
          );
        })}
      </nav>
    </>
  );
}
