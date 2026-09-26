import { useNavigate } from 'react-router';
import { useTranslation } from 'react-i18next';
import { ArrowRight, CalendarClock } from 'lucide-react';
import { useAllAircraftReminders } from '../../hooks/useAircraftReminders';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { ReminderStatusBadge } from './AircraftReminders';
import { useReminderRelative, useReminderTitle } from './reminderText';

/** Days ahead the dashboard looks for aircraft reminders. */
export const AIRCRAFT_DUE_WITHIN_DAYS = 30;

/** Dashboard card of aircraft reminders due within 30 days or overdue; renders nothing when there are none. */
export function AircraftDueCard() {
  const { t } = useTranslation(['dashboard', 'aircraft']);
  const navigate = useNavigate();
  const { fmtDate } = useFormatPrefs();
  const title = useReminderTitle();
  const relative = useReminderRelative();
  const { data } = useAllAircraftReminders(AIRCRAFT_DUE_WITHIN_DAYS);
  const due = (data ?? []).filter((r) => r.status !== 'ok');

  if (due.length === 0) return null;

  return (
    <div className="card mb-6" data-testid="aircraft-due-section">
      <div className="flex justify-between items-center gap-2 mb-3">
        <h2 className="section-title flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          {t('dashboard:aircraftDue.title')}
        </h2>
        <button type="button" onClick={() => navigate('/aircraft')} className="btn-ghost btn-sm min-h-[44px]">
          {t('dashboard:aircraftDue.viewAircraft')}
          <ArrowRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <ul className="divide-y divide-slate-100 dark:divide-slate-700">
        {due.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => navigate('/aircraft')}
              className="w-full grid grid-cols-[1fr_auto] gap-2 items-center py-2.5 px-2 rounded text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-100 whitespace-nowrap">
                    {r.aircraftRegistration}
                  </span>
                  <span className="text-sm text-slate-600 dark:text-slate-300 truncate">{title(r)}</span>
                </span>
                <span className="block text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                  {fmtDate(r.dueDate)} · {relative(r)}
                </span>
              </span>
              <ReminderStatusBadge status={r.status} />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
