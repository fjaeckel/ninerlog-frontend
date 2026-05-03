import { cn } from '../../lib/cn';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  icon?: React.ReactNode;
  /** Subtle accent color for the icon halo. */
  accent?: 'blue' | 'green' | 'amber' | 'red' | 'slate';
  className?: string;
}

const ACCENT: Record<NonNullable<StatCardProps['accent']>, string> = {
  blue: 'bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-300',
  green: 'bg-green-50 text-green-600 dark:bg-green-900/30 dark:text-green-300',
  amber: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-300',
  red: 'bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-300',
  slate: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

export function StatCard({ label, value, unit, detail, icon, accent = 'slate', className }: StatCardProps) {
  return (
    <div className={cn('card hover-lift', className)}>
      <div className="flex items-center gap-2 mb-2">
        {icon && (
          <span
            className={cn('inline-flex items-center justify-center w-7 h-7 rounded-lg', ACCENT[accent])}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className="data-lg text-slate-800 dark:text-slate-100 leading-none">
        {value}
        {unit && <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">{unit}</span>}
      </p>
      {detail && <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">{detail}</p>}
    </div>
  );
}
