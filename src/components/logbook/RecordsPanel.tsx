import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { cn } from '../../lib/cn';

const POINTS = ['logbook', 'standard', 'strict', 'never'] as const;

interface RecordsPanelProps {
  /** Show the "What NinerLog records" heading. */
  showTitle?: boolean;
  className?: string;
}

/** The "What NinerLog records" statement: four points on what is and is not stored. */
export function RecordsPanel({ showTitle = true, className }: RecordsPanelProps) {
  const { t } = useTranslation('logbook');
  return (
    <section
      aria-labelledby={showTitle ? 'records-panel-title' : undefined}
      aria-label={showTitle ? undefined : t('records.title')}
      className={cn(
        'rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/60',
        className
      )}
    >
      {showTitle && (
        <h2
          id="records-panel-title"
          className="mb-2 flex items-center gap-2 font-semibold text-slate-800 dark:text-slate-100"
        >
          <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          {t('records.title')}
        </h2>
      )}
      <ul className="list-disc space-y-1.5 pl-5 text-slate-600 marker:text-slate-400 dark:text-slate-300 dark:marker:text-slate-500">
        {POINTS.map((key) => (
          <li key={key}>{t(`records.${key}`)}</li>
        ))}
      </ul>
    </section>
  );
}
