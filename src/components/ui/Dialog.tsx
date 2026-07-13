import { useEffect, useRef, useCallback, type ReactNode } from 'react';
import { cn } from '../../lib/cn';
import { X } from 'lucide-react';

interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  maxWidthClassName?: string;
}

/**
 * Generic accessible modal for non-destructive content (forms, capture
 * flows, informational panels). Modeled on ConfirmDialog's focus-trap /
 * Escape / aria-modal handling, but hosts arbitrary children instead of a
 * fixed confirm/cancel button pair.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  children,
  maxWidthClassName = 'max-w-md',
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement;
      setTimeout(() => {
        const focusable = dialogRef.current?.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        focusable?.focus();
      }, 50);
    } else {
      previouslyFocused.current?.focus();
    }
  }, [open]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
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
      }
    },
    [onClose]
  );

  if (!open) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-[1020]" onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="app-dialog-title"
        aria-describedby={description ? 'app-dialog-desc' : undefined}
        className="fixed inset-0 z-[1020] flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
      >
        <div
          className={cn(
            'bg-white dark:bg-slate-800 rounded-xl w-full shadow-2xl p-6 animate-fade-in max-h-[90vh] overflow-y-auto',
            maxWidthClassName
          )}
        >
          <div className="flex items-start justify-between gap-4 mb-4">
            <div>
              <h2 id="app-dialog-title" className="text-lg font-semibold text-slate-800 dark:text-slate-100">
                {title}
              </h2>
              {description && (
                <p id="app-dialog-desc" className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                  {description}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="shrink-0 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-full p-1 -mt-1 -mr-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          {children}
        </div>
      </div>
    </>
  );
}
