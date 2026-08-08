import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  useDocumentImages,
  type DocumentImage,
  type DocumentSubject,
} from '../../hooks/useDocumentImages';
import { useDocumentImagesFeature } from '../../hooks/useFeatures';
import { Dialog } from '../ui/Dialog';
import { DocumentImageThumb } from './DocumentImageThumb';

interface DocumentImageStripProps {
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
export function DocumentImageStrip({ subject, subjectId, max = 2 }: DocumentImageStripProps) {
  const { t } = useTranslation('documents');
  const feature = useDocumentImagesFeature();
  const [preview, setPreview] = useState<DocumentImage | null>(null);

  const { data: images } = useDocumentImages(subject, subjectId, feature.enabled);

  if (!feature.enabled || !images || images.length === 0) return null;

  const shown = images.slice(0, max);
  const hidden = images.length - shown.length;

  return (
    <div className="mt-3">
      <p className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5">
        {t('title')}
      </p>
      <ul className="flex items-center gap-2">
        {shown.map((image) => (
          <li key={image.id} className="w-14 shrink-0">
            <DocumentImageThumb
              subject={subject}
              subjectId={subjectId}
              image={image}
              size="sm"
              onClick={() => setPreview(image)}
            />
          </li>
        ))}
        {hidden > 0 && (
          <li
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700 text-xs font-medium text-slate-600 dark:text-slate-300"
            title={t('count', { count: images.length, max: feature.maxPerDocument })}
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
          <DocumentImageThumb subject={subject} subjectId={subjectId} image={preview} full />
        )}
      </Dialog>
    </div>
  );
}
