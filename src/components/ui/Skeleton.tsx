import { cn } from '../../lib/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-slate-200 dark:bg-slate-700 rounded', className)}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn('card', className)}>
      <Skeleton className="h-4 w-3/4 mb-3" />
      <Skeleton className="h-3 w-1/2 mb-2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonList({ rows = 5, className }: SkeletonProps & { rows?: number }) {
  return (
    <div className={cn('space-y-4', className)} role="status" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <div className="card p-0">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="px-4 py-4 border-b border-slate-100 dark:border-slate-700 last:border-0"
          >
            <Skeleton className="h-4 w-3/4 mb-2" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
      <span className="sr-only">Loading content...</span>
    </div>
  );
}

export function SkeletonGrid({ count = 3, className }: SkeletonProps & { count?: number }) {
  return (
    <div className={cn('space-y-4', className)} role="status" aria-label="Loading">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }).map((_, i) => (
          <SkeletonCard key={i} className="h-48" />
        ))}
      </div>
      <span className="sr-only">Loading content...</span>
    </div>
  );
}
