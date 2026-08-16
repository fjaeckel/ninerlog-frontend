import { Link } from 'react-router';
import { HelpCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/cn';

/**
 * A contextual link into the help topic for the surrounding screen.
 *
 * Sits inline next to a page title, so it carries its own 44px hit area
 * (`before:` overlay) rather than growing the line it sits on.
 */
export default function HelpLink({
  topic,
  label,
  className,
}: {
  topic: string;
  label?: string;
  className?: string;
}) {
  const { t } = useTranslation('nav');
  return (
    <Link
      to={`/help?topic=${topic}`}
      title={t('help')}
      className={cn(
        'inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400',
        'hover:text-blue-600 dark:hover:text-blue-400 transition-colors rounded-md',
        // 44px tall for a finger, with the extra height pulled back out so the
        // title row it sits in does not grow.
        'min-h-11 min-w-11 justify-center -my-3 px-1',
        className
      )}
    >
      <HelpCircle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{label ?? t('help')}</span>
    </Link>
  );
}
