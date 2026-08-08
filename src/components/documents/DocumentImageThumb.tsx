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
  /** 'sm' is the compact square used on list cards; 'md' is the gallery tile. */
  size?: 'sm' | 'md';
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
export function DocumentImageThumb({ subject, subjectId, image, full = false, size = 'md', onClick }: DocumentImageThumbProps) {
  const { t } = useTranslation('documents');
  const { data: url, isLoading, isError } = useDocumentImageUrl(subject, subjectId, image.id);

  const tile = size === 'sm' ? 'h-14 w-14' : 'h-28 w-full';
  const frame = full ? 'w-full max-h-[70vh] object-contain' : `${tile} object-cover`;
  const placeholder = full ? 'w-full h-64' : tile;

  if (isLoading) {
    return <Skeleton className={`${placeholder} rounded-lg`} />;
  }

  if (isError || !url) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 text-slate-400 dark:text-slate-500 ${placeholder}`}
        title={t('loadFailed')}
      >
        <ImageOff className="w-5 h-5" aria-hidden="true" />
        {size === 'md' && <span className="text-xs px-2 text-center">{t('loadFailed')}</span>}
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
      className={`block rounded-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${size === 'sm' ? 'w-14' : 'w-full'}`}
    >
      <img src={url} alt={alt} className={`rounded-lg ${frame}`} />
    </button>
  );
}
