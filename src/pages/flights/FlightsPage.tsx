import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Pencil, Trash2, Search, X } from 'lucide-react';
import { useFlights, useDeleteFlight } from '../../hooks/useFlights';
import HelpLink from '../../components/ui/HelpLink';
import { useLicenses } from '../../hooks/useLicenses';
import FlightForm from '../../components/flights/FlightForm';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import type { operations } from '../../api/schema';

type ListFlightsParams = operations['listFlights']['parameters']['query'];

export default function FlightsPage() {
  const { t } = useTranslation(['flights', 'common']);
  const { fmtDate, fmtDuration } = useFormatPrefs();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'totalTime' | 'createdAt'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showForm, setShowForm] = useState(() => {
    const state = location.state as Record<string, unknown> | null;
    return !!state?.openForm;
  });
  const [editingFlight, setEditingFlight] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const deleteFlight = useDeleteFlight();

  // Search & filter state
  const [search, setSearch] = useState('');
  const [searchDebounced, setSearchDebounced] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [aircraftReg, setAircraftReg] = useState('');
  const [departureIcao, setDepartureIcao] = useState('');
  const [arrivalIcao, setArrivalIcao] = useState('');
  const [functionFilter, setFunctionFilter] = useState<'' | 'pic' | 'dual'>('');
  const [logbookLicenseId, setLogbookLicenseId] = useState<string>('');

  const { data: licenses } = useLicenses();
  const separateLogbookLicenses = licenses?.filter((l) => l.requiresSeparateLogbook) || [];

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchDebounced(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Open form modal when navigated with state.openForm (e.g. from bottom nav + button)
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
      // Clear the state so refreshing doesn't re-open
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [shouldOpenForm, location.pathname, navigate]);

  const params: ListFlightsParams = {
    page,
    pageSize: 20,
    sortBy,
    sortOrder,
    ...(searchDebounced ? { search: searchDebounced } : {}),
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
    setSearch('');
    setStartDate('');
    setEndDate('');
    setAircraftReg('');
    setDepartureIcao('');
    setArrivalIcao('');
    setFunctionFilter('');
    setPage(1);
  }, []);

  const { data, isLoading, error } = useFlights(params);

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

  const toggleSort = (field: 'date' | 'totalTime' | 'createdAt') => {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[960px] py-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-48"></div>
          <div className="card p-0">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="px-4 py-4 border-b border-slate-100 dark:border-slate-700 last:border-0">
                <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[960px] py-6">
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">⚠</div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('flights:errorTitle')}</h2>
          <p className="text-slate-500 dark:text-slate-400">{t('flights:errorDescription')}</p>
        </div>
      </div>
    );
  }

  const flights = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="mx-auto max-w-[960px] py-6">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="page-title">{t('flights:pageTitle')}</h1>
          {pagination && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex items-center gap-2">
              {t('flights:flightsTotal', { count: pagination.total })}
              <HelpLink topic="flights" />
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + {t('flights:logFlight')}
        </button>
      </div>

      {/* Logbook Selector — only shown if separate-logbook licenses exist */}
      {separateLogbookLicenses.length > 0 && (
        <div className="mb-4 flex items-center gap-2">
          <label className="text-xs font-medium text-slate-500 dark:text-slate-400 whitespace-nowrap">{t('flights:logbook')}</label>
          <select
            value={logbookLicenseId}
            onChange={(e) => { setLogbookLicenseId(e.target.value); setPage(1); }}
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

      {/* Search Bar */}
      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('flights:searchPlaceholder')}
            className="input pl-10 pr-10"
            aria-label={t('flights:searchPlaceholder')}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 min-w-[44px] min-h-[44px] flex items-center justify-center -mr-3"
              aria-label={t('flights:clearSearch')}
            >
              <X className="w-4 h-4" />
            </button>
          )
          }
        </div>
      </div>

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
            className={`px-3 py-2 min-h-[44px] rounded-full text-xs transition-colors ${
              sortBy === field
                ? 'bg-blue-100 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {field === 'date' ? t('flights:sortDate') : field === 'totalTime' ? t('flights:sortHours') : t('flights:sortAdded')}
            {sortBy === field && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
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
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{t('flights:filterDateTo')}</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
                className="input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{t('flights:filterAircraftReg')}</label>
              <input
                type="text"
                value={aircraftReg}
                onChange={(e) => { setAircraftReg(e.target.value); setPage(1); }}
                placeholder="D-EFGH"
                className="input text-sm"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{t('flights:filterDepartureIcao')}</label>
              <input
                type="text"
                value={departureIcao}
                onChange={(e) => { setDepartureIcao(e.target.value.toUpperCase()); setPage(1); }}
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
                onChange={(e) => { setArrivalIcao(e.target.value.toUpperCase()); setPage(1); }}
                placeholder="EDDH"
                maxLength={4}
                className="input text-sm uppercase"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1 block">{t('flights:filterFunction')}</label>
              <select
                value={functionFilter}
                onChange={(e) => { setFunctionFilter(e.target.value as '' | 'pic' | 'dual'); setPage(1); }}
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
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="flight-form-title">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 id="flight-form-title" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  {editingFlight ? t('flights:editFlight') : t('flights:logNewFlight')}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label={t('common:close')}
                >
                  ✕
                </button>
              </div>
              <FlightForm flightId={editingFlight} onClose={handleCloseForm} />
            </div>
          </div>
        </div>
      )}

      {/* Flight List */}
      {flights.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-5xl mb-4">✈</div>
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">{t('flights:noFlights')}</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            {t('flights:startBuildingLogbook')}
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + {t('flights:logFirstFlight')}
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto card p-0">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm" aria-label={t('flights:pageTitle')}>
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('flights:tableDate')}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('flights:tableRoute')}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('flights:tableAircraft')}</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">{t('flights:tableOffOnBlock')}</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">{t('flights:tableTotal')}</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">{t('flights:tableFunction')}</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">{t('flights:tableLdg')}</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                {flights.map((flight) => (
                  <tr
                    key={flight.id}
                    className="hover:bg-slate-50 dark:hover:bg-slate-700/40 cursor-pointer transition-colors"
                    onClick={() => navigate(`/flights/${flight.id}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-slate-800 dark:text-slate-200">
                      {fmtDate(flight.date)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800 dark:text-slate-100">
                      {flight.departureIcao || '—'} → {flight.arrivalIcao || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300">
                      <span className="font-medium">{flight.aircraftReg}</span>
                      <span className="text-slate-400 dark:text-slate-500 ml-1">({flight.aircraftType})</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600 dark:text-slate-300 font-mono tabular-nums text-xs">
                      {flight.offBlockTime?.slice(0, 5) || '—'} / {flight.onBlockTime?.slice(0, 5) || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-semibold font-mono tabular-nums text-slate-800 dark:text-slate-100">
                      {fmtDuration(flight.totalTime)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`badge ${
                        flight.isPic
                          ? 'badge-info'
                          : flight.isDual
                            ? 'badge-expiring'
                            : 'badge-neutral'
                      }`}>
                        {flight.isPic ? 'PIC' : flight.isDual ? 'DUAL' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {flight.allLandings}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
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
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-4 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-secondary text-sm"
              >
                {t('flights:previous')}
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                {t('flights:pagination', { page: pagination.page, totalPages: pagination.totalPages })}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
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
    </div>
  );
}
