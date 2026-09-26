import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Moon } from 'lucide-react';
import type { ClassRatingCurrency } from '../../types/api';
import { cn } from '../../lib/cn';

interface DormantRatingProps {
  rating: ClassRatingCurrency;
  /** The full status, rendered on demand. */
  children: ReactNode;
}

/** Neutral summary of a rating whose discipline is dormant; discloses the full status on demand. */
export function DormantRating({ rating, children }: DormantRatingProps) {
  const { t } = useTranslation(['relevance', 'currency']);
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const classLabel = t(`currency:classTypes.${rating.classType}`, { defaultValue: rating.classType });

  return (
    <div
      className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 py-3"
      data-testid={`dormant-rating-${rating.classRatingId}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
            {classLabel}
            {rating.licenseType && (
              <span className="ml-1 text-xs font-normal text-slate-500 dark:text-slate-400">
                ({rating.regulatoryAuthority} {rating.licenseType})
              </span>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1.5 mt-0.5">
            <Moon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
            {t('relevance:dormant.note')}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-controls={panelId}
          className="shrink-0 inline-flex items-center gap-1 min-h-[44px] px-2 -mr-2 rounded-md text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        >
          {open ? t('relevance:dormant.hide') : t('relevance:dormant.show')}
          <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        </button>
      </div>
      {open && (
        <div id={panelId} className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
}
