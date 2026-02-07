import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { useFlight, useDeleteFlight } from '../../hooks/useFlights';
import { useLicenses } from '../../hooks/useLicenses';
import FlightForm from '../../components/flights/FlightForm';

export default function FlightDetailPage() {
  const { flightId } = useParams<{ flightId: string }>();
  const navigate = useNavigate();
  const { data: flight, isLoading, error } = useFlight(flightId || '');
  const { data: licenses } = useLicenses();
  const deleteFlight = useDeleteFlight();
  const [showEditForm, setShowEditForm] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-600">Loading flight...</div>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-red-600 mb-4">Flight not found.</p>
          <button onClick={() => navigate('/flights')} className="btn-primary">
            Back to Flights
          </button>
        </div>
      </div>
    );
  }

  const license = licenses?.find((l) => l.id === flight.licenseId);
  const totalLandings = flight.landingsDay + flight.landingsNight;

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this flight?')) {
      await deleteFlight.mutateAsync(flight.id);
      navigate('/flights');
    }
  };

  const timeFields = [
    { label: 'Total Time', value: flight.totalTime },
    { label: 'Pilot Function', value: -1, text: flight.isPic ? 'PIC' : flight.isDual ? 'Dual' : '—' },
    { label: 'PIC Time', value: flight.picTime },
    { label: 'Dual Time', value: flight.dualTime },
    { label: 'Solo Time', value: flight.soloTime },
    { label: 'Night Time', value: flight.nightTime },
    { label: 'IFR Time', value: flight.ifrTime },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <button
            onClick={() => navigate('/flights')}
            className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-flex items-center"
          >
            ← Back to Flights
          </button>
          <h1 className="text-3xl font-bold">
            {flight.departureIcao || '—'} → {flight.arrivalIcao || '—'}
          </h1>
          <p className="text-gray-600">
            {format(new Date(flight.date), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowEditForm(true)} className="btn-secondary">
            Edit
          </button>
          <button
            onClick={handleDelete}
            className="btn-secondary hover:bg-red-50 hover:text-red-700"
          >
            Delete
          </button>
        </div>
      </div>

      {/* Edit Form Modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold">Edit Flight</h2>
                <button
                  onClick={() => setShowEditForm(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>
              <FlightForm flightId={flight.id} onClose={() => setShowEditForm(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Flight Details */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Aircraft & Route */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Aircraft & Route</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Aircraft</dt>
              <dd className="font-medium">{flight.aircraftReg} ({flight.aircraftType})</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Departure</dt>
              <dd className="font-medium">{flight.departureIcao || '—'}</dd>
            </div>
            {flight.offBlockTime && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Off-Block</dt>
                <dd className="font-medium">{flight.offBlockTime.slice(0, 5)} UTC</dd>
              </div>
            )}
            {flight.departureTime && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Takeoff</dt>
                <dd className="font-medium">{flight.departureTime.slice(0, 5)} UTC</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-gray-500">Arrival</dt>
              <dd className="font-medium">{flight.arrivalIcao || '—'}</dd>
            </div>
            {flight.arrivalTime && (
              <div className="flex justify-between">
                <dt className="text-gray-500">Landing</dt>
                <dd className="font-medium">{flight.arrivalTime.slice(0, 5)} UTC</dd>
              </div>
            )}
            {flight.onBlockTime && (
              <div className="flex justify-between">
                <dt className="text-gray-500">On-Block</dt>
                <dd className="font-medium">{flight.onBlockTime.slice(0, 5)} UTC</dd>
              </div>
            )}
            {license && (
              <div className="flex justify-between">
                <dt className="text-gray-500">License</dt>
                <dd className="font-medium">
                  {license.licenseType.replace('_', ' ')}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Flight Times */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Flight Times</h2>
          <dl className="space-y-3">
            {timeFields.map(({ label, value, text }) => (
              <div key={label} className="flex justify-between">
                <dt className="text-gray-500">{label}</dt>
                <dd className={`font-medium ${value > 0 || text ? '' : 'text-gray-400'}`}>
                  {text ?? `${value.toFixed(1)}h`}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Landings */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Landings</h2>
          <dl className="space-y-3">
            <div className="flex justify-between">
              <dt className="text-gray-500">Day Landings</dt>
              <dd className="font-medium">{flight.landingsDay}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-gray-500">Night Landings</dt>
              <dd className="font-medium">{flight.landingsNight}</dd>
            </div>
            <div className="flex justify-between border-t pt-2">
              <dt className="text-gray-500 font-medium">Total Landings</dt>
              <dd className="font-bold">{totalLandings}</dd>
            </div>
          </dl>
        </div>

        {/* Remarks */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Remarks</h2>
          {flight.remarks ? (
            <p className="text-gray-700 whitespace-pre-wrap">{flight.remarks}</p>
          ) : (
            <p className="text-gray-400 italic">No remarks</p>
          )}
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-6 text-xs text-gray-400 text-center">
        Created {format(new Date(flight.createdAt), 'MMM d, yyyy HH:mm')}
        {flight.updatedAt !== flight.createdAt &&
          ` · Updated ${format(new Date(flight.updatedAt), 'MMM d, yyyy HH:mm')}`}
      </div>
    </div>
  );
}
