import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dialog } from '../ui/Dialog';
import { useLogbookStrictness } from '../../hooks/useLogbook';
import { logbookErrorMessage } from '../../lib/logbookErrors';

interface DeleteFlightDialogProps {
  open: boolean;
  onCancel: () => void;
  /** Called with the optional void reason; a rejection is shown in the dialog, which stays open. */
  onConfirm: (reason?: string) => void | Promise<void>;
  isLoading?: boolean;
}

/**
 * Delete confirmation. Takes an optional void reason unless the logbook is
 * known to be in standard mode.
 */
export function DeleteFlightDialog({ open, onCancel, onConfirm, isLoading = false }: DeleteFlightDialogProps) {
  const { t } = useTranslation(['flights', 'logbook', 'common']);
  const strictness = useLogbookStrictness();
  const [error, setError] = useState<string | null>(null);

  const cancel = () => {
    setError(null);
    onCancel();
  };

  const confirm = async (reason?: string) => {
    setError(null);
    try {
      await onConfirm(reason);
    } catch (err) {
      setError(logbookErrorMessage(err, t) ?? t('logbook:errors.deleteFailed'));
    }
  };

  if (strictness === 'standard') {
    return (
      <ConfirmDialog
        open={open}
        onConfirm={() => confirm()}
        onCancel={cancel}
        title={t('flights:deleteTitle')}
        description={t('flights:deleteDescription')}
        confirmLabel={t('flights:deleteFlight')}
        variant="danger"
        isLoading={isLoading}
        error={error}
      />
    );
  }

  return (
    <Dialog open={open} onClose={cancel} title={t('flights:deleteTitle')}>
      <DeleteReasonForm onCancel={cancel} onConfirm={confirm} isLoading={isLoading} error={error} />
    </Dialog>
  );
}

function DeleteReasonForm({
  onCancel,
  onConfirm,
  isLoading,
  error,
}: Omit<DeleteFlightDialogProps, 'open'> & { error: string | null }) {
  const { t } = useTranslation(['flights', 'logbook', 'common']);
  const [reason, setReason] = useState('');

  return (
    <>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('logbook:delete.strictDescription')}</p>
      </div>
      {error && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400"
        >
          {error}
        </p>
      )}
      <label htmlFor="delete-reason" className="form-label">
        {t('logbook:delete.reasonLabel')}
      </label>
      <textarea
        id="delete-reason"
        rows={2}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="input"
        placeholder={t('logbook:delete.reasonPlaceholder')}
        aria-describedby="delete-reason-help"
      />
      <p id="delete-reason-help" className="form-helper">
        {t('logbook:delete.reasonHelp')}
      </p>
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isLoading}>
          {t('common:cancel')}
        </button>
        <button
          type="button"
          className="btn-danger"
          onClick={() => void onConfirm(reason.trim() || undefined)}
          disabled={isLoading}
        >
          {isLoading ? t('common:deleting') : t('flights:deleteFlight')}
        </button>
      </div>
    </>
  );
}
