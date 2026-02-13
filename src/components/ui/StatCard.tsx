import { cn } from '../../lib/cn';

interface StatCardProps {
  label: string;
  value: string;
  unit?: string;
  detail?: string;
  icon?: React.ReactNode;
  className?: string;
}

export function StatCard({ label, value, unit, detail, icon, className }: StatCardProps) {
  return (
    <div className={cn('card', className)}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-slate-400 dark:text-slate-500" aria-hidden="true">{icon}</span>}
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      </div>
      <p className="data-lg text-slate-800 dark:text-slate-100">
        {value}
        {unit && <span className="text-sm font-normal text-slate-500 dark:text-slate-400 ml-1">{unit}</span>}
      </p>
      {detail && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{detail}</p>}
    </div>
  );
}
