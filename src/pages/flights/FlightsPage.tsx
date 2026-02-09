import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { format } from 'date-fns';
import { useFlights, useDeleteFlight } from '../../hooks/useFlights';
import { useLicenseStore } from '../../stores/licenseStore';
import FlightForm from '../../components/flights/FlightForm';
import type { operations } from '../../api/schema';

type ListFlightsParams = operations['listFlights']['parameters']['query'];

export default function FlightsPage() {
  const { activeLicense } = useLicenseStore();
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState<'date' | 'totalTime' | 'createdAt'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [showForm, setShowForm] = useState(false);
  const [editingFlight, setEditingFlight] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const deleteFlight = useDeleteFlight();

  // Open form modal when navigated with state.openForm (e.g. from bottom nav + button)
  useEffect(() => {
    if ((location.state as any)?.openForm) {
      setShowForm(true);
      // Clear the state so refreshing doesn't re-open
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state, location.pathname, navigate]);

  const params: ListFlightsParams = {
    licenseId: activeLicense?.id,
    page,
    pageSize: 20,
    sortBy,
    sortOrder,
  };

  const { data, isLoading, error } = useFlights(params);

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this flight?')) {
      await deleteFlight.mutateAsync(id);
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
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">Something went wrong</h2>
          <p className="text-slate-500 dark:text-slate-400">Error loading flights. Please try again.</p>
        </div>
      </div>
    );
  }

  const flights = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="mx-auto max-w-[960px] py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="page-title">Flight Log</h1>
          {pagination && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              {pagination.total} flight{pagination.total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          + Log Flight
        </button>
      </div>

      {/* Sort controls */}
      <div className="flex gap-2 mb-4 text-sm">
        <span className="text-slate-500 dark:text-slate-400 py-1">Sort by:</span>
        {(['date', 'totalTime', 'createdAt'] as const).map((field) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={`px-3 py-1 rounded-full transition-colors ${
              sortBy === field
                ? 'bg-blue-100 text-blue-700 font-medium dark:bg-blue-900/30 dark:text-blue-400'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
            }`}
          >
            {field === 'date' ? 'Date' : field === 'totalTime' ? 'Hours' : 'Added'}
            {sortBy === field && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
          </button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" role="dialog" aria-modal="true" aria-labelledby="flight-form-title">
          <div className="bg-white dark:bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 id="flight-form-title" className="text-xl font-semibold text-slate-800 dark:text-slate-100">
                  {editingFlight ? 'Edit Flight' : 'Log New Flight'}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Close"
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
          <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">No flights logged yet</h2>
          <p className="text-slate-500 dark:text-slate-400 mb-6">
            Start building your logbook by adding your first flight.
          </p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            + Log Your First Flight
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto card p-0">
            <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700 text-sm" aria-label="Flight log">
              <thead className="bg-slate-50 dark:bg-slate-800/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Route</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Aircraft</th>
                  <th className="px-4 py-3 text-left font-medium text-slate-500 dark:text-slate-400">Off / On Block</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">Total</th>
                  <th className="px-4 py-3 text-center font-medium text-slate-500 dark:text-slate-400">Function</th>
                  <th className="px-4 py-3 text-right font-medium text-slate-500 dark:text-slate-400">Ldg</th>
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
                      {format(new Date(flight.date), 'dd MMM yyyy')}
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
                      {flight.totalTime.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                        flight.isPic
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : flight.isDual
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                            : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400'
                      }`}>
                        {flight.isPic ? 'PIC' : flight.isDual ? 'DUAL' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-mono tabular-nums text-slate-600 dark:text-slate-300">
                      {flight.landingsDay + flight.landingsNight}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(flight.id); }}
                        className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 mr-2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(flight.id); }}
                        className="text-slate-400 hover:text-red-600 dark:hover:text-red-400 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
                        title="Delete"
                      >
                        ✕
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
                Previous
              </button>
              <span className="text-sm text-slate-600 dark:text-slate-400">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="btn-secondary text-sm"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
