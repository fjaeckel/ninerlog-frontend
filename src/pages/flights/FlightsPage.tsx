import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowRight, ArrowUp, Pencil, Plane, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { useFlights, useInfiniteFlights, useDeleteFlight } from '../../hooks/useFlights';
import HelpLink from '../../components/ui/HelpLink';
import { useLicenses } from '../../hooks/useLicenses';
import FlightForm from '../../components/flights/FlightForm';
import FlightCard from '../../components/flights/FlightCard';
import FlightSearchBar from '../../components/flights/FlightSearchBar';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FormModal } from '../../components/ui/FormModal';
import { PageHeader, PageWrapper } from '../../components/ui/PageWrapper';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { useFlightColumnPrefs } from '../../hooks/useFlightColumnPrefs';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { selectFlightColumns, selectFlightCardColumns, flightFunctionKind, flightFunctionLabel, FLIGHT_FUNCTION_BADGE } from '../../components/flights/flightTableColumns';
import { isSearchWorthSending, SEARCH_DEBOUNCE_MS } from '../../lib/flightSearchQuery';
import { abbreviateSiteName, splitAirportLabel, type AirportParts } from '../../lib/airport';
import type { components, operations } from '../../api/schema';

type Flight = components['schemas']['Flight'];
type ListFlightsParams = operations['listFlights']['parameters']['query'];
type SortField = 'date' | 'totalTime' | 'createdAt';

const SORT_FIELDS: SortField[] = ['date', 'totalTime', 'createdAt'];

/** A run of consecutive cards sharing a heading in the mobile list. */
interface FlightGroup {
  key: string;
  /** Null when the list is not in date order. */
  label: string | null;
  flights: Flight[];
  totalMinutes: number;
}

/**
 * Splits the page's flights into the months they were flown in. Under any
 * sort other than date, the whole page becomes one unlabelled group.
 */
function groupFlightsByMonth(flights: Flight[], locale: string, byMonth: boolean): FlightGroup[] {
  const groups: FlightGroup[] = [];
  for (const flight of flights) {
    const key = byMonth ? flight.date.slice(0, 7) : 'all';
    let group = groups[groups.length - 1];
    if (!group || group.key !== key) {
      group = { key, label: byMonth ? monthLabel(key, locale) : null, flights: [], totalMinutes: 0 };
      groups.push(group);
    }
    group.flights.push(flight);
    group.totalMinutes += flight.totalTime;
  }
  return groups;
}

/** Whether neither end of a route resolved to a code. */
function routeIsFreeText(flight: Flight): boolean {
  return (
    !splitAirportLabel(flight.departureIcao, flight.departureAirportName).code &&
    !splitAirportLabel(flight.arrivalIcao, flight.arrivalAirportName).code
  );
}

/**
 * One end of a route in the table. A code is shown as-is; a name is
 * abbreviated, with the full value in a title.
 */
function RouteEnd({ part, both }: { part: AirportParts; both: boolean }) {
  if (part.code) return <span className="font-mono tabular-nums">{part.code}</span>;
  if (!part.name) return <span>—</span>;
  return (
    <span title={part.name} className="font-sans">
      {abbreviateSiteName(part.name, both ? 14 : 18)}
    </span>
  );
}

/** The list params without the page; the scrolling query owns its own pages. */
function infiniteParamsOf(params: ListFlightsParams): Omit<ListFlightsParams, 'page'> {
  const rest = { ...params };
  delete rest.page;
  return rest;
}

/** Renders a `YYYY-MM` key as the reader's month and year. */
function monthLabel(month: string, locale: string): string {
  const [year, m] = month.split('-');
  return new Date(Date.UTC(Number(year), Number(m) - 1, 1)).toLocaleDateString(locale, {
    month: 'long',
    year: 'numeric',
  });
}

export default function FlightsPage() {
  const { t, i18n } = useTranslation(['flights', 'common']);
  // At `lg` the table takes over from the card list; only one query runs.
  const isWide = useMediaQuery('(min-width: 1024px)');
  const { fmtDate, fmtDuration } = useFormatPrefs();
  const columnPrefs = useFlightColumnPrefs();
  const navigate = useNavigate();
  const location = useLocation();
  const deleteFlight = useDeleteFlight();

  // Search, filters, sort and page live in the URL query string.
  const [searchParams, setSearchParams] = useSearchParams();
  const param = useCallback((key: string) => searchParams.get(key) ?? '', [searchParams]);

  const pageParam = Number(searchParams.get('page'));
  const page = Number.isInteger(pageParam) && pageParam > 0 ? pageParam : 1;
  const sortByParam = param('sortBy') as SortField;
  const sortBy: SortField = SORT_FIELDS.includes(sortByParam) ? sortByParam : 'date';
  const sortOrder: 'asc' | 'desc' = param('sortOrder') === 'asc' ? 'asc' : 'desc';
  const searchQuery = param('q');
  const startDate = param('startDate');
  const endDate = param('endDate');
  const aircraftReg = param('aircraftReg');
  const departureIcao = param('departureIcao');
  const arrivalIcao = param('arrivalIcao');
  const functionParam = param('function');
  const functionFilter: '' | 'pic' | 'dual' = functionParam === 'pic' || functionParam === 'dual' ? functionParam : '';
  const logbookLicenseId = param('logbook');

  // Replace rather than push, keeping the filters in the history entry.
  const updateParams = useCallback(
    (updates: Record<string, string>, { keepPage = false }: { keepPage?: boolean } = {}) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          for (const [key, value] of Object.entries(updates)) {
            if (value) next.set(key, value);
            else next.delete(key);
          }
          if (!keepPage) next.delete('page');
          return next;
        },
        { replace: true }
      );
    },
    [setSearchParams]
  );

  const [showForm, setShowForm] = useState(() => {
    const state = location.state as Record<string, unknown> | null;
    return !!state?.openForm;
  });
  const [editingFlight, setEditingFlight] = useState<string | null>(null);
  // Filters restored from the URL start expanded.
  const [showFilters, setShowFilters] = useState(
    () => !!(startDate || endDate || aircraftReg || departureIcao || arrivalIcao || functionFilter)
  );
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // The search input keeps its own state; the URL is written after the debounce.
  const [search, setSearch] = useState(searchQuery);
  const syncedQuery = useRef(searchQuery);

  const { data: licenses } = useLicenses();
  const separateLogbookLicenses = licenses?.filter((l) => l.requiresSeparateLogbook) || [];

  // Adopt a query changed outside the input (back/forward, clear all).
  useEffect(() => {
    if (searchQuery !== syncedQuery.current) {
      syncedQuery.current = searchQuery;
      setSearch(searchQuery);
    }
  }, [searchQuery]);

  // Debounce search input into the URL; half-finished queries never leave
  // the browser.
  useEffect(() => {
    if (search === syncedQuery.current) return;
    if (!isSearchWorthSending(search)) return;
    const timer = setTimeout(() => {
      syncedQuery.current = search;
      updateParams({ q: search });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [search, updateParams]);

  // Open the form modal when navigated with state.openForm.
  const locationState = location.state as Record<string, unknown> | null;
  const shouldOpenForm = !!locationState?.openForm;
  const [prevShouldOpen, setPrevShouldOpen] = useState(shouldOpenForm);
  if (shouldOpenForm && !prevShouldOpen) {
    setPrevShouldOpen(true);
    setShowForm(true);
  } else if (!shouldOpenForm && prevShouldOpen) {
    setPrevShouldOpen(false);
  }
  useEffect(() => {
    if (shouldOpenForm) {
      // Clear the state, keeping the active filters.
      navigate(`${location.pathname}${location.search}`, { replace: true, state: {} });
    }
  }, [shouldOpenForm, location.pathname, location.search, navigate]);

  const params: ListFlightsParams = {
    page,
    pageSize: 20,
    sortBy,
    sortOrder,
    ...(searchQuery ? { q: searchQuery } : {}),
    ...(startDate ? { startDate } : {}),
    ...(endDate ? { endDate } : {}),
    ...(aircraftReg ? { aircraftReg } : {}),
    ...(departureIcao ? { departureIcao: departureIcao.toUpperCase() } : {}),
    ...(arrivalIcao ? { arrivalIcao: arrivalIcao.toUpperCase() } : {}),
    ...(functionFilter === 'pic' ? { isPic: true } : {}),
    ...(functionFilter === 'dual' ? { isDual: true } : {}),
    ...(logbookLicenseId ? { logbookLicenseId } : {}),
  };

  const activeFilterCount = [startDate, endDate, aircraftReg, departureIcao, arrivalIcao, functionFilter].filter(Boolean).length;

  const clearFilters = useCallback(() => {
    syncedQuery.current = '';
    setSearch('');
    updateParams({
      q: '',
      startDate: '',
      endDate: '',
      aircraftReg: '',
      departureIcao: '',
      arrivalIcao: '',
      function: '',
    });
  }, [updateParams, setSearch]);

  // Exactly one of these is enabled: paged table or scrolling card list.
  const paged = useFlights(params, { enabled: isWide });
  const infinite = useInfiniteFlights(infiniteParamsOf(params), { enabled: !isWide });

  const isLoading = isWide ? paged.isLoading : infinite.isLoading;
  // Only a first load with nothing to show is a page error; a later failure
  // is reported at the foot.
  const error = isWide ? paged.error : infinite.data ? null : infinite.error;
  const data = paged.data;

  const flights = useMemo(
    () => (isWide ? data?.data || [] : infinite.data?.pages.flatMap((p) => p.data) || []),
    [isWide, data, infinite.data]
  );
  // Optional table columns for this page.
  const columns = useMemo(() => selectFlightColumns(flights, columnPrefs), [flights, columnPrefs]);
  // One set of time columns for every card on the page.
  const cardColumns = useMemo(
    () => selectFlightCardColumns(flights, columnPrefs),
    [flights, columnPrefs]
  );
  // Month headings with running totals for the mobile card list.
  const monthGroups = useMemo(
    () => groupFlightsByMonth(flights, i18n.language, sortBy === 'date'),
    [flights, i18n.language, sortBy]
  );

  // Endless scroll: the next page is pulled a screen before the foot of the
  // list; the button covers pointerless input and a never-firing observer.
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = infinite;
  useEffect(() => {
    const node = loadMoreRef.current;
    if (isWide || !node || !hasNextPage || infinite.isError) return;
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '600px' }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [isWide, hasNextPage, isFetchingNextPage, fetchNextPage, infinite.isError, flights.length]);

  const handleDelete = async (id: string) => {
    setDeleteTarget(id);
  };

  const confirmDelete = async () => {
    if (deleteTarget) {
      await deleteFlight.mutateAsync(deleteTarget);
      setDeleteTarget(null);
    }
  };

  const handleEdit = (id: string) => {
    setEditingFlight(id);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingFlight(null);
  };

  const toggleSort = (field: SortField) => {
    const order = sortBy === field && sortOrder === 'desc' ? 'asc' : 'desc';
    updateParams({ sortBy: field === 'date' ? '' : field, sortOrder: order === 'desc' ? '' : order });
  };

  const goToPage = (target: number) => {
    updateParams({ page: target > 1 ? String(target) : '' }, { keepPage: true });
  };

  if (isLoading) {
    return (
      <PageWrapper maxWidth="list">
        <SkeletonList rows={5} />
      </PageWrapper>
    );
  }

  // Errors while an advanced search query is active (typically a 400 for an
  // invalid query) are shown inline under the search bar instead of replacing
  // the whole page, so the user can correct the query.
  const searchError = error && searchQuery
    ? ((error as { error?: string }).error ?? t('flights:searchError'))
    : null;

  if (error && !searchError) {
    return (
      <PageWrapper maxWidth="list">
        <ErrorState title={t('flights:errorTitle')} message={t('flights:errorDescription')} />
      </PageWrapper>
    );
  }

  // Whichever query ran carries the totals — the infinite one reports them on
  // every page, so the newest page is the one to trust.
  const infinitePages = infinite.data?.pages;
  const pagination = isWide
    ? data?.pagination
    : infinitePages && infinitePages[infinitePages.length - 1]?.pagination;
  // Enough for a month heading to span whatever the table is currently showing.
  const tableColumnCount =
    5 +
    columns.time.length +
    (columns.offOnBlock ? 1 : 0) +
    (columns.function ? 1 : 0) +
    (columns.landings ? 1 : 0) +
    (columns.remarksRevealClass ? 1 : 0);

  return (
    <PageWrapper maxWidth="list">
      <PageHeader
        title={t('flights:pageTitle')}
        subtitle={pagination ? t('flights:flightsTotal', { count: pagination.total }) : undefined}
        titleAdornment={<HelpLink topic="flights" />}
        className="mb-4"
        action={
          <button onClick={() => setShowForm(true)} className="btn-primary whitespace-nowrap">
            <Plus className="w-4 h-4" aria-hidden="true" />
            {t('flights:logFlight')}
          </button>
        }
      />

      {/* Logbook Selector — only shown if separate-logbook licenses exist */}
      {separateLogbookLicenses.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{t('flights:logbook')}</label>
          <select
            value={logbookLicenseId}
            onChange={(e) => updateParams({ logbook: e.target.value })}
            className="input text-sm py-1.5 w-auto"
          >
            <option value="">{t('flights:allFlights')}</option>
            {separateLogbookLicenses.map((lic) => (
              <option key={lic.id} value={lic.id}>
                {lic.regulatoryAuthority} {lic.licenseType} — {lic.licenseNumber}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Search Bar — advanced query with tag autocomplete */}
      <FlightSearchBar value={search} onChange={setSearch} error={searchError} />

      {/* Filter toggle + sort controls */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`px-3 py-2 min-h-[44px] rounded-lg text-sm font-medium transition-colors border ${
            showFilters || activeFilterCount > 0
              ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
              : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400'
          }`}
        >
          {t('flights:filters')}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs text-blue-600 dark:text-blue-400 hover:underline min-h-[44px] flex items-center">
            {t('flights:clearAll')}
          </button>
        )}
        <div className="flex-1" />
        <span className="text-xs text-slate-500 dark:text-slate-400">{t('flights:sort')}</span>
        {(['date', 'totalTime', 'createdAt'] as const).map((field) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={`inline-flex items-center gap-1 px-3 py-2 min-h-[44px] rounded-full text-xs transition-colors ${
              sortBy === field
                ? 'bg-blue-100 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {field === 'date' ? t('flights:sortDate') : field === 'totalTime' ? t('flights:sortHours') : t('flights:sortAdded')}
            {sortBy === field &&
              (sortOrder === 'asc' ? (
                <ArrowUp className="w-3 h-3" aria-hidden="true" />
              ) : (
                <ArrowDown className="w-3 h-3" aria-hidden="true" />
              ))}
          </button>
        ))}
      </div>

      {/* Collapsible Filter Panel */}
      {showFilters && (
        <div className="card mb-4 p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{t('flights:filterDateFrom')}</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => updateParams({ startDate: e.target.value })}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{t('flights:filterDateTo')}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => updateParams({ endDate: e.target.value })}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{t('flights:filterAircraftReg')}</label>
              <input
                type="text"
                value={aircraftReg}
                onChange={(e) => updateParams({ aircraftReg: e.target.value })}
                placeholder="D-EFGH"
                className="input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{t('flights:filterDepartureIcao')}</label>
              <input
                type="text"
                value={departureIcao}
                onChange={(e) => updateParams({ departureIcao: e.target.value.toUpperCase() })}
                placeholder="EDDF"
                maxLength={4}
                className="input text-sm uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{t('flights:filterArrivalIcao')}</label>
              <input
                type="text"
                value={arrivalIcao}
                onChange={(e) => updateParams({ arrivalIcao: e.target.value.toUpperCase() })}
                placeholder="EDDH"
                maxLength={4}
                className="input text-sm uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{t('flights:filterFunction')}</label>
              <select
                value={functionFilter}
                onChange={(e) => updateParams({ function: e.target.value })}
                className="input text-sm"
              >
                <option value="">{t('flights:filterAll')}</option>
                <option value="pic">{t('flights:filterPicOnly')}</option>
                <option value="dual">{t('flights:filterDualOnly')}</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      <FormModal
        open={showForm}
        onClose={handleCloseForm}
        title={editingFlight ? t('flights:editFlight') : t('flights:logNewFlight')}
        size="xl"
      >
        <FlightForm flightId={editingFlight} onClose={handleCloseForm} />
      </FormModal>

      {/* Flight List */}
      {flights.length === 0 ? (
        <EmptyState
          icon={Plane}
          title={t('flights:noFlights')}
          description={t('flights:startBuildingLogbook')}
          action={{ label: t('flights:logFirstFlight'), onClick: () => setShowForm(true) }}
        />
      ) : (
        <>
          {/* Phones and tablets get a card per flight: the table below needs a
              horizontal scroll to reach even the total time on a narrow screen. */}
          <div className="lg:hidden space-y-4">
            {monthGroups.map((group) => (
              <section key={group.key} aria-label={group.label ?? undefined}>
                {group.label && (
                  // Full-bleed and stuck under the app header, so the month a
                  // flight belongs to stays on screen while its cards scroll.
                  <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-10 -mx-4 mb-3 flex items-baseline justify-between gap-3 border-b px-4 py-2 surface-glass">
                    <h2 className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {group.label}
                    </h2>
                    <span className="shrink-0 text-xs tabular-nums text-slate-500 dark:text-slate-400">
                      {t('flights:monthTotal', {
                        count: group.flights.length,
                        duration: fmtDuration(group.totalMinutes),
                      })}
                    </span>
                  </div>
                )}
                {/* The month's flights as one list: rows sit flush and are told
                    apart by a hairline, not by a gap. */}
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm divide-y divide-slate-200 dark:divide-slate-700 dark:border-slate-700 dark:bg-slate-800">
                  {group.flights.map((flight) => (
                    <FlightCard
                      key={flight.id}
                      flight={flight}
                      columns={cardColumns}
                      onClick={() => navigate(`/flights/${flight.id}`, { state: { listSearch: location.search } })}
                    />
                  ))}
                </div>
              </section>
            ))}

            {/* The foot of the list: the sentinel, and what it is doing */}
            <div ref={loadMoreRef} className="pt-2">
              {infinite.isError && infinite.data ? (
                // The list survives; only the next page failed.
                <div className="text-center">
                  <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">
                    {t('flights:loadMoreFailed')}
                  </p>
                  <button onClick={() => void fetchNextPage()} className="btn-secondary min-h-[44px] w-full">
                    {t('flights:loadMore')}
                  </button>
                </div>
              ) : hasNextPage ? (
                <button
                  onClick={() => void fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="btn-secondary min-h-[44px] w-full"
                >
                  {isFetchingNextPage ? t('flights:loadingMore') : t('flights:loadMore')}
                </button>
              ) : (
                pagination && (
                  <p className="py-2 text-center text-xs text-slate-400 dark:text-slate-500">
                    {t('flights:endOfList', { count: pagination.total })}
                  </p>
                )
              )}
            </div>
          </div>

          {/* @container: the optional columns below react to the width this
              table actually gets, not to the viewport size. */}
          <div className="hidden lg:block overflow-x-auto card p-0 @container">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm" aria-label={t('flights:pageTitle')}>
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">{t('flights:tableDate')}</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">{t('flights:tableRoute')}</th>
                  <th className="px-3 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">{t('flights:tableAircraft')}</th>
                  {columns.offOnBlock && (
                    <th className="px-3 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">{t('flights:tableOffOnBlock')}</th>
                  )}
                  <th className="px-3 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">{t('flights:tableTotal')}</th>
                  {columns.time.map((col) => (
                    <th
                      key={col.key}
                      title={t(`flights:${col.titleKey}`)}
                      className={`px-2 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap ${col.revealClass}`}
                    >
                      {t(`flights:${col.labelKey}`)}
                    </th>
                  ))}
                  {columns.function && (
                    <th className="px-3 py-2.5 text-center font-medium text-slate-500 dark:text-slate-400">{t('flights:tableFunction')}</th>
                  )}
                  {columns.landings && (
                    <th className="px-3 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400">{t('flights:tableLdg')}</th>
                  )}
                  {columns.remarksRevealClass && (
                    <th className={`px-3 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400 ${columns.remarksRevealClass}`}>
                      {t('flights:tableRemarks')}
                    </th>
                  )}
                  <th className="px-3 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {monthGroups.map((group) => (
                  <Fragment key={group.key}>
                    {group.label && (
                      // The same month heading the card list uses, so both views
                      // break a logbook up the same way.
                      <tr className="bg-slate-50/80 dark:bg-slate-800/60">
                        <th
                          scope="colgroup"
                          colSpan={tableColumnCount}
                          className="px-3 py-1.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300"
                        >
                          {group.label}
                          <span className="ml-2 font-normal text-slate-400 dark:text-slate-500">
                            {t('flights:monthTotal', {
                              count: group.flights.length,
                              duration: fmtDuration(group.totalMinutes),
                            })}
                          </span>
                        </th>
                      </tr>
                    )}
                    {group.flights.map((flight) => (
                  <tr
                    key={flight.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                    onClick={() => navigate(`/flights/${flight.id}`, { state: { listSearch: location.search } })}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-slate-800 dark:text-slate-200">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(`${flight.date}T00:00:00`).toLocaleDateString(i18n.language, { weekday: 'short' })}
                      </span>{' '}
                      <span className="font-mono tabular-nums">{fmtDate(flight.date)}</span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">
                      <span className="inline-flex items-center gap-1.5">
                        <RouteEnd
                          part={splitAirportLabel(flight.departureIcao, flight.departureAirportName)}
                          both={routeIsFreeText(flight)}
                        />
                        <ArrowRight className="w-3.5 h-3.5 shrink-0 text-blue-500 dark:text-blue-400" aria-hidden="true" />
                        <RouteEnd
                          part={splitAirportLabel(flight.arrivalIcao, flight.arrivalAirportName)}
                          both={routeIsFreeText(flight)}
                        />
                        {flight.signatureId && (
                          <>
                            <ShieldCheck
                              className="w-3.5 h-3.5 text-green-600 dark:text-green-400 shrink-0"
                              aria-hidden="true"
                            />
                            <span className="sr-only">{t('flights:signed')}</span>
                          </>
                        )}
                      </span>
                    </td>
                    <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <span className="font-medium">{flight.aircraftReg}</span>
                      <span className="text-slate-400 dark:text-slate-500 ml-1">({flight.aircraftType})</span>
                    </td>
                    {columns.offOnBlock && (
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono tabular-nums text-xs">
                        {flight.offBlockTime?.slice(0, 5) || '—'} / {flight.onBlockTime?.slice(0, 5) || '—'}
                      </td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap text-right font-semibold font-mono tabular-nums text-slate-800 dark:text-slate-100">
                      {fmtDuration(flight.totalTime)}
                    </td>
                    {columns.time.map((col) => {
                      const minutes = col.minutes(flight);
                      return (
                        <td
                          key={col.key}
                          className={`px-2 py-2 whitespace-nowrap text-right font-mono tabular-nums ${
                            minutes > 0 ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'
                          } ${col.revealClass}`}
                        >
                          {minutes > 0 ? fmtDuration(minutes) : '—'}
                        </td>
                      );
                    })}
                    {columns.function && (
                      <td className="px-3 py-2 whitespace-nowrap text-center">
                        {(() => {
                          const kind = flightFunctionKind(flight);
                          return (
                            <span className={`badge ${FLIGHT_FUNCTION_BADGE[kind]}`}>
                              {flightFunctionLabel(kind, (k) => t(`flights:${k}`))}
                            </span>
                          );
                        })()}
                      </td>
                    )}
                    {columns.landings && (
                      <td className="px-3 py-2 whitespace-nowrap text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                        {flight.allLandings}
                      </td>
                    )}
                    {columns.remarksRevealClass && (
                      <td className={`px-3 py-2 text-slate-500 dark:text-slate-400 ${columns.remarksRevealClass}`}>
                        <span className="block max-w-[28ch] truncate" title={flight.remarks || undefined}>
                          {flight.remarks || '—'}
                        </span>
                      </td>
                    )}
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(flight.id); }}
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mr-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
                        aria-label={t('flights:editFlightAriaLabel', { departure: flight.departureIcao || '', arrival: flight.arrivalIcao || '' })}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(flight.id); }}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
                        aria-label={t('flights:deleteFlightAriaLabel', { departure: flight.departureIcao || '', arrival: flight.arrivalIcao || '' })}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination — the table only; the card list scrolls instead */}
          {isWide && pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => goToPage(Math.max(1, page - 1))}
                disabled={page <= 1}
                className="btn-secondary text-sm"
              >
                {t('flights:previous')}
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {t('flights:pagination', { page: pagination.page, totalPages: pagination.totalPages })}
              </span>
              <button
                onClick={() => goToPage(Math.min(pagination.totalPages, page + 1))}
                disabled={page >= pagination.totalPages}
                className="btn-secondary text-sm"
              >
                {t('flights:next')}
              </button>
            </div>
          )}
        </>
      )}

      {/* Delete Confirm Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title={t('flights:deleteTitle')}
        description={t('flights:deleteDescription')}
        confirmLabel={t('flights:deleteFlight')}
        variant="danger"
        isLoading={deleteFlight.isPending}
      />
    </PageWrapper>
  );
}
