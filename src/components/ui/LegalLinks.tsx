import { Link } from 'react-router';
import { useTranslation } from 'react-i18next';
import { LEGAL_DOCS } from '../../lib/config';
import { legalDocPath } from '../../lib/legal';
import { cn } from '../../lib/cn';

interface LegalLinksProps {
  className?: string;
  linkClassName?: string;
}

/** Links to the operator's published legal documents. Renders nothing when none are configured. */
export function LegalLinks({ className, linkClassName }: LegalLinksProps) {
  const { t } = useTranslation('common');
  if (LEGAL_DOCS.length === 0) return null;

  return (
    <nav
      aria-label={t('legal.navLabel')}
      className={cn('flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs', className)}
    >
      {LEGAL_DOCS.map((id) => (
        <Link
          key={id}
          to={legalDocPath(id)}
          className={cn(
            'inline-flex items-center min-h-11 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-colors',
            linkClassName
          )}
        >
          {t(`legal.${id}`)}
        </Link>
      ))}
    </nav>
  );
}
