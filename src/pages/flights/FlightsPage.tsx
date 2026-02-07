import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const deleteFlight = useDeleteFlight();

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
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Loading flights...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-red-600">Error loading flights. Please try again.</div>
      </div>
    );
  }

  const flights = data?.data || [];
  const pagination = data?.pagination;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Flight Log</h1>
          {pagination && (
            <p className="text-sm text-gray-500 mt-1">
              {pagination.total} flight{pagination.total !== 1 ? 's' : ''} total
            </p>
          )}
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          Log Flight
        </button>
      </div>

      {/* Sort controls */}
      <div className="flex gap-2 mb-4 text-sm">
        <span className="text-gray-500 py-1">Sort by:</span>
        {(['date', 'totalTime', 'createdAt'] as const).map((field) => (
          <button
            key={field}
            onClick={() => toggleSort(field)}
            className={`px-3 py-1 rounded-full transition-colors ${
              sortBy === field
                ? 'bg-primary-100 text-primary-700 font-medium'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {field === 'date' ? 'Date' : field === 'totalTime' ? 'Hours' : 'Added'}
            {sortBy === field && (sortOrder === 'asc' ? ' ↑' : ' ↓')}
          </button>
        ))}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">
                  {editingFlight ? 'Edit Flight' : 'Log New Flight'}
                </h2>
                <button
                  onClick={handleCloseForm}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
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
          <p className="text-gray-600 mb-4">No flights logged yet.</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Log Your First Flight
          </button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto card p-0">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Route</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Aircraft</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Off / On Block</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Total</th>
                  <th className="px-4 py-3 text-center font-medium text-gray-500">Function</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Ldg</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {flights.map((flight) => (
                  <tr
                    key={flight.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => navigate(`/flights/${flight.id}`)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap text-gray-900">
                      {format(new Date(flight.date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap font-medium">
                      {flight.departureIcao || '—'} → {flight.arrivalIcao || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600">
                      <span className="font-medium">{flight.aircraftReg}</span>
                      <span className="text-gray-400 ml-1">({flight.aircraftType})</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-gray-600 tabular-nums">
                      {flight.offBlockTime?.slice(0, 5) || '—'} / {flight.onBlockTime?.slice(0, 5) || '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right font-semibold tabular-nums">
                      {flight.totalTime.toFixed(1)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                        flight.isPic
                          ? 'bg-blue-100 text-blue-700'
                          : flight.isDual
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-gray-100 text-gray-500'
                      }`}>
                        {flight.isPic ? 'PIC' : flight.isDual ? 'DUAL' : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right tabular-nums text-gray-600">
                      {flight.landingsDay + flight.landingsNight}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleEdit(flight.id); }}
                        className="text-gray-400 hover:text-primary-600 mr-2"
                        title="Edit"
                      >
                        ✎
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDelete(flight.id); }}
                        className="text-gray-400 hover:text-red-600"
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
                className="btn-secondary text-sm disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page >= pagination.totalPages}
                className="btn-secondary text-sm disabled:opacity-50"
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
