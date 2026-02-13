import { cn } from '../../lib/cn';

interface PageWrapperProps {
  maxWidth?: 'form' | 'content' | 'dashboard';
  className?: string;
  children: React.ReactNode;
}

const maxWidthMap = {
  form: 'max-w-[640px]',
  content: 'max-w-[960px]',
  dashboard: 'max-w-[1280px]',
} as const;

export function PageWrapper({ maxWidth = 'content', className, children }: PageWrapperProps) {
  return (
    <div className={cn('mx-auto py-6', maxWidthMap[maxWidth], className)}>
      {children}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, subtitle, action, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6', className)}>
      <div>
        <h1 className="page-title">{title}</h1>
        {subtitle && (
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
