import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/cn';

interface EmptyStateProps {
  /** A lucide icon component — passed as the component itself, not an element. */
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
}

/**
 * The "nothing here yet" panel.
 *
 * Takes a lucide icon rather than arbitrary content so every empty state in
 * the app shares one icon size, weight and colour — pages used to pass either
 * an emoji or a differently-sized icon element, and no two matched.
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('card text-center py-12', className)}>
      <Icon
        className="w-12 h-12 mx-auto mb-4 text-slate-300 dark:text-slate-600"
        strokeWidth={1.5}
        aria-hidden="true"
      />
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-2">{title}</h2>
      {description && (
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">{description}</p>
      )}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className={action.variant === 'secondary' ? 'btn-secondary' : 'btn-primary'}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
