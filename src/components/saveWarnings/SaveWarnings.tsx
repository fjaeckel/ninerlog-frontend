import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info, X } from 'lucide-react';
import { useSaveWarningsStore, type SaveWarningEntry } from '../../stores/saveWarningsStore';
import { saveWarningMessage } from '../../lib/saveWarnings';
import { cn } from '../../lib/cn';

/** The pending save warnings, each dismissible. */
export function SaveWarningList({ entries, className }: { entries: readonly SaveWarningEntry[]; className?: string }) {
  const { t } = useTranslation('common');
  const dismiss = useSaveWarningsStore((s) => s.dismiss);
  if (entries.length === 0) return null;
  return (
    <ul className={cn('space-y-2', className)} data-testid="save-warnings">
      {entries.map(({ id, warning }) => {
        const info = warning.severity === 'info';
        const Icon = info ? Info : AlertTriangle;
        return (
          <li
            key={id}
            data-testid={`save-warning-${warning.code}`}
            data-severity={warning.severity}
            className={cn(
              'flex items-start gap-2 rounded-md border px-2.5 py-2 text-sm',
              info
                ? 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200'
                : 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200',
            )}
          >
            <Icon
              className={cn('mt-0.5 w-4 h-4 shrink-0', info ? 'text-slate-500 dark:text-slate-400' : 'text-amber-600 dark:text-amber-400')}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1">{saveWarningMessage(t, warning)}</span>
            <button
              type="button"
              onClick={() => dismiss(id)}
              aria-label={t('saveWarnings.dismiss')}
              className="-my-1.5 -mr-1.5 inline-flex items-center justify-center w-8 h-8 shrink-0 rounded-md opacity-70 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/10"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}

/** Non-blocking toast listing warnings of recent saves. */
export function SaveWarningsToast() {
  const { t } = useTranslation('common');
  const entries = useSaveWarningsStore((s) => s.entries);
  const hosts = useSaveWarningsStore((s) => s.hosts);
  const clear = useSaveWarningsStore((s) => s.clear);
  if (hosts > 0 || entries.length === 0) return null;
  return (
    <section
      role="status"
      aria-label={t('saveWarnings.region')}
      data-testid="save-warnings-toast"
      className="fixed inset-x-4 z-[1000] bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+1rem)] lg:bottom-4 sm:left-auto sm:right-4 sm:w-96 rounded-lg border border-slate-200 bg-white p-3 shadow-lg dark:border-slate-700 dark:bg-slate-800 animate-fade-in"
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{t('saveWarnings.title')}</p>
        <button
          type="button"
          onClick={clear}
          aria-label={t('saveWarnings.dismissAll')}
          className="-mr-2 inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
      <SaveWarningList entries={entries} />
    </section>
  );
}
