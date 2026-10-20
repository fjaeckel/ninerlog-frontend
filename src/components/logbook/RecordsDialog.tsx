import { useTranslation } from 'react-i18next';
import { Dialog } from '../ui/Dialog';
import { RecordsPanel } from './RecordsPanel';

interface RecordsDialogProps {
  open: boolean;
  onClose: () => void;
  /** Dialog title; defaults to "What NinerLog records". */
  title?: string;
  /** Sentence shown above the four points. */
  intro?: string;
}

/** "What NinerLog records" in a dialog; also the strict-mode notice. */
export function RecordsDialog({ open, onClose, title, intro }: RecordsDialogProps) {
  const { t } = useTranslation('logbook');
  return (
    <Dialog open={open} onClose={onClose} title={title ?? t('records.title')} maxWidthClassName="max-w-lg">
      {intro && <p className="mb-3 text-sm text-slate-600 dark:text-slate-300">{intro}</p>}
      <RecordsPanel showTitle={!!title && title !== t('records.title')} />
      <div className="mt-5 flex justify-end">
        <button type="button" className="btn-primary" onClick={onClose}>
          {t('notice.ok')}
        </button>
      </div>
    </Dialog>
  );
}
