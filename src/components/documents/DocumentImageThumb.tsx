import { useTranslation } from 'react-i18next';
import { ImageOff } from 'lucide-react';
import { useDocumentImageUrl, type DocumentImage, type DocumentSubject } from '../../hooks/useDocumentImages';
import { Skeleton } from '../ui/Skeleton';

interface DocumentImageThumbProps {
  subject: DocumentSubject;
  subjectId: string;
  image: DocumentImage;
  /** Rendered at full width instead of as a fixed-height tile. */
  full?: boolean;
  onClick?: () => void;
}

/**
 * One stored photo.
 *
 * The bytes come from an authenticated request, so there is no URL that can
 * go straight into `src` — the hook fetches the blob with the bearer token and
 * hands over an object URL, which means every thumbnail has a real loading and
 * failure state rather than the browser's broken-image icon.
 */
export function DocumentImageThumb({ subject, subjectId, image, full = false, onClick }: DocumentImageThumbProps) {
  const { t } = useTranslation('documents');
  const { data: url, isLoading, isError } = useDocumentImageUrl(subject, subjectId, image.id);

  const frame = full
    ? 'w-full max-h-[70vh] object-contain'
    : 'h-28 w-full object-cover';

  if (isLoading) {
    return <Skeleton className={full ? 'w-full h-64 rounded-lg' : 'h-28 w-full rounded-lg'} />;
  }

  if (isError || !url) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 ${full ? 'h-64' : 'h-28'}`}
      >
        <ImageOff className="w-5 h-5" aria-hidden="true" />
        <span className="text-xs px-2 text-center">{t('loadFailed')}</span>
      </div>
    );
  }

  const alt = image.caption || image.filename || t('title');

  if (!onClick) {
    return <img src={url} alt={alt} className={`rounded-lg ${frame}`} />;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={t('openFull')}
      aria-label={`${t('openFull')}: ${alt}`}
      className="block w-full rounded-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
    >
      <img src={url} alt={alt} className={`rounded-lg ${frame}`} />
    </button>
  );
}
