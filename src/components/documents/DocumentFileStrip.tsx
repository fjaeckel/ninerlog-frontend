import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useDocumentFiles,
  isImageFile,
  type DocumentFile,
  type DocumentSubject,
} from '../../hooks/useDocumentFiles';
import { useDocumentFilesFeature } from '../../hooks/useFeatures';
import { Dialog } from '../ui/Dialog';
import { DocumentFileThumb } from './DocumentFileThumb';

interface DocumentFileStripProps {
  subject: DocumentSubject;
  subjectId: string;
  /**
   * How many thumbnails to render before collapsing the rest into a counter.
   *
   * Deliberately small. Each visible thumbnail is its own authenticated
   * request, and a list page renders one strip per card — so this multiplies
   * by the number of licences or credentials the pilot holds. Two is enough
   * to say "there are photos here" without turning a list into a download.
   */
  max?: number;
}

/**
 * A read-only peek at a document's photos, for the licence and credential
 * cards.
 *
 * Uploading, captioning and deleting stay in the edit form — this exists only
 * so the photos are *discoverable* from the list, which they previously were
 * not: a pilot had to open Edit and scroll to find out whether a document had
 * any. Clicking a thumbnail opens the same full-size preview the gallery uses.
 *
 * Renders nothing when the server has the feature switched off, and nothing
 * when the document has no photos — an empty strip on every card would be
 * noise on an account that never uploads any.
 */
export function DocumentFileStrip({ subject, subjectId, max = 2 }: DocumentFileStripProps) {
  const { t } = useTranslation('documents');
  const feature = useDocumentFilesFeature();
  const [preview, setPreview] = useState<DocumentFile | null>(null);

  const { data: files } = useDocumentFiles(subject, subjectId, feature.enabled);

  if (!feature.enabled || !files || files.length === 0) return null;

  const shown = files.slice(0, max);
  const hidden = files.length - shown.length;

  return (
    <div className="mt-3">
      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
        {t('title')}
      </p>
      <ul className="flex items-center gap-2">
        {shown.map((file) => (
          <li key={file.id} className="w-14 shrink-0">
            <DocumentFileThumb
              subject={subject}
              subjectId={subjectId}
              file={file}
              size="sm"
              onClick={isImageFile(file) ? () => setPreview(file) : undefined}
            />
          </li>
        ))}
        {hidden > 0 && (
          <li
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300"
            title={t('count', { count: files.length, max: feature.maxPerDocument })}
          >
            +{hidden}
          </li>
        )}
      </ul>

      <Dialog
        open={!!preview}
        onClose={() => setPreview(null)}
        title={preview?.caption || preview?.filename || t('title')}
        maxWidthClassName="max-w-3xl"
      >
        {preview && (
          <DocumentFileThumb subject={subject} subjectId={subjectId} file={preview} full />
        )}
      </Dialog>
    </div>
  );
}
