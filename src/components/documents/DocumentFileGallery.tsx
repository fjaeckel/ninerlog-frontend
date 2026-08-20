import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, ImagePlus, Trash2 } from 'lucide-react';
import {
  useDocumentFiles,
  useUploadDocumentFile,
  useDeleteDocumentFile,
  useDownloadDocumentFile,
  isImageFile,
  type DocumentFile,
  type DocumentSubject,
} from '../../hooks/useDocumentFiles';
import { useDocumentFilesFeature } from '../../hooks/useFeatures';
import { extractApiError } from '../../lib/errors';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import { Dialog } from '../ui/Dialog';
import { Skeleton } from '../ui/Skeleton';
import { DocumentFileThumb } from './DocumentFileThumb';

interface DocumentFileGalleryProps {
  subject: DocumentSubject;
  /** Null while the parent record is still being created. */
  subjectId: string | null | undefined;
}

function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${Math.round((bytes / (1024 * 1024)) * 10) / 10} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/**
 * Reference photos for one licence or credential. Renders nothing when the
 * server has the feature switched off.
 */
export function DocumentFileGallery({ subject, subjectId }: DocumentFileGalleryProps) {
  const { t } = useTranslation('documents');
  const feature = useDocumentFilesFeature();
  const fileInput = useRef<HTMLInputElement>(null);

  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentFile | null>(null);
  const [preview, setPreview] = useState<DocumentFile | null>(null);

  const { data: files, isLoading } = useDocumentFiles(subject, subjectId, feature.enabled);
  const upload = useUploadDocumentFile(subject, subjectId ?? '');
  const remove = useDeleteDocumentFile(subject, subjectId ?? '');
  const download = useDownloadDocumentFile(subject, subjectId ?? '');

  if (!feature.enabled) return null;

  const count = files?.length ?? 0;
  const atLimit = count >= feature.maxPerDocument;

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Reset the input so the same file can be picked again.
    event.target.value = '';
    if (!file) return;

    setError(null);

    // Check locally against the server's advertised limits.
    if (!feature.allowedContentTypes.includes(file.type)) {
      setError(t('errors.unsupportedType'));
      return;
    }
    if (file.size > feature.maxBytes) {
      setError(t('errors.tooLarge', { size: formatBytes(file.size), max: formatBytes(feature.maxBytes) }));
      return;
    }

    try {
      await upload.mutateAsync({ file });
    } catch (err) {
      setError(extractApiError(err, t('errors.uploadFailed')));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await remove.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      setError(extractApiError(err, t('errors.deleteFailed')));
      setDeleteTarget(null);
    }
  };

  return (
    <section className="border-t border-slate-200 dark:border-slate-700 pt-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="section-title">{t('title')}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            {subjectId ? t('hint', { size: formatBytes(feature.maxBytes) }) : t('saveFirst')}
          </p>
        </div>
        {subjectId && (
          <span className="text-xs text-slate-500 dark:text-slate-400 shrink-0 font-mono tabular-nums pt-1">
            {t('count', { count, max: feature.maxPerDocument })}
          </span>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="mb-3 bg-red-50 border border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400 px-3 py-2 rounded-lg text-sm"
        >
          {error}
        </div>
      )}

      {subjectId && (
        <>
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <Skeleton className="h-28 w-full rounded-lg" />
              <Skeleton className="h-28 w-full rounded-lg" />
            </div>
          ) : count === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t('noPhotos')}</p>
          ) : (
            <ul className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
              {files?.map((file) => (
                <li key={file.id} className="relative group">
                  <DocumentFileThumb
                    subject={subject}
                    subjectId={subjectId}
                    file={file}
                    onClick={isImageFile(file) ? () => setPreview(file) : undefined}
                  />
                  <button
                    type="button"
                    onClick={() => download.mutate(file)}
                    aria-label={t('downloadFile')}
                    title={t('downloadFile')}
                    className="absolute top-1 left-1 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 shadow hover:bg-white dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <Download className="w-4 h-4" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(file)}
                    aria-label={t('deletePhoto')}
                    title={t('deletePhoto')}
                    className="absolute top-1 right-1 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-full bg-white/90 dark:bg-slate-800/90 text-red-600 dark:text-red-400 shadow hover:bg-white dark:hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
                  >
                    <Trash2 className="w-4 h-4" aria-hidden="true" />
                  </button>
                  {file.caption && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 truncate" title={file.caption}>
                      {file.caption}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}

          <input
            ref={fileInput}
            type="file"
            accept={feature.allowedContentTypes.join(',')}
            onChange={handleFile}
            className="sr-only"
            data-testid="document-file-input"
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={atLimit || upload.isPending}
            className="btn-secondary btn-sm inline-flex items-center gap-2"
          >
            <ImagePlus className="w-4 h-4" aria-hidden="true" />
            {upload.isPending ? t('uploading') : t('addPhoto')}
          </button>
          {atLimit && (
            <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
              {t('limitReached', { max: feature.maxPerDocument })}
            </p>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title={t('deletePhoto')}
        description={t('deleteConfirm')}
        confirmLabel={t('deletePhoto')}
        variant="danger"
        isLoading={remove.isPending}
      />

      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.caption || preview?.filename || t('title')}
        maxWidthClassName="max-w-3xl"
      >
        {preview && subjectId && isImageFile(preview) && (
          <DocumentFileThumb subject={subject} subjectId={subjectId} file={preview} full />
        )}
      </Dialog>
    </section>
  );
}
