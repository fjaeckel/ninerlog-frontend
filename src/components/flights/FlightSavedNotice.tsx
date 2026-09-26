import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, X } from 'lucide-react';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

/** What a save produced: how many flights, and the flight when there is exactly one. */
export interface SavedFlights {
  count: number;
  flight?: Flight;
}

interface FlightSavedNoticeProps {
  saved: SavedFlights;
  onLogAnother?: (flight: Flight) => void;
  /** Called with null to clear the notice; a state setter keeps the timer stable. */
  onDismiss: (next: null) => void;
  /** Auto-dismiss delay in ms. */
  timeoutMs?: number;
}

/** Toast after a save: "n flights logged", with "Log another like this" for a single new flight. */
export function FlightSavedNotice({ saved, onLogAnother, onDismiss, timeoutMs = 12_000 }: FlightSavedNoticeProps) {
  const { t } = useTranslation('flights');

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(null), timeoutMs);
    return () => clearTimeout(timer);
  }, [saved, onDismiss, timeoutMs]);

  const flight = saved.flight;
  return (
    <div
      role="status"
      data-testid="flight-saved-notice"
      className="fixed inset-x-4 z-[1000] bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] lg:bottom-4 sm:left-auto sm:right-4 sm:w-96 rounded-lg border border-emerald-200 bg-white p-3 shadow-lg dark:border-emerald-800 dark:bg-slate-800 animate-fade-in"
    >
      <div className="flex items-start gap-2.5">
        <CheckCircle2 className="mt-0.5 w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
        <p className="min-w-0 flex-1 pt-0.5 text-sm font-medium text-slate-800 dark:text-slate-100">
          {t('saved.flightsLogged', { count: saved.count })}
        </p>
        <button
          type="button"
          onClick={() => onDismiss(null)}
          aria-label={t('saved.dismiss')}
          className="-mt-2 -mr-2 inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      {flight && onLogAnother && (
        <div className="mt-2 flex justify-end">
          <button type="button" onClick={() => onLogAnother(flight)} className="btn-primary btn-sm min-h-11">
            {t('saved.logAnother')}
          </button>
        </div>
      )}
    </div>
  );
}
