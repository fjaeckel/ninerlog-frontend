import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, X } from 'lucide-react';
import type { Aircraft } from '../../hooks/useAircraft';
import { needsClassification, normalizeAircraftClass } from '../../lib/aircraftClass';

const DISMISS_KEY = 'ninerlog:unclassified-aircraft-dismissed';

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === '1';
  } catch {
    return false;
  }
}

interface UnclassifiedAircraftBannerProps {
  aircraft: Aircraft[];
  onEdit: (id: string) => void;
}

/** Lists aircraft without a class, or ultralights without a kind; dismissible per session. */
export function UnclassifiedAircraftBanner({ aircraft, onEdit }: UnclassifiedAircraftBannerProps) {
  const { t } = useTranslation('aircraft');
  const [dismissed, setDismissed] = useState(readDismissed);

  const unclassified = aircraft.filter(needsClassification);
  if (dismissed || unclassified.length === 0) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_KEY, '1');
    } catch {
      // storage unavailable: dismissal lasts until unmount
    }
  };

  return (
    <section
      aria-labelledby="unclassified-aircraft-title"
      className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h2 id="unclassified-aircraft-title" className="text-sm font-semibold text-amber-800 dark:text-amber-300">
            {t('unclassified.title')}
          </h2>
          <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">{t('unclassified.body')}</p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {unclassified.map((ac) => (
              <li key={ac.id}>
                <button
                  type="button"
                  onClick={() => onEdit(ac.id)}
                  title={t('unclassified.edit', { registration: ac.registration })}
                  className="inline-flex min-h-11 items-center gap-2 rounded-md border border-amber-300 bg-white px-3 text-sm text-slate-700 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <span className="font-mono font-semibold">{ac.registration}</span>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {normalizeAircraftClass(ac.aircraftClass) === '' ? t('unclassified.noClass') : t('unclassified.noUlKind')}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label={t('unclassified.dismiss')}
          title={t('unclassified.dismiss')}
          className="btn-ghost btn-sm -mr-2 -mt-2 min-h-11 min-w-11 shrink-0 text-amber-700 dark:text-amber-300"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
