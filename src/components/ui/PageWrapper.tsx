import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

interface PageWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'form' | 'content' | 'list';
  className?: string;
  children: React.ReactNode;
}

/**
 * The page column. Widths come from the design-system tokens; horizontal
 * padding belongs to the app shell (`<main>`). Two shapes: reading/entering
 * pages (prose, wizards, forms) are capped at a text measure; record-scanning
 * pages (tables, lists, dashboards) fill the column.
 */
const maxWidthMap = {
  /** A single column of fields. */
  form: 'max-w-[640px]',
  /** Prose and step-by-step flows — capped at a comfortable measure. */
  content: 'max-w-[960px]',
  /** Tables, record lists, dashboards — the full width of the shell. */
  list: 'max-w-none',
} as const;

export function PageWrapper({ maxWidth = 'content', className, children, ...rest }: PageWrapperProps) {
  return (
    <div className={cn('mx-auto py-6', maxWidthMap[maxWidth], className)} {...rest}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Leading icon, tinted by the page (e.g. a currency shield). */
  icon?: LucideIcon;
  iconClassName?: string;
  /** Rendered inline after the title — help links, alert counts. */
  titleAdornment?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  iconClassName,
  titleAdornment,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6',
        className
      )}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className={cn('w-6 h-6 shrink-0 text-slate-400 dark:text-slate-500', iconClassName)} aria-hidden="true" />}
          <h1 className="page-title">{title}</h1>
          {titleAdornment}
        </div>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  );
}
