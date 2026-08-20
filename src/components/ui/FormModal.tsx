import { useCallback, useEffect, useId, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

const sizeClasses = {
  sm: 'sm:max-w-md',
  md: 'sm:max-w-lg',
  lg: 'sm:max-w-xl',
  xl: 'sm:max-w-2xl',
  '2xl': 'sm:max-w-3xl',
} as const;

interface FormModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  /** Panel width from `sm:` up. Below that the modal is always a full-height sheet. */
  size?: keyof typeof sizeClasses;
  children: ReactNode;
  className?: string;
}

/**
 * The shell every content/form modal shares: scrim, panel, sticky header with
 * a close button, Escape-to-close and a focus trap. Use `ConfirmDialog` for
 * destructive yes/no questions.
 */
export function FormModal({ open, onClose, title, size = 'md', children, className }: FormModalProps) {
  const { t } = useTranslation('common');
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement;
    const timer = setTimeout(() => {
      panelRef.current
        ?.querySelector<HTMLElement>(
          'input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
        )
        ?.focus();
    }, 50);
    return () => {
      clearTimeout(timer);
      previouslyFocused.current?.focus();
    };
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[1020]" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="fixed inset-0 z-[1020] flex items-end sm:items-center justify-center sm:p-4"
        onKeyDown={handleKeyDown}
      >
        <div
          ref={panelRef}
          className={cn(
            'bg-white dark:bg-slate-800 w-full shadow-2xl overflow-y-auto pt-safe-top',
            'h-full sm:h-auto sm:max-h-[90vh] sm:rounded-xl',
            sizeClasses[size],
            className
          )}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-4 bg-white dark:bg-slate-800 px-4 sm:px-6 py-3 border-b border-slate-100 dark:border-slate-700">
            <h2 id={titleId} className="section-title truncate">
              {title}
            </h2>
            {/* type="button": never submits a surrounding <form> */}
            <button
              type="button"
              onClick={onClose}
              aria-label={t('close')}
              className="shrink-0 min-w-[44px] min-h-[44px] -mr-2 flex items-center justify-center rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:text-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
          <div className="p-4 sm:p-6">{children}</div>
        </div>
      </div>
    </>
  );
}
