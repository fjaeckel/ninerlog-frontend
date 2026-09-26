import { Fragment, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate, useLocation, useSearchParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { Archive, ArrowDown, ArrowRight, ArrowUp, BookmarkPlus, FileSpreadsheet, ListFilter, Loader2, Pencil, Plane, Plus, Trash2, ShieldCheck } from 'lucide-react';
import { useFlights, useInfiniteFlights, useDeleteFlight } from '../../hooks/useFlights';
import HelpLink from '../../components/ui/HelpLink';
import { useLicenses } from '../../hooks/useLicenses';
import FlightForm from '../../components/flights/FlightForm';
import { FlightSavedNotice, type SavedFlights } from '../../components/flights/FlightSavedNotice';
import { prefillFromFlight, type FlightPrefill } from '../../components/flights/logAnother';
import FlightCard from '../../components/flights/FlightCard';
import FlightSearchBar from '../../components/flights/FlightSearchBar';
import { CustomReportDialog } from '../../components/reports/CustomReportDialog';
import { definitionFromSearchParams } from '../../lib/customReports';
import { exportFlightSearchCSV } from '../../hooks/useExport';
import { DeleteFlightDialog } from '../../components/logbook/DeleteFlightDialog';
import { useLogbookMode } from '../../hooks/useLogbook';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { FormModal } from '../../components/ui/FormModal';
import { PageHeader, PageWrapper } from '../../components/ui/PageWrapper';
import { SkeletonList } from '../../components/ui/Skeleton';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { useFlightColumnPrefs } from '../../hooks/useFlightColumnPrefs';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { selectFlightColumns, selectFlightCardColumns, flightFunctionKind, flightFunctionLabel, hasLaunchMethod, landingsText, FLIGHT_FUNCTION_BADGE } from '../../components/flights/flightTableColumns';
import { useFlightColumnRelevance } from '../../hooks/useFlightColumnRelevance';
import { isSearchWorthSending, SEARCH_DEBOUNCE_MS } from '../../lib/flightSearchQuery';
import { abbreviateSiteName, splitAirportLabel, type AirportParts } from '../../lib/airport';
import type { components, operations } from '../../api/schema';
import {
  FLIGHT_LIST_PAGE_SIZE,
  flightListQueryFromSearch,
  FLIGHT_SORT_FIELDS as SORT_FIELDS,
  type FlightSortField as SortField,
} from './flightListQuery';

type Flight = components['schemas']['Flight'];
type ListFlightsParams = operations['listFlights']['parameters']['query'];

/** A secondary toolbar action: icon-only on phones, labelled from `sm`. */
const TOOLBAR_ACTION =
  'inline-flex items-center justify-center gap-1.5 w-11 sm:w-auto sm:px-3 h-11 rounded-lg text-sm font-medium transition-colors border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700';

/** Keeps the edit/delete column on screen while the table scrolls sideways. */
const PINNED_CELL = 'sticky right-0 z-[1] shadow-[-8px_0_8px_-8px_rgb(15_23_42/0.15)]';

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
    timeZone: 'UTC',
  });
}

export default function FlightsPage() {
  const { t, i18n } = useTranslation(['flights', 'common']);
  // At `lg` the table takes over from the card list; only one query runs.
  const isWide = useMediaQuery('(min-width: 1024px)');
  const { fmtDate, fmtDuration, fmtTimeOfDay } = useFormatPrefs();
  const columnPrefs = useFlightColumnPrefs();
  const selfName = useAuthStore((s) => s.user?.name);
  const navigate = useNavigate();
  const location = useLocation();
  const deleteFlight = useDeleteFlight();
  const { data: logbookMode } = useLogbookMode();
  const showVoidedLink = logbookMode?.strict === true || (logbookMode?.voidedCount ?? 0) > 0;

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
  const [saved, setSaved] = useState<SavedFlights | null>(null);
  const [prefill, setPrefill] = useState<FlightPrefill | null>(null);
  // Filters restored from the URL start expanded.
  const [showFilters, setShowFilters] = useState(
    () => !!(startDate || endDate || aircraftReg || departureIcao || arrivalIcao || functionFilter)
  );
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [showSaveReport, setShowSaveReport] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportCsvError, setExportCsvError] = useState(false);

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
    pageSize: FLIGHT_LIST_PAGE_SIZE,
    ...flightListQueryFromSearch(searchParams),
  };

  // The search without the page: the export carries every match.
  const exportCsv = async () => {
    const query = { ...params };
    delete query.page;
    delete query.pageSize;
    setExportingCsv(true);
    setExportCsvError(false);
    try {
      await exportFlightSearchCSV(query);
    } catch {
      setExportCsvError(true);
    } finally {
      setExportingCsv(false);
    }
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
  const columnRelevance = useFlightColumnRelevance();
  const columns = useMemo(
    () => selectFlightColumns(flights, columnPrefs, columnRelevance),
    [flights, columnPrefs, columnRelevance]
  );
  // One set of time columns for every card on the page.
  const cardColumns = useMemo(
    () => selectFlightCardColumns(flights, columnPrefs, columnRelevance),
    [flights, columnPrefs, columnRelevance]
  );
  // A flight's 0-based position in the whole list, for previous/next on its page.
  const listOffset = isWide ? (page - 1) * FLIGHT_LIST_PAGE_SIZE : 0;
  const indexById = useMemo(() => new Map(flights.map((f, i) => [f.id, listOffset + i])), [flights, listOffset]);
  const openFlight = (id: string) =>
    navigate(`/flights/${id}`, { state: { listSearch: location.search, listIndex: indexById.get(id) } });

  // Month headings with running totals for the mobile card list.
  // Whole-month sums from the API, by YYYY-MM.
  const monthTotals = useMemo(
    () =>
      new Map(
        (isWide ? data?.monthTotals ?? [] : (infinite.data?.pages ?? []).flatMap((p) => p.monthTotals ?? [])).map(
          (m) => [m.month, m.totals]
        )
      ),
    [isWide, data, infinite.data]
  );
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

  const confirmDelete = async (reason?: string) => {
    if (deleteTarget) {
      await deleteFlight.mutateAsync({ id: deleteTarget, reason });
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
    setPrefill(null);
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
  const lastPage = isWide ? data : infinitePages?.[infinitePages.length - 1];
  const pagination = lastPage?.pagination;
  // Sums over every flight matching the view, not just what is loaded.
  const listTotals = lastPage?.totals;
  const monthSummary = (group: FlightGroup) =>
    t('flights:monthTotal', {
      count: monthTotals.get(group.key)?.flights ?? group.flights.length,
      duration: fmtDuration(monthTotals.get(group.key)?.totalTime ?? group.totalMinutes),
    });

  // Enough for a month heading to span whatever the table is currently showing.
  const tableColumnCount =
    5 +
    columns.time.length +
    columns.details.length +
    (columns.offOnBlock ? 1 : 0) +
    (columns.launch ? 1 : 0) +
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
          <div className="flex flex-wrap items-center gap-2">
            {showVoidedLink && (
              <Link to="/flights/voided" className="btn-secondary whitespace-nowrap">
                <Archive className="w-4 h-4" aria-hidden="true" />
                {t('logbook:voided.link')}
              </Link>
            )}
            <button onClick={() => setShowForm(true)} className="btn-primary whitespace-nowrap">
              <Plus className="w-4 h-4" aria-hidden="true" />
              {t('flights:logFlight')}
            </button>
          </div>
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

      {/* Filter toggle, actions and sort */}
      <div className="flex flex-col gap-2 mb-4 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-expanded={showFilters}
            className={`inline-flex items-center gap-1.5 px-3 h-11 rounded-lg text-sm font-medium transition-colors border ${
              showFilters || activeFilterCount > 0
                ? 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            <ListFilter className="w-4 h-4" aria-hidden="true" />
            {t('flights:filters')}{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </button>
          {activeFilterCount > 0 && (
            <button onClick={clearFilters} className="text-xs text-blue-600 dark:text-blue-400 hover:underline h-11 px-1 flex items-center">
              {t('flights:clearAll')}
            </button>
          )}
          <div className="flex-1 sm:hidden" />
          <button
            onClick={() => setShowSaveReport(true)}
            title={t('flights:saveAsReport')}
            className={TOOLBAR_ACTION}
          >
            <BookmarkPlus className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only sm:not-sr-only">{t('flights:saveAsReport')}</span>
          </button>
          <button
            onClick={exportCsv}
            disabled={exportingCsv}
            aria-busy={exportingCsv}
            title={t('flights:exportCsv')}
            className={TOOLBAR_ACTION}
          >
            {exportingCsv ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            ) : (
              <FileSpreadsheet className="w-4 h-4" aria-hidden="true" />
            )}
            <span className="sr-only sm:not-sr-only">
              {exportingCsv ? t('flights:exportingCsv') : t('flights:exportCsv')}
            </span>
          </button>
        </div>
        <div className="hidden sm:block sm:flex-1" />
        <div className="flex items-center gap-2">
          <span className="hidden sm:inline text-xs text-slate-500 dark:text-slate-400">{t('flights:sort')}</span>
          <div className="segmented w-full sm:w-auto" role="group" aria-label={t('flights:sort')}>
            {(['date', 'totalTime', 'createdAt'] as const).map((field) => (
              <button
                key={field}
                onClick={() => toggleSort(field)}
                aria-pressed={sortBy === field}
                className="segment flex-1 sm:flex-none"
              >
                {field === 'date' ? t('flights:sortDate') : field === 'totalTime' ? t('flights:sortHours') : t('flights:sortAdded')}
                {sortBy === field &&
                  (sortOrder === 'asc' ? (
                    <ArrowUp className="w-3.5 h-3.5" aria-hidden="true" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5" aria-hidden="true" />
                  ))}
              </button>
            ))}
          </div>
        </div>
        {exportCsvError && (
          <p role="alert" className="text-xs text-red-600 dark:text-red-400 sm:basis-full">
            {t('flights:exportCsvFailed')}
          </p>
        )}
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
                maxLength={10}
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
                maxLength={10}
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
        <FlightForm flightId={editingFlight} onClose={handleCloseForm} prefill={prefill} onSaved={setSaved} />
      </FormModal>
      {saved && !showForm && (
        <FlightSavedNotice
          saved={saved}
          onDismiss={setSaved}
          onLogAnother={(flight) => {
            setSaved(null);
            setEditingFlight(null);
            setPrefill(prefillFromFlight(flight));
            setShowForm(true);
          }}
        />
      )}

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
            {listTotals && (
              <section
                aria-label={t('flights:totalsSummaryLabel')}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-800"
                data-testid="flight-totals-strip"
              >
                <p className="bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:bg-slate-700/40 dark:text-slate-300">
                  {t('flights:totalsHeading')}
                  <span className="ml-2 font-normal text-slate-400 dark:text-slate-500">
                    {t('flights:totalsRow', { count: listTotals.flights })}
                  </span>
                </p>
                <dl className="flex divide-x divide-slate-100 dark:divide-slate-700/60">
                  {[
                    { key: 'total', label: t('flights:tableTotal'), value: fmtDuration(listTotals.totalTime) },
                    ...cardColumns.time.map((col) => ({
                      key: col.key,
                      label: t(`flights:${col.labelKey}`),
                      value: fmtDuration(col.total(listTotals)),
                    })),
                    ...(cardColumns.landings
                      ? [
                          {
                            key: 'ldg',
                            label: cardColumns.landingsSplit ? t('flights:tableLdgSplit') : t('flights:tableLdg'),
                            value: landingsText(listTotals.landingsDay, listTotals.landingsNight, cardColumns.landingsSplit),
                          },
                        ]
                      : []),
                  ].map((cell) => (
                    <div key={cell.key} className="min-w-0 flex-1 px-1 py-1.5 text-center">
                      <dt className="truncate text-xs font-medium uppercase leading-tight tracking-wider text-slate-400 dark:text-slate-500">
                        {cell.label}
                      </dt>
                      <dd className="truncate font-mono text-xs font-semibold leading-tight tabular-nums text-slate-700 dark:text-slate-200">
                        {cell.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            )}
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
                      {monthSummary(group)}
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
                      onClick={() => openFlight(flight.id)}
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
                  {columns.launch && (
                    <th title={t('flights:fields.launchMethod')} className="px-3 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400">{t('flights:tableLaunch')}</th>
                  )}
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
                    <th className="px-3 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">
                      {columns.landingsSplit ? t('flights:tableLdgSplit') : t('flights:tableLdg')}
                    </th>
                  )}
                  {columns.details.map((col) => (
                    <th
                      key={col.key}
                      title={t(`flights:${col.titleKey}`)}
                      className={`px-3 py-2.5 font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap ${col.numeric ? 'text-right' : 'text-left'} ${col.revealClass}`}
                    >
                      {t(`flights:${col.labelKey}`)}
                    </th>
                  ))}
                  {columns.remarksRevealClass && (
                    <th className={`px-3 py-2.5 text-left font-medium text-slate-500 dark:text-slate-400 ${columns.remarksRevealClass}`}>
                      {t('flights:tableRemarks')}
                    </th>
                  )}
                  <th className={`px-3 py-2.5 text-right font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 ${PINNED_CELL}`} />
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
                            {monthSummary(group)}
                          </span>
                        </th>
                      </tr>
                    )}
                    {group.flights.map((flight) => (
                  <tr
                    key={flight.id}
                    className="group hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                    onClick={() => openFlight(flight.id)}
                  >
                    <td className="px-3 py-2 whitespace-nowrap text-slate-800 dark:text-slate-200">
                      <span className="text-xs text-slate-400 dark:text-slate-500">
                        {new Date(`${flight.date}T00:00:00Z`).toLocaleDateString(i18n.language, { weekday: 'short', timeZone: 'UTC' })}
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
                    {columns.launch && (
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300" data-testid="launch-cell">
                        {hasLaunchMethod(flight)
                          ? t('flights:launchCell', {
                              method: t(`flights:launchMethods.${flight.launchMethod === 'self-launch' ? 'selfLaunch' : flight.launchMethod}`),
                              count: flight.launches ?? 1,
                            })
                          : '—'}
                      </td>
                    )}
                    {columns.offOnBlock && (
                      <td className="px-3 py-2 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono tabular-nums text-xs">
                        {fmtTimeOfDay(flight.offBlockTime) || '—'} / {fmtTimeOfDay(flight.onBlockTime) || '—'}
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
                        {landingsText(flight.landingsDay, flight.landingsNight, columns.landingsSplit)}
                      </td>
                    )}
                    {columns.details.map((col) => {
                      const text = col.text(flight, (k, o) => t(`flights:${k}`, o ?? {}), fmtTimeOfDay, selfName);
                      return (
                        <td
                          key={col.key}
                          className={`px-3 py-2 whitespace-nowrap ${
                            col.numeric ? 'text-right font-mono tabular-nums' : 'text-left'
                          } ${text ? 'text-slate-600 dark:text-slate-300' : 'text-slate-300 dark:text-slate-600'} ${col.revealClass}`}
                        >
                          <span className="block max-w-[16ch] truncate" title={text || undefined}>
                            {text || '—'}
                          </span>
                        </td>
                      );
                    })}
                    {columns.remarksRevealClass && (
                      <td className={`px-3 py-2 text-slate-500 dark:text-slate-400 ${columns.remarksRevealClass}`}>
                        <span className="block max-w-[28ch] truncate" title={flight.remarks || undefined}>
                          {flight.remarks || '—'}
                        </span>
                      </td>
                    )}
                    <td
                      className={`px-3 py-2 whitespace-nowrap text-right bg-white dark:bg-slate-800 group-hover:bg-slate-50 dark:group-hover:bg-[color-mix(in_srgb,var(--color-slate-700)_40%,var(--color-slate-800))] transition-colors ${PINNED_CELL}`}
                      data-testid="flight-row-actions"
                    >
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(flight.id); }}
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mr-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
                        aria-label={t('flights:editFlightAriaLabel', { departure: flight.departureIcao || '', arrival: flight.arrivalIcao || '' })}
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      {flight.signatureId ? (
                        <span
                          role="img"
                          className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center text-slate-300 dark:text-slate-600 cursor-not-allowed"
                          title={t('logbook:delete.signedHint')}
                          aria-label={t('logbook:delete.signedHint')}
                        >
                          <Trash2 className="w-4 h-4" aria-hidden="true" />
                        </span>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDelete(flight.id); }}
                          className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
                          aria-label={t('flights:deleteFlightAriaLabel', { departure: flight.departureIcao || '', arrival: flight.arrivalIcao || '' })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
              {listTotals && (
                <tfoot
                  className="border-t-2 border-slate-200 bg-slate-50 font-semibold dark:border-slate-600 dark:bg-slate-800/60"
                  data-testid="flight-totals-row"
                >
                  <tr>
                    <th
                      scope="row"
                      colSpan={3 + (columns.offOnBlock ? 1 : 0)}
                      className="px-3 py-2.5 text-left text-slate-700 dark:text-slate-200"
                    >
                      {t('flights:tableTotalsLabel')}
                      <span className="ml-2 font-normal text-slate-400 dark:text-slate-500">
                        {t('flights:totalsRow', { count: listTotals.flights })}
                      </span>
                    </th>
                    <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono tabular-nums text-slate-800 dark:text-slate-100">
                      {fmtDuration(listTotals.totalTime)}
                    </td>
                    {columns.time.map((col) => (
                      <td
                        key={col.key}
                        className={`px-2 py-2.5 whitespace-nowrap text-right font-mono tabular-nums text-slate-700 dark:text-slate-200 ${col.revealClass}`}
                      >
                        {fmtDuration(col.total(listTotals))}
                      </td>
                    ))}
                    {columns.function && <td />}
                    {columns.landings && (
                      <td className="px-3 py-2.5 whitespace-nowrap text-right font-mono tabular-nums text-slate-700 dark:text-slate-200">
                        {landingsText(listTotals.landingsDay, listTotals.landingsNight, columns.landingsSplit)}
                      </td>
                    )}
                    {columns.details.map((col) => (
                      <td
                        key={col.key}
                        className={`px-3 py-2.5 whitespace-nowrap text-right font-mono tabular-nums text-slate-700 dark:text-slate-200 ${col.revealClass}`}
                      >
                        {col.total?.(listTotals) ?? ''}
                      </td>
                    ))}
                    {columns.remarksRevealClass && <td className={columns.remarksRevealClass} />}
                    <td className={`bg-slate-50 dark:bg-slate-800 ${PINNED_CELL}`} />
                  </tr>
                </tfoot>
              )}
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

      {showSaveReport && (
        <CustomReportDialog
          open
          onClose={() => setShowSaveReport(false)}
          initialDefinition={definitionFromSearchParams(searchParams)}
        />
      )}

      {/* Delete Confirm Dialog */}
      <DeleteFlightDialog
        open={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isLoading={deleteFlight.isPending}
      />
    </PageWrapper>
  );
}
