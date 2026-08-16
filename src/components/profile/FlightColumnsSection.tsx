import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../../stores/authStore';
import { useUpdateProfile } from '../../hooks/useProfile';
import { useFlightColumnPrefs } from '../../hooks/useFlightColumnPrefs';
import {
  DEFAULT_CUSTOM_COLUMNS,
  FLIGHT_COLUMNS,
  type FlightColumnKey,
} from '../flights/flightTableColumns';

const TIME_COLUMNS = FLIGHT_COLUMNS.filter((c) => c.kind === 'time');
const OTHER_COLUMNS = FLIGHT_COLUMNS.filter((c) => c.kind === 'fixed');

/**
 * Lets a pilot decide which optional columns the flights list shows, instead of
 * letting the list guess from the data on the page. Automatic stays the default
 * — the guess is usually right — but someone who never flies IFR should not
 * have to see an IFR column on the pages where they once did.
 */
export function FlightColumnsSection() {
  const { t } = useTranslation(['settings', 'flights']);
  const prefs = useFlightColumnPrefs();
  const updateUser = useAuthStore((s) => s.updateUser);
  const updateProfile = useUpdateProfile();
  const [error, setError] = useState('');

  const save = async (mode: 'auto' | 'custom', columns: FlightColumnKey[]) => {
    setError('');
    try {
      const updated = await updateProfile.mutateAsync({
        flightListColumnMode: mode,
        flightListColumns: columns,
      });
      // The API normalizes the list (dedupe, canonical order), so adopt what it
      // stored rather than what we sent.
      updateUser({
        flightListColumnMode: updated.flightListColumnMode,
        flightListColumns: updated.flightListColumns,
      });
    } catch {
      setError(t('settings:flightColumns.saveFailed'));
    }
  };

  const setMode = (mode: 'auto' | 'custom') => {
    if (mode === prefs.mode) return;
    // Switching to custom for the first time starts from a sensible logbook
    // rather than from an empty table.
    const columns = mode === 'custom' && prefs.columns.length === 0 ? DEFAULT_CUSTOM_COLUMNS : prefs.columns;
    void save(mode, columns);
  };

  const toggle = (key: FlightColumnKey) => {
    const next = prefs.columns.includes(key)
      ? prefs.columns.filter((c) => c !== key)
      : [...prefs.columns, key];
    void save('custom', next);
  };

  const renderCheckbox = (column: (typeof FLIGHT_COLUMNS)[number]) => (
    <label key={column.key} className="flex items-center gap-2.5 cursor-pointer py-1">
      <input
        type="checkbox"
        checked={prefs.columns.includes(column.key)}
        onChange={() => toggle(column.key)}
        disabled={updateProfile.isPending}
        className="checkbox"
        data-testid={`flight-column-${column.key}`}
      />
      <span className="text-sm text-slate-700 dark:text-slate-300">
        {t(`flights:${column.titleKey}`)}
      </span>
    </label>
  );

  return (
    <div className="card">
      <h2 className="section-title mb-4">{t('settings:flightColumns.title')}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        {t('settings:flightColumns.description')}
      </p>

      <div className="space-y-3">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="flight-list-column-mode"
            checked={prefs.mode === 'auto'}
            onChange={() => setMode('auto')}
            disabled={updateProfile.isPending}
            className="mt-0.5 border-slate-300 dark:border-slate-600"
            data-testid="flight-columns-mode-auto"
          />
          <span className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">{t('settings:flightColumns.auto')}</span>
            <span className="block text-slate-500 dark:text-slate-400">{t('settings:flightColumns.autoDesc')}</span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="flight-list-column-mode"
            checked={prefs.mode === 'custom'}
            onChange={() => setMode('custom')}
            disabled={updateProfile.isPending}
            className="mt-0.5 border-slate-300 dark:border-slate-600"
            data-testid="flight-columns-mode-custom"
          />
          <span className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">{t('settings:flightColumns.custom')}</span>
            <span className="block text-slate-500 dark:text-slate-400">{t('settings:flightColumns.customDesc')}</span>
          </span>
        </label>
      </div>

      {prefs.mode === 'custom' && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
            {t('settings:flightColumns.timesHeading')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            {TIME_COLUMNS.map(renderCheckbox)}
          </div>

          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mt-4 mb-2">
            {t('settings:flightColumns.otherHeading')}
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4">
            {OTHER_COLUMNS.map(renderCheckbox)}
          </div>

          <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
            {t('settings:flightColumns.widthHint')}
          </p>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}
