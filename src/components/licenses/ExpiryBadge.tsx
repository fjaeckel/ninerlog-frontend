import { useTranslation } from 'react-i18next';
import { isPast, differenceInDays } from 'date-fns';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

/** Expiry date coloured by how close it is; "No expiry" when absent. */
export function ExpiryBadge({ expiryDate }: { expiryDate?: string | null }) {
  const { t } = useTranslation('licenses');
  const { fmtDate } = useFormatPrefs();
  if (!expiryDate) {
    return <span className="text-xs text-slate-500 dark:text-slate-400">{t('card.noExpiry')}</span>;
  }
  const expiry = new Date(expiryDate);
  const expired = isPast(expiry);
  const daysLeft = differenceInDays(expiry, new Date());
  const formatted = fmtDate(expiryDate);

  if (expired) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="font-medium text-red-600 dark:text-red-400">{formatted}</span>
        <span className="badge-expired text-xs">{t('card.expired')}</span>
      </span>
    );
  }
  if (daysLeft <= 30) {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs">
        <span className="font-medium text-amber-600 dark:text-amber-400">{formatted}</span>
        <span className="badge-expiring text-xs">{t('card.expiresInDays', { days: daysLeft })}</span>
      </span>
    );
  }
  return <span className="text-xs font-medium text-green-600 dark:text-green-400">{formatted}</span>;
}
