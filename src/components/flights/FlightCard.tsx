import { format } from 'date-fns';
import { Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { components } from '../../api/schema';
import { formatDuration, type TimeDisplayFormat } from '../../lib/duration';
import { useAuthStore } from '../../stores/authStore';

type Flight = components['schemas']['Flight'];

interface FlightCardProps {
  flight: Flight;
  onEdit: () => void;
  onDelete: () => void;
  onClick: () => void;
}

export default function FlightCard({ flight, onEdit, onDelete, onClick }: FlightCardProps) {
  const { t } = useTranslation('flights');
  const totalLandings = flight.landingsDay + flight.landingsNight;
  const fmt = (useAuthStore.getState().user?.timeDisplayFormat as TimeDisplayFormat) ?? 'hm';

  return (
    <div
      className="card hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
      aria-label={`Flight ${flight.departureIcao || '—'} to ${flight.arrivalIcao || '—'} on ${format(new Date(flight.date), 'MMM dd, yyyy')}, ${formatDuration(flight.totalTime, fmt)}`}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
            {flight.departureIcao || '—'} → {flight.arrivalIcao || '—'}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {format(new Date(flight.date), 'MMM dd, yyyy')}
            {(flight.offBlockTime || flight.departureTime || flight.arrivalTime || flight.onBlockTime) && (
              <span className="ml-2 font-mono tabular-nums text-xs">
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
        <span className="badge-info font-semibold">
          {formatDuration(flight.totalTime, fmt)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('fields.aircraftReg')}:</span>{' '}
          <span className="font-medium text-slate-700 dark:text-slate-200">{flight.aircraftReg}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('fields.aircraftType')}:</span>{' '}
          <span className="font-medium text-slate-700 dark:text-slate-200">{flight.aircraftType}</span>
        </div>
        {flight.picTime > 0 && (
          <div className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">{t('fields.picTime')}:</span> <span className="font-mono tabular-nums">{formatDuration(flight.picTime, fmt)}</span>
          </div>
        )}
        {flight.dualTime > 0 && (
          <div className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">{t('fields.dualTime')}:</span> <span className="font-mono tabular-nums">{formatDuration(flight.dualTime, fmt)}</span>
          </div>
        )}
        {!flight.isPic && !flight.isDual && (
          <div className="text-slate-500 dark:text-slate-400">
            <span>Function:</span> —
          </div>
        )}
        {flight.nightTime > 0 && (
          <div className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">{t('fields.nightTime')}:</span> <span className="font-mono tabular-nums">{formatDuration(flight.nightTime, fmt)}</span>
          </div>
        )}
        {flight.ifrTime > 0 && (
          <div className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">{t('fields.ifrTime')}:</span> <span className="font-mono tabular-nums">{formatDuration(flight.ifrTime, fmt)}</span>
          </div>
        )}
        {totalLandings > 0 && (
          <div className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">{t('fields.landings')}:</span> <span className="font-mono tabular-nums">{flight.landingsDay}D / {flight.landingsNight}N</span>
          </div>
        )}
      </div>

      {flight.remarks && (
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 italic truncate">{flight.remarks}</p>
      )}

      <div className="flex gap-2 mt-4 pt-3 border-t border-slate-200 dark:border-slate-700">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          className="btn-secondary btn-sm flex-1"
          aria-label={`Edit flight ${flight.departureIcao || ''} to ${flight.arrivalIcao || ''}`}
        >
          <Pencil className="w-3.5 h-3.5" />
          Edit
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="btn-secondary btn-sm flex-1 hover:bg-red-50 hover:text-red-700 hover:border-red-200 dark:hover:bg-red-900/20 dark:hover:text-red-400"
          aria-label={`Delete flight ${flight.departureIcao || ''} to ${flight.arrivalIcao || ''}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}
