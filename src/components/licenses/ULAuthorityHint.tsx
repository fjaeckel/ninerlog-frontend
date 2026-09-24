import { useTranslation } from 'react-i18next';
import { Info } from 'lucide-react';

interface ULAuthorityHintProps {
  className?: string;
}

/** Notice that ultralight recency is only tracked for the German UL authorities. */
export function ULAuthorityHint({ className = '' }: ULAuthorityHintProps) {
  const { t } = useTranslation('licenses');
  return (
    <p
      role="note"
      data-testid="ul-authority-hint"
      className={`flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300 ${className}`}
    >
      <Info className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />
      <span>{t('form.ulAuthorityHint')}</span>
    </p>
  );
}
