import { useState } from 'react';
import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Download, FileText, FileUp, Trash2 } from 'lucide-react';
import { ConfirmDialog } from '../../ui/ConfirmDialog';
import {
  useDeleteFlightFile,
  useDownloadFlightFile,
  useFlightFiles,
  type FlightFile,
} from '../../../hooks/useFlightFiles';
import { useFormatPrefs } from '../../../hooks/useFormatPrefs';
import { igcImportPath } from '../../../lib/igc';

interface FlightFilesCardProps {
  flightId: string;
  /** Renders the card even without files, for the "Attach IGC" action. */
  showWhenEmpty: boolean;
}

/** The flight's recorder files with download and delete, and the "Attach IGC" action. */
export function FlightFilesCard({ flightId, showWhenEmpty }: FlightFilesCardProps) {
  const { t, i18n } = useTranslation('flights');
  const { fmtDateTime } = useFormatPrefs();
  const { data: files = [], isLoading, isError } = useFlightFiles(flightId);
  const download = useDownloadFlightFile(flightId);
  const remove = useDeleteFlightFile(flightId);
  const [pending, setPending] = useState<FlightFile | null>(null);

  if (isLoading) return null;
  if ((isError || files.length === 0) && !showWhenEmpty) return null;

  const kb = (bytes: number) =>
    t('files.size', { value: Math.max(1, Math.round(bytes / 1024)).toLocaleString(i18n.language) });

  return (
    <div className="card mb-4 break-inside-avoid" data-testid="flight-files">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="section-title">{t('files.title')}</h2>
        <Link to={igcImportPath(flightId)} className="btn-secondary btn-sm min-h-[44px]">
          <FileUp className="h-4 w-4" aria-hidden="true" />
          {t('files.attachIgc')}
        </Link>
      </div>

      {isError ? (
        <p className="text-sm text-red-700 dark:text-red-400">{t('files.loadFailed')}</p>
      ) : files.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">{t('files.empty')}</p>
      ) : (
        <ul className="space-y-1.5">
          {files.map((file) => (
            <li
              key={file.id}
              className="flex items-center gap-2 rounded-lg bg-slate-50 py-1 pl-3 pr-1 dark:bg-slate-700/30"
            >
              <FileText className="h-4 w-4 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-mono text-sm text-slate-700 dark:text-slate-200" title={file.filename}>{file.filename}</p>
                <p className="text-[11px] text-slate-400 dark:text-slate-500">
                  {file.kind} · {kb(file.sizeBytes)} · {fmtDateTime(file.createdAt)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => download.mutate(file)}
                className="btn-ghost h-11 w-11 shrink-0 p-0"
                aria-label={t('files.download', { name: file.filename })}
                title={t('files.download', { name: file.filename })}
              >
                <Download className="h-4 w-4" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setPending(file)}
                className="btn-ghost h-11 w-11 shrink-0 p-0 hover:text-red-700 dark:hover:text-red-400"
                aria-label={t('files.delete', { name: file.filename })}
                title={t('files.delete', { name: file.filename })}
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog
        open={!!pending}
        onConfirm={async () => {
          if (!pending) return;
          await remove.mutateAsync(pending.id);
          setPending(null);
        }}
        onCancel={() => setPending(null)}
        title={t('files.deleteTitle')}
        description={t('files.deleteDescription', { name: pending?.filename ?? '' })}
        confirmLabel={t('files.deleteConfirm')}
        variant="danger"
        isLoading={remove.isPending}
      />
    </div>
  );
}
