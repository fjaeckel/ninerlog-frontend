import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  className?: string;
}

/** The "we could not load this" panel. Mirrors EmptyState's proportions. */
export function ErrorState({ title, message, onRetry, retryLabel, className }: ErrorStateProps) {
  const { t } = useTranslation('common');

  return (
    <div className={cn('card text-center py-12', className)} role="alert">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" aria-hidden="true" />
      </div>
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">
        {title ?? t('errorState.title')}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
        {message ?? t('errorState.message')}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-primary">
          {retryLabel ?? t('errorState.retry')}
        </button>
      )}
    </div>
  );
}
