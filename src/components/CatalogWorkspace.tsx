import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Compass,
  Cpu,
  ExternalLink,
  HardDrive,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  FlashMethod,
  HANDHELD_OS_CATALOG,
  TrimuiBrickSupport,
} from '../data/osCatalog';
import {
  CatalogSortField,
  SortDirection,
  filterAndSortOsCatalog,
  getUniqueDeviceModels,
} from '../utils/catalogFilters';
import {
  RECOMMENDATION_PRIORITY_OPTIONS,
  RecommendationPriority,
  suggestBestOsByDevice,
} from '../utils/osRecommender';
import { StableReleaseCheckResult } from '../utils/releaseChecker';

interface CatalogWorkspaceProps {
  releaseChecksByOsId: Record<string, StableReleaseCheckResult>;
  releaseChecking: boolean;
  onRefreshReleases: () => void;
  onSelectForFlash: (osId: string, deviceId?: string) => void;
}

const SORT_LABELS: { value: CatalogSortField; label: string }[] = [
  { value: 'name', label: 'OS Name' },
  { value: 'recommendedCardGb', label: 'Recommended SD Size' },
  { value: 'imageSizeBytes', label: 'Image Download Size' },
  { value: 'releaseDate', label: 'Release Date' },
];

function BrickSupportLabel({ status }: { status: TrimuiBrickSupport }) {
  if (status === 'Verified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 dark:text-emerald-400 whitespace-nowrap">
        <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>TrimUI Brick: Verified</span>
      </span>
    );
  }
  if (status === 'Experimental') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 dark:text-amber-400 whitespace-nowrap">
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>TrimUI Brick: Experimental</span>
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
      Other Handhelds Only
    </span>
  );
}

export function CatalogWorkspace({
  releaseChecksByOsId,
  releaseChecking,
  onRefreshReleases,
  onSelectForFlash,
}: CatalogWorkspaceProps) {
  const [query, setQuery] = useState('');
  const [methodFilter, setMethodFilter] = useState<'all' | FlashMethod>('all');
  const [deviceModel, setDeviceModel] = useState<string>('all');
  const [brandFilter, setBrandFilter] = useState<'all' | 'anbernic' | 'powkiddy' | 'ayn-retroid'>('all');
  const [sortBy, setSortBy] = useState<CatalogSortField>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const [advisorDevice, setAdvisorDevice] = useState<string>('Anbernic RG35XX Plus / H / SP');
  const [advisorPriority, setAdvisorPriority] = useState<RecommendationPriority>('balanced');

  const deviceModels = useMemo(
    () => getUniqueDeviceModels(HANDHELD_OS_CATALOG),
    []
  );

  const recommendationPlan = useMemo(
    () => suggestBestOsByDevice(HANDHELD_OS_CATALOG, advisorDevice, advisorPriority),
    [advisorDevice, advisorPriority]
  );

  const filteredCatalog = useMemo(
    () =>
      filterAndSortOsCatalog(HANDHELD_OS_CATALOG, {
        query,
        methodFilter,
        deviceModel,
        brandFilter,
        sortBy,
        sortDirection,
      }),
    [query, methodFilter, deviceModel, brandFilter, sortBy, sortDirection]
  );

  const handleDeviceModelChange = (nextModel: string) => {
    setDeviceModel(nextModel);
    if (nextModel !== 'all') {
      setAdvisorDevice(nextModel);
      if (nextModel.startsWith('Anbernic')) {
        setBrandFilter('anbernic');
      } else if (nextModel.startsWith('Powkiddy')) {
        setBrandFilter('powkiddy');
      } else if (nextModel.startsWith('AYN') || nextModel.startsWith('Retroid')) {
        setBrandFilter('ayn-retroid');
      } else {
        setBrandFilter('all');
      }
    }
  };

  const handleToggleBrickQuickFilter = () => {
    setBrandFilter('all');
    if (deviceModel === 'TrimUI Brick') {
      setDeviceModel('all');
    } else {
      setDeviceModel('TrimUI Brick');
      setAdvisorDevice('TrimUI Brick');
    }
  };

  const handleToggleBrandQuickFilter = (brand: 'anbernic' | 'powkiddy' | 'ayn-retroid') => {
    setDeviceModel('all');
    setBrandFilter((prev) => {
      const next = prev === brand ? 'all' : brand;
      if (next === 'anbernic' && !advisorDevice.startsWith('Anbernic')) {
        setAdvisorDevice('Anbernic RG35XX Plus / H / SP');
      } else if (next === 'powkiddy' && !advisorDevice.startsWith('Powkiddy')) {
        setAdvisorDevice('Powkiddy RGB30');
      } else if (
        next === 'ayn-retroid' &&
        !advisorDevice.startsWith('AYN') &&
        !advisorDevice.startsWith('Retroid')
      ) {
        setAdvisorDevice('AYN Odin 2 / Odin 2 Mini / Portal');
      }
      return next;
    });
  };

  const resetFilters = () => {
    setQuery('');
    setMethodFilter('all');
    setDeviceModel('all');
    setBrandFilter('all');
    setSortBy('name');
    setSortDirection('asc');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-4 dark:border-slate-800 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 sm:text-3xl text-balance">
            Handheld OS Compatibility Catalog
          </h1>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
            Filter by device model, compare SD card requirements, and get firmware recommendations for TrimUI Brick, Anbernic, Powkiddy, AYN, and Retroid handhelds.
          </p>
        </div>

        <div
          role="tablist"
          aria-label="Filter OS by install method"
          className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 self-start sm:self-auto dark:border-slate-800 dark:bg-slate-900"
        >
          {(
            [
              { id: 'all', label: 'All Methods' },
              { id: 'raw-img', label: 'Raw .img' },
              { id: 'fat32-package', label: 'FAT32 Package' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={methodFilter === tab.id}
              onClick={() => setMethodFilter(tab.id)}
              className={`min-h-[34px] rounded-md px-3 py-1 text-xs font-semibold transition-colors whitespace-nowrap ${
                methodFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs dark:bg-slate-800 dark:text-slate-100'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Best OS Advisor by Device */}
      <section
        aria-labelledby="best-os-advisor-heading"
        className="rounded-xl border border-slate-200 bg-white overflow-hidden dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/70 p-4 sm:p-5 dark:border-slate-800 dark:bg-slate-950/40 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true" />
              <h2
                id="best-os-advisor-heading"
                className="font-display text-base font-bold text-slate-900 dark:text-slate-100"
              >
                Suggest Best OS by Device
              </h2>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Match your handheld chipset to the optimal custom OS for your priority.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 lg:w-[600px] shrink-0">
            <div className="sm:col-span-8">
              <label
                htmlFor="catalog-advisor-device"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Handheld Device Model
              </label>
              <select
                id="catalog-advisor-device"
                value={advisorDevice}
                onChange={(e) => setAdvisorDevice(e.target.value)}
                className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {deviceModels.map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-4">
              <label
                htmlFor="catalog-advisor-priority"
                className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
              >
                Usage Priority
              </label>
              <select
                id="catalog-advisor-priority"
                value={advisorPriority}
                onChange={(e) =>
                  setAdvisorPriority(e.target.value as RecommendationPriority)
                }
                className="mt-1 min-h-[40px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              >
                {RECOMMENDATION_PRIORITY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {recommendationPlan && (
          <div className="grid grid-cols-1 divide-y divide-slate-200 dark:divide-slate-800 lg:grid-cols-12 lg:divide-x lg:divide-y-0">
            {/* Primary Best OS Pick */}
            <div className="p-4 sm:p-5 lg:col-span-7 space-y-3">
              <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
                <span className="font-mono font-semibold uppercase tracking-wide text-blue-700 dark:text-blue-400">
                  Top Pick
                </span>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                  ·
                </span>
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  {recommendationPlan.primary.bestForLabel}
                </span>
                <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                  ·
                </span>
                <span className="font-mono text-slate-500 dark:text-slate-400">
                  {recommendationPlan.chipset}
                </span>
              </div>

              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <h3 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                    {recommendationPlan.primary.os.name}
                  </h3>
                  <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                    {recommendationPlan.primary.os.version}
                  </span>
                </div>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {recommendationPlan.primary.os.methodLabel}
                </span>
              </div>

              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {recommendationPlan.primary.reasonSummary}
              </p>

              <div className="text-xs text-slate-600 dark:text-slate-400 tabular-nums">
                <span>
                  Recommended SD:{' '}
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    {recommendationPlan.primary.recommendedSdSpec}
                  </strong>
                </span>
                <span aria-hidden="true"> · </span>
                <span>
                  Download:{' '}
                  <strong className="font-mono text-slate-900 dark:text-slate-100">
                    {recommendationPlan.primary.os.imageSizeLabel}
                  </strong>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() =>
                    onSelectForFlash(
                      recommendationPlan.primary.os.id,
                      recommendationPlan.primary.deviceTarget.id
                    )
                  }
                  className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap"
                >
                  <span>Flash {recommendationPlan.primary.os.name}</span>
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setBrandFilter('all');
                    setDeviceModel(
                      deviceModel === recommendationPlan.deviceName
                        ? 'all'
                        : recommendationPlan.deviceName
                    );
                  }}
                  className="inline-flex min-h-[40px] items-center rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap"
                >
                  {deviceModel === recommendationPlan.deviceName
                    ? 'Show All Devices in Matrix'
                    : `Filter Matrix to ${recommendationPlan.deviceName}`}
                </button>
              </div>
            </div>

            {/* Compatible Alternatives */}
            <div className="bg-slate-50/40 p-4 sm:p-5 dark:bg-slate-950/30 lg:col-span-5 space-y-3">
              <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Also Compatible for {recommendationPlan.deviceName}
              </div>

              {recommendationPlan.alternatives.length === 0 ? (
                <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                  {recommendationPlan.primary.os.name} is the primary community-supported custom OS for {recommendationPlan.deviceName} ({recommendationPlan.chipset}).
                </p>
              ) : (
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {recommendationPlan.alternatives.map((alt) => (
                    <div
                      key={alt.os.id}
                      className="flex items-start justify-between gap-3 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {alt.os.name}
                          </span>
                          <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                            {alt.bestForLabel}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                          {alt.reasonSummary}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onSelectForFlash(alt.os.id, alt.deviceTarget.id)}
                        aria-label={`Use alternative ${alt.os.name} for ${recommendationPlan.deviceName}`}
                        className="min-h-[34px] shrink-0 rounded-md border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 transition-colors hover:border-blue-500 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300 whitespace-nowrap"
                      >
                        Use {alt.os.name}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Filter & Sort Controls */}
      <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-end">
          {/* Search */}
          <div className="lg:col-span-3">
            <label
              htmlFor="catalog-search"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Search OS, Chipset, or Issue
            </label>
            <div className="relative mt-1.5">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-slate-500"
                aria-hidden="true"
              />
              <input
                id="catalog-search"
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search OS, chipset, or issue…"
                className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
              />
            </div>
          </div>

          {/* Full-width Device Model Filter */}
          <div className="lg:col-span-5">
            <label
              htmlFor="device-model-filter"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Filter by Device Model
            </label>
            <select
              id="device-model-filter"
              value={deviceModel}
              onChange={(e) => handleDeviceModelChange(e.target.value)}
              className="mt-1.5 block min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            >
              <option value="all">All Device Models ({deviceModels.length})</option>
              {deviceModels.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          {/* Sort Controls */}
          <div className="lg:col-span-4">
            <label
              htmlFor="catalog-sort-by"
              className="block text-xs font-semibold text-slate-700 dark:text-slate-300"
            >
              Sort List By
            </label>
            <div className="mt-1.5 flex items-center gap-2">
              <select
                id="catalog-sort-by"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as CatalogSortField)}
                className="min-h-[42px] flex-1 min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-blue-600 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
              >
                {SORT_LABELS.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'))}
                aria-label={`Sort direction: ${sortDirection === 'asc' ? 'Ascending' : 'Descending'}`}
                className="inline-flex min-h-[42px] items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0"
              >
                {sortDirection === 'asc' ? (
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{sortDirection === 'asc' ? 'Asc' : 'Desc'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Brand & Hardware Quick Filters */}
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
          <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
            Quick device filter:
          </span>
          <button
            type="button"
            aria-pressed={deviceModel === 'TrimUI Brick'}
            onClick={handleToggleBrickQuickFilter}
            className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
              deviceModel === 'TrimUI Brick'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            TrimUI Brick
          </button>
          <button
            type="button"
            aria-pressed={brandFilter === 'anbernic'}
            onClick={() => handleToggleBrandQuickFilter('anbernic')}
            className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
              brandFilter === 'anbernic'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Anbernic
          </button>
          <button
            type="button"
            aria-pressed={brandFilter === 'powkiddy'}
            onClick={() => handleToggleBrandQuickFilter('powkiddy')}
            className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
              brandFilter === 'powkiddy'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Powkiddy
          </button>
          <button
            type="button"
            aria-pressed={brandFilter === 'ayn-retroid'}
            onClick={() => handleToggleBrandQuickFilter('ayn-retroid')}
            className={`min-h-[36px] rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-blue-600 ${
              brandFilter === 'ayn-retroid'
                ? 'border-blue-600 bg-blue-600 text-white'
                : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            AYN &amp; Retroid
          </button>
        </div>
      </div>

      {/* Results Count + Release Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 dark:text-slate-400">
        <div className="flex flex-wrap items-center gap-3 tabular-nums">
          <span>
            Showing <strong className="text-slate-900 dark:text-slate-100">{filteredCatalog.length}</strong> of{' '}
            <strong className="text-slate-900 dark:text-slate-100">{HANDHELD_OS_CATALOG.length}</strong> operating systems
            {deviceModel !== 'all' && (
              <>
                {' '}
                for <strong className="text-slate-900 dark:text-slate-100">{deviceModel}</strong>
              </>
            )}
          </span>
          <button
            type="button"
            disabled={releaseChecking}
            onClick={onRefreshReleases}
            className="inline-flex min-h-[28px] items-center gap-1.5 font-semibold text-blue-700 hover:underline disabled:opacity-50 dark:text-blue-400 whitespace-nowrap"
          >
            <RefreshCw
              className={`h-3 w-3 shrink-0 ${releaseChecking ? 'animate-spin' : ''}`}
              aria-hidden="true"
            />
            <span>{releaseChecking ? 'Checking stable releases…' : 'Check latest stable'}</span>
          </button>
        </div>
      </div>

      {/* Streamlined Sortable OS List */}
      {filteredCatalog.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            No matching operating systems found
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            Try clearing your search filter or switching back to All Device Models.
          </p>
          <button
            type="button"
            onClick={resetFilters}
            className="mt-4 min-h-[40px] rounded-lg border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="divide-y divide-slate-200 rounded-xl border border-slate-200 bg-white overflow-hidden dark:divide-slate-800 dark:border-slate-800 dark:bg-slate-900">
          {filteredCatalog.map((os) => {
            const preferredDevice =
              deviceModel !== 'all'
                ? os.devices.find((d) => d.name === deviceModel) ?? os.devices[0]
                : os.devices.find((d) => d.id === 'trimui-brick') ?? os.devices[0];

            return (
              <article key={os.id} className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                      <h2 className="font-display text-xl font-bold text-slate-900 dark:text-slate-100">
                        {os.name}
                      </h2>
                      <span className="font-mono text-xs text-slate-600 dark:text-slate-400">
                        {os.version}
                      </span>
                      {(() => {
                        const rc = releaseChecksByOsId[os.id];
                        if (!rc) return null;
                        if (rc.status === 'update-available' && rc.latestTag) {
                          return (
                            <>
                              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                                ·
                              </span>
                              <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
                                Newest stable: {rc.latestTag}
                                {rc.publishedAt ? ` (${rc.publishedAt})` : ''}
                              </span>
                            </>
                          );
                        }
                        if (rc.status === 'up-to-date' && rc.latestTag) {
                          return (
                            <>
                              <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                                ·
                              </span>
                              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                                Stable verified ({rc.latestTag})
                              </span>
                            </>
                          );
                        }
                        return null;
                      })()}
                      <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
                        ·
                      </span>
                      <BrickSupportLabel status={os.trimuiBrickSupport} />
                    </div>
                    <div className="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                      <span>{os.baseSystem}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{os.methodLabel}</span>
                      <span aria-hidden="true"> · </span>
                      <span>SD {os.recommendedCardRange} ({os.recommendedFormat})</span>
                      <span aria-hidden="true"> · </span>
                      <span className="font-mono">{os.imageSizeLabel}</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
                      <span>
                        By <strong className="font-semibold text-slate-800 dark:text-slate-200">{os.credits.creators}</strong>
                      </span>
                      <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                      <span>License: {os.credits.license}</span>
                      <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">·</span>
                      <a
                        href={os.credits.projectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-medium text-blue-700 hover:underline dark:text-blue-400"
                      >
                        <span>{os.credits.projectLabel}</span>
                        <ExternalLink className="h-3 w-3 shrink-0" aria-hidden="true" />
                      </a>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => onSelectForFlash(os.id, preferredDevice?.id)}
                    aria-label={`Use ${os.name} in Flasher`}
                    className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-slate-800 dark:bg-blue-600 dark:hover:bg-blue-500 focus-visible:outline-2 focus-visible:outline-blue-600 whitespace-nowrap shrink-0 self-start"
                  >
                    <span>Use in Flasher</span>
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                  {os.summary}
                </p>

                {/* Hardware Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 dark:text-slate-400 mr-1">
                    <Cpu className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Flash for:</span>
                  </span>
                  {os.devices.map((dev) => (
                    <button
                      key={dev.id}
                      type="button"
                      onClick={() => onSelectForFlash(os.id, dev.id)}
                      aria-label={`Flash ${os.name} for ${dev.name}`}
                      className={`min-h-[30px] rounded-md border px-2.5 py-0.5 text-[11px] font-medium transition-colors whitespace-nowrap ${
                        deviceModel === dev.name
                          ? 'border-blue-600 bg-blue-50 text-blue-800 dark:border-blue-500 dark:bg-blue-950/50 dark:text-blue-300'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-500 hover:text-blue-700 dark:border-slate-700 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-blue-400 dark:hover:text-blue-300'
                      }`}
                    >
                      {dev.name}
                    </button>
                  ))}
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                    <HardDrive className="h-3.5 w-3.5" aria-hidden="true" />
                    <span>Min {os.minCardGb} GB · Released {os.releaseDate}</span>
                  </span>
                </div>

                {/* 2-Column Instructions & Known Issues */}
                <div className="grid grid-cols-1 gap-5 border-t border-slate-100 pt-3.5 dark:border-slate-800 md:grid-cols-2">
                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Flashing Instructions
                    </h3>
                    <ol className="mt-1.5 list-decimal space-y-1 pl-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {os.flashingInstructions.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div>
                    <h3 className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                      Known Issues &amp; Caveats
                    </h3>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {os.knownIssues.map((issue, index) => (
                        <li key={index}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">
        All listed operating systems and trademarks remain the property of their respective creators and hardware manufacturers. CFW Studio does not bundle or redistribute firmware binaries; links open official upstream project pages.
      </p>
    </div>
  );
}
