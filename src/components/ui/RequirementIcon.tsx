import { Check, Circle } from 'lucide-react';
import { cn } from '../../lib/cn';

interface RequirementIconProps {
  met: boolean;
  className?: string;
}

/**
 * The met / not-met marker in front of a requirement.
 *
 * One marker for the whole app: currency requirements, launch methods,
 * passenger currency and password rules each used to draw their own — ✓/○ in
 * one place, ✓/✗ in another, at whatever size the surrounding text happened
 * to be.
 */
export function RequirementIcon({ met, className }: RequirementIconProps) {
  const Icon = met ? Check : Circle;
  return (
    <Icon
      className={cn(
        'w-3.5 h-3.5 shrink-0',
        met ? 'text-green-600 dark:text-green-400' : 'text-slate-400 dark:text-slate-500',
        className
      )}
      strokeWidth={met ? 3 : 2}
      aria-hidden="true"
    />
  );
}
