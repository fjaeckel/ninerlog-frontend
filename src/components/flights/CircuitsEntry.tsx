import { useTranslation } from 'react-i18next';
import { Repeat } from 'lucide-react';
import { useAircraft } from '../../hooks/useAircraft';
import { useCircuitsMode } from '../../hooks/useCircuitsMode';

interface CircuitsEntryProps {
  /** Registrations in scope: the selected aircraft and the last flight's. */
  registrations: readonly (string | null | undefined)[];
  onOpen: () => void;
}

/** Entry to circuits mode; renders nothing when circuits do not serve the pilot. */
export function CircuitsEntry({ registrations, onOpen }: CircuitsEntryProps) {
  const { t } = useTranslation('flights');
  const { data: aircraftList } = useAircraft();
  const regs = registrations.map((r) => (r ?? '').trim().toUpperCase()).filter(Boolean);
  const inScope = (aircraftList ?? []).filter((ac) => regs.includes(ac.registration.toUpperCase()));
  const offered = useCircuitsMode(inScope);
  if (!offered) return null;

  return (
    <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 flex items-center justify-between gap-3">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t('circuits.entryTitle')}</p>
        <p className="text-xs text-slate-500 dark:text-slate-400">{t('circuits.entryHint')}</p>
      </div>
      <button type="button" onClick={onOpen} className="btn-secondary btn-sm text-xs shrink-0 min-h-11">
        <Repeat className="w-4 h-4" aria-hidden="true" />
        {t('circuits.title')}
      </button>
    </div>
  );
}
