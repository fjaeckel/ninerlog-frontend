import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export interface DataTileProps {
  /** Short field name, rendered as an eyebrow above the value. */
  label: string;
  value: ReactNode;
  /** Secondary line under the value — a breakdown, a unit, a source. */
  hint?: ReactNode;
  icon?: ReactNode;
  /** The tile that summarises the ones beside it (a total, the headline figure). */
  emphasis?: boolean;
  /** Numeric readouts get the tabular mono face; prose values keep the UI face. */
  mono?: boolean;
  className?: string;
}

/**
 * One field of a record, boxed.
 *
 * A label/value row works on a wide screen and falls apart on a phone: the
 * label eats the line and the value is squeezed against the right edge. A tile
 * gives each field its own box with the label on top, so a grid of them stays
 * readable at any width and long labels wrap instead of stealing the value's
 * room.
 */
export function DataTile({ label, value, hint, icon, emphasis, mono, className }: DataTileProps) {
  return (
    <div
      className={cn(
        'min-w-0 rounded-lg border px-3 py-2.5',
        emphasis
          ? 'border-blue-200 bg-blue-50/70 dark:border-blue-900/50 dark:bg-blue-900/20'
          : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-700/30',
        className
      )}
    >
      <p
        className={cn(
          'flex items-center gap-1 text-[11px] font-medium uppercase leading-tight tracking-wide',
          emphasis ? 'text-blue-500 dark:text-blue-400' : 'text-slate-400 dark:text-slate-500'
        )}
      >
        {icon && (
          <span className="shrink-0" aria-hidden="true">
            {icon}
          </span>
        )}
        <span className="min-w-0 break-words">{label}</span>
      </p>
      <p
        className={cn(
          'mt-1 break-words text-base font-semibold leading-tight',
          emphasis ? 'text-blue-700 dark:text-blue-300' : 'text-slate-800 dark:text-slate-100',
          mono && 'font-mono tabular-nums'
        )}
      >
        {value}
      </p>
      {hint && (
        <p className="mt-0.5 break-words text-[11px] leading-tight text-slate-400 dark:text-slate-500">{hint}</p>
      )}
    </div>
  );
}

/** The grid the tiles above are meant to sit in — two up on a phone. */
export function DataTileGrid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid grid-cols-2 gap-2', className)}>{children}</div>;
}
