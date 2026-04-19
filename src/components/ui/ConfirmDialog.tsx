import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning';
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onConfirm,
  onCancel,
  title,
  description,
  confirmLabel: confirmLabelProp,
  cancelLabel: cancelLabelProp,
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const { t } = useTranslation('common');
  const confirmLabel = confirmLabelProp ?? t('confirm');
  const cancelLabel = cancelLabelProp ?? t('cancel');
  const confirmRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      // Focus the cancel button on open (safer default)
      setTimeout(() => confirmRef.current?.focus(), 50);
    }
  }, [open]);

  // Trap focus and handle Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel();
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
    [onCancel]
  );

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-desc"
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onKeyDown={handleKeyDown}
      >
        <div className="bg-white dark:bg-slate-800 rounded-xl max-w-sm w-full shadow-2xl p-6 animate-fade-in">
          <div className="flex items-start gap-4 mb-4">
            <div
              className={cn(
                'shrink-0 w-10 h-10 rounded-full flex items-center justify-center',
                variant === 'danger'
                  ? 'bg-red-100 dark:bg-red-900/30'
                  : 'bg-amber-100 dark:bg-amber-900/30'
              )}
            >
              <AlertTriangle
                className={cn(
                  'w-5 h-5',
                  variant === 'danger'
                    ? 'text-red-600 dark:text-red-400'
                    : 'text-amber-600 dark:text-amber-400'
                )}
              />
            </div>
            <div>
              <h2
                id="confirm-dialog-title"
                className="text-lg font-semibold text-slate-800 dark:text-slate-100"
              >
                {title}
              </h2>
              <p
                id="confirm-dialog-desc"
                className="text-sm text-slate-500 dark:text-slate-400 mt-1"
              >
                {description}
              </p>
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              className="btn-secondary"
              disabled={isLoading}
            >
              {cancelLabel}
            </button>
            <button
              ref={confirmRef}
              onClick={onConfirm}
              className={cn(
                variant === 'danger' ? 'btn-danger' : 'btn-primary'
              )}
              disabled={isLoading}
            >
              {isLoading ? t('common:deleting') : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
