import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFlights, useDeleteFlight } from '../../hooks/useFlights';
import { useLicenseStore } from '../../stores/licenseStore';
import FlightForm from '../../components/flights/FlightForm';
import FlightCard from '../../components/flights/FlightCard';
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
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {flights.map((flight) => (
              <FlightCard
                key={flight.id}
                flight={flight}
                onEdit={() => handleEdit(flight.id)}
                onDelete={() => handleDelete(flight.id)}
                onClick={() => navigate(`/flights/${flight.id}`)}
              />
            ))}
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
