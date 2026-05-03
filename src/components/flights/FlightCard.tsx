import { Pencil, Trash2, PlaneTakeoff, PlaneLanding, Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { components } from '../../api/schema';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

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
  const { fmtDuration, fmtDate } = useFormatPrefs();

  const offBlock = (flight.offBlockTime || flight.departureTime)?.slice(0, 5);
  const onBlock = (flight.onBlockTime || flight.arrivalTime)?.slice(0, 5);

  return (
    <div
      className="card hover-lift tap-none"
      onClick={onClick}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick(); } }}
      role="button"
      tabIndex={0}
      aria-label={`Flight ${flight.departureIcao || '—'} to ${flight.arrivalIcao || '—'} on ${fmtDate(flight.date)}, ${fmtDuration(flight.totalTime)}`}
    >
      {/* Route hero */}
      <div className="flex items-center gap-3 mb-3">
        <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300 shrink-0" aria-hidden="true">
          <PlaneTakeoff className="w-[18px] h-[18px]" />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold font-mono tabular-nums text-slate-800 dark:text-slate-100 tracking-tight">
            {(flight.departureIcao || '—') + ' → ' + (flight.arrivalIcao || '—')}
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 inline-flex items-center gap-1.5 flex-wrap">
            <Calendar className="w-3 h-3" aria-hidden="true" />
            {fmtDate(flight.date)}
            {(offBlock || onBlock) && (
              <span className="font-mono tabular-nums">
                · {offBlock || '—'} → {onBlock || '—'}
              </span>
            )}
          </p>
        </div>
        <span className="badge-info font-semibold shrink-0">
          {fmtDuration(flight.totalTime)}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('fields.aircraftReg')}:</span>{' '}
          <span className="font-medium font-mono tabular-nums text-slate-700 dark:text-slate-200">{flight.aircraftReg}</span>
        </div>
        <div>
          <span className="text-slate-500 dark:text-slate-400">{t('fields.aircraftType')}:</span>{' '}
          <span className="font-medium text-slate-700 dark:text-slate-200">{flight.aircraftType}</span>
        </div>
        {flight.picTime > 0 && (
          <div className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">{t('fields.picTime')}:</span> <span className="font-mono tabular-nums">{fmtDuration(flight.picTime)}</span>
          </div>
        )}
        {flight.dualTime > 0 && (
          <div className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">{t('fields.dualTime')}:</span> <span className="font-mono tabular-nums">{fmtDuration(flight.dualTime)}</span>
          </div>
        )}
        {!flight.isPic && !flight.isDual && (
          <div className="text-slate-500 dark:text-slate-400">
            <span>Function:</span> —
          </div>
        )}
        {flight.nightTime > 0 && (
          <div className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">{t('fields.nightTime')}:</span> <span className="font-mono tabular-nums">{fmtDuration(flight.nightTime)}</span>
          </div>
        )}
        {flight.ifrTime > 0 && (
          <div className="text-slate-600 dark:text-slate-300">
            <span className="text-slate-500 dark:text-slate-400">{t('fields.ifrTime')}:</span> <span className="font-mono tabular-nums">{fmtDuration(flight.ifrTime)}</span>
          </div>
        )}
        {totalLandings > 0 && (
          <div className="text-slate-600 dark:text-slate-300 inline-flex items-center gap-1">
            <PlaneLanding className="w-3.5 h-3.5 text-slate-400" aria-hidden="true" />
            <span className="text-slate-500 dark:text-slate-400">{t('fields.landings')}:</span>
            <span className="font-mono tabular-nums">{flight.landingsDay}D / {flight.landingsNight}N</span>
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
