import { cn } from '../../lib/cn';

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('card text-center py-12', className)}>
      <div className="text-5xl mb-4" aria-hidden="true">{icon}</div>
      <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
        {title}
      </h2>
      <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
        {description}
      </p>
      {action && (
        <button
          onClick={action.onClick}
          className={action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
