import { useTranslation } from 'react-i18next';
import { FileText, ImageOff } from 'lucide-react';
import { useDocumentFileUrl, isImageFile, type DocumentFile, type DocumentSubject } from '../../hooks/useDocumentFiles';
import { Skeleton } from '../ui/Skeleton';

interface DocumentFileThumbProps {
  subject: DocumentSubject;
  subjectId: string;
  file: DocumentFile;
  /** Rendered at full width instead of as a fixed-height tile. */
  full?: boolean;
  /** 'sm' is the compact square used on list cards; 'md' is the gallery tile. */
  size?: 'sm' | 'md';
  onClick?: () => void;
}

/**
 * One stored file.
 *
 * For an image, the bytes come from an authenticated request, so there is no
 * URL that can go straight into `src` — the hook fetches the blob with the
 * bearer token and hands over an object URL, which means every thumbnail has a
 * real loading and failure state rather than the browser's broken-image icon.
 *
 * A PDF gets an icon tile instead, and no blob is fetched at all. That is not
 * only because we cannot render a page without a PDF renderer: the server
 * serves PDFs as `Content-Disposition: attachment` precisely so untrusted
 * document bytes never render inside this origin, and quietly pulling them
 * into a blob URL here would walk straight back around that. Downloading is
 * `DocumentFileDownloadButton`'s job, and it is an explicit user action.
 */
export function DocumentFileThumb({ subject, subjectId, file, full = false, size = 'md', onClick }: DocumentFileThumbProps) {
  const { t } = useTranslation('documents');
  const isImage = isImageFile(file);

  // Only images are fetched. The hook is disabled for anything else, so a PDF
  // costs no request and no bandwidth until the user asks for it.
  const { data: url, isLoading, isError } = useDocumentFileUrl(
    subject,
    subjectId,
    isImage ? file.id : null
  );

  const tile = size === 'sm' ? 'h-14 w-14' : 'h-28 w-full';
  const frame = full ? 'w-full max-h-[70vh] object-contain' : `${tile} object-cover`;
  const placeholder = full ? 'w-full h-64' : tile;
  const label = file.caption || file.filename || t('title');

  if (!isImage) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-1 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 ${placeholder}`}
        title={label}
        data-testid="document-file-icon"
      >
        <FileText className={size === 'sm' && !full ? 'w-5 h-5' : 'w-8 h-8'} aria-hidden="true" />
        {(full || size === 'md') && (
          <span className="text-xs font-medium uppercase tracking-wider">{t('pdf')}</span>
        )}
      </div>
    );
  }

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

  if (!onClick) {
    return <img src={url} alt={label} className={`rounded-lg ${frame}`} />;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      title={t('openFull')}
      aria-label={`${t('openFull')}: ${label}`}
      className={`block rounded-lg overflow-hidden focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${size === 'sm' ? 'w-14' : 'w-full'}`}
    >
      <img src={url} alt={label} className={`rounded-lg ${frame}`} />
    </button>
  );
}
