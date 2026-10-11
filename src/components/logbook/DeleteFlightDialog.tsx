import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dialog } from '../ui/Dialog';
import { useIsStrictLogbook } from '../../hooks/useLogbook';

interface DeleteFlightDialogProps {
  open: boolean;
  onCancel: () => void;
  /** Called with the optional void reason (strict mode only). */
  onConfirm: (reason?: string) => void | Promise<void>;
  isLoading?: boolean;
}

/** Delete confirmation; in strict mode it also takes an optional void reason. */
export function DeleteFlightDialog({ open, onCancel, onConfirm, isLoading = false }: DeleteFlightDialogProps) {
  const { t } = useTranslation(['flights', 'logbook', 'common']);
  const strict = useIsStrictLogbook();

  if (!strict) {
    return (
      <ConfirmDialog
        open={open}
        onConfirm={() => onConfirm()}
        onCancel={onCancel}
        title={t('flights:deleteTitle')}
        description={t('flights:deleteDescription')}
        confirmLabel={t('flights:deleteFlight')}
        variant="danger"
        isLoading={isLoading}
      />
    );
  }

  return (
    <Dialog open={open} onClose={onCancel} title={t('flights:deleteTitle')}>
      <DeleteReasonForm onCancel={onCancel} onConfirm={onConfirm} isLoading={isLoading} />
    </Dialog>
  );
}

function DeleteReasonForm({ onCancel, onConfirm, isLoading }: Omit<DeleteFlightDialogProps, 'open'>) {
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
