import { AlertTriangle } from 'lucide-react';
import { cn } from '../../lib/cn';

interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'Something went wrong',
  message = 'An error occurred while loading. Please try again.',
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={cn('card text-center py-12', className)} role="alert">
      <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
      </div>
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
        {title}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
        {message}
      </p>
      {onRetry && (
        <button onClick={onRetry} className="btn-primary">
          Try Again
        </button>
      )}
    </div>
  );
}
