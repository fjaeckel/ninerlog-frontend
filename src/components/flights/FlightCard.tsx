import { format } from 'date-fns';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

interface FlightCardProps {
  flight: Flight;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

export default function FlightCard({ flight, onEdit, onDelete, onClick }: FlightCardProps) {
  const totalLandings = flight.landingsDay + flight.landingsNight;

  return (
    <div className="card hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-lg font-semibold">
            {flight.departureIcao || '—'} → {flight.arrivalIcao || '—'}
          </h3>
          <p className="text-sm text-gray-600">
            {format(new Date(flight.date), 'MMM dd, yyyy')}
            {(flight.offBlockTime || flight.departureTime || flight.arrivalTime || flight.onBlockTime) && (
              <span className="ml-2">
                {(flight.offBlockTime || flight.departureTime)
                  ? (flight.offBlockTime || flight.departureTime)!.slice(0, 5)
                  : '—'}
                {' → '}
                {(flight.onBlockTime || flight.arrivalTime)
                  ? (flight.onBlockTime || flight.arrivalTime)!.slice(0, 5)
                  : '—'}
              </span>
            )}
          </p>
        </div>
        <span className="px-2 py-1 text-xs bg-primary-100 text-primary-700 rounded-full font-medium">
          {flight.totalTime.toFixed(1)}h
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="text-gray-500">Aircraft:</span>{' '}
          <span className="font-medium">{flight.aircraftReg}</span>
        </div>
        <div>
          <span className="text-gray-500">Type:</span>{' '}
          <span className="font-medium">{flight.aircraftType}</span>
        </div>
        {flight.picTime > 0 && (
          <div>
            <span className="text-gray-500">PIC:</span> {flight.picTime.toFixed(1)}h
          </div>
        )}
        {flight.dualTime > 0 && (
          <div>
            <span className="text-gray-500">Dual:</span> {flight.dualTime.toFixed(1)}h
          </div>
        )}
        {!flight.isPic && !flight.isDual && (
          <div>
            <span className="text-gray-500">Function:</span> —
          </div>
        )}
        {flight.nightTime > 0 && (
          <div>
            <span className="text-gray-500">Night:</span> {flight.nightTime.toFixed(1)}h
          </div>
        )}
        {flight.ifrTime > 0 && (
          <div>
            <span className="text-gray-500">IFR:</span> {flight.ifrTime.toFixed(1)}h
          </div>
        )}
        {totalLandings > 0 && (
          <div>
            <span className="text-gray-500">Landings:</span> {flight.landingsDay}D / {flight.landingsNight}N
          </div>
        )}
      </div>

      {flight.remarks && (
        <p className="mt-2 text-sm text-gray-500 italic truncate">{flight.remarks}</p>
      )}

      <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="btn-secondary flex-1 text-sm py-1"
        >
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="btn-secondary flex-1 text-sm py-1 hover:bg-red-50 hover:text-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
