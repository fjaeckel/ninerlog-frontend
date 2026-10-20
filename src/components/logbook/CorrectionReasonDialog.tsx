import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog } from '../ui/Dialog';

interface CorrectionReasonDialogProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (reason: string) => void | Promise<void>;
  isSubmitting?: boolean;
  error?: string | null;
}

/** Asks for the reason of a strict-mode correction before the edit is resubmitted. */
export function CorrectionReasonDialog({ open, onCancel, onSubmit, isSubmitting = false, error }: CorrectionReasonDialogProps) {
  const { t } = useTranslation('logbook');
  return (
    <Dialog open={open} onClose={onCancel} title={t('correction.title')} description={t('correction.body')}>
      <CorrectionReasonForm onCancel={onCancel} onSubmit={onSubmit} isSubmitting={isSubmitting} error={error} />
    </Dialog>
  );
}

function CorrectionReasonForm({ onCancel, onSubmit, isSubmitting, error }: Omit<CorrectionReasonDialogProps, 'open'>) {
  const { t } = useTranslation(['logbook', 'common']);
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  const trimmed = reason.trim();
  const showRequired = touched && !trimmed;

  const submit = () => {
    setTouched(true);
    if (!trimmed) return;
    void onSubmit(trimmed);
  };

  return (
    <>
      {error && (
        <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
          {error}
        </div>
      )}
      <label htmlFor="correction-reason" className="form-label">
        {t('logbook:correction.label')} <span className="text-red-500">*</span>
      </label>
      <textarea
        id="correction-reason"
        rows={3}
        maxLength={500}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            submit();
          }
        }}
        aria-invalid={showRequired}
        aria-describedby={showRequired ? 'correction-reason-error' : undefined}
        className={`input ${showRequired ? 'input-error' : ''}`}
        placeholder={t('logbook:correction.placeholder')}
      />
      {showRequired && (
        <p id="correction-reason-error" className="form-error">
          {t('logbook:correction.required')}
        </p>
      )}
      <div className="mt-5 flex justify-end gap-3">
        <button type="button" className="btn-secondary" onClick={onCancel} disabled={isSubmitting}>
          {t('common:cancel')}
        </button>
        <button type="button" className="btn-primary" onClick={submit} disabled={isSubmitting}>
          {isSubmitting ? t('common:saving') : t('logbook:correction.submit')}
        </button>
      </div>
    </>
  );
}
