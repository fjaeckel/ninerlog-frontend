import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

interface PageWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
  maxWidth?: 'form' | 'content' | 'dashboard' | 'wide';
  className?: string;
  children: React.ReactNode;
}

/**
 * The page column.
 *
 * Widths come from the design-system tokens, not from ad-hoc `max-w-*`
 * classes, so two list pages never sit at different widths. Horizontal
 * padding belongs to the app shell (`<main>`), which is why there is none
 * here — adding `px-4` on a page double-pads it on phones.
 */
const maxWidthMap = {
  form: 'max-w-[640px]',
  content: 'max-w-[960px]',
  dashboard: 'max-w-[1280px]',
  /** Data-dense tables that genuinely need the extra room on large screens. */
  wide: 'max-w-[960px] xl:max-w-[1600px]',
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
