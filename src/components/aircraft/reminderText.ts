import { useTranslation } from 'react-i18next';
import type { AircraftReminder } from '../../hooks/useAircraftReminders';

/** Kind label, or the pilot's label for CUSTOM; other kinds append a label when set. */
export function useReminderTitle() {
  const { t } = useTranslation('aircraft');
  return (r: Pick<AircraftReminder, 'kind' | 'label'>) => {
    if (r.kind === 'CUSTOM') return r.label || t('reminders.kinds.CUSTOM');
    const kind = t(`reminders.kinds.${r.kind}`);
    return r.label ? `${kind} · ${r.label}` : kind;
  };
}

/** "in 12 days" / "due today" / "3 days overdue". */
export function useReminderRelative() {
  const { t } = useTranslation('aircraft');
  return (r: Pick<AircraftReminder, 'daysUntilDue'>) => {
    if (r.daysUntilDue < 0) return t('reminders.overdueBy', { count: -r.daysUntilDue });
    if (r.daysUntilDue === 0) return t('reminders.dueToday');
    return t('reminders.dueIn', { count: r.daysUntilDue });
  };
}
