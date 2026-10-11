import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, X } from 'lucide-react';
import { dismissCountryPrompt, isCountryPromptDismissed } from '../../lib/logbookPrompts';
import type { License } from '../../types/api';

interface LicenceCountryPromptProps {
  licences: License[];
  onAddCountry: (licenseId: string) => void;
}

/** One-time prompt to set the issuing country on licences that have none. */
export function LicenceCountryPrompt({ licences, onAddCountry }: LicenceCountryPromptProps) {
  const { t } = useTranslation('licenses');
  const [dismissedNow, setDismissedNow] = useState<string[]>([]);

  const missing = licences.filter(
    (l) => !l.issuingCountry && !dismissedNow.includes(l.id) && !isCountryPromptDismissed(l.id)
  );
  if (missing.length === 0) return null;

  const dismiss = () => {
    const ids = missing.map((l) => l.id);
    dismissCountryPrompt(ids);
    setDismissedNow((prev) => [...prev, ...ids]);
  };

  return (
    <section
      aria-labelledby="licence-country-prompt-title"
      className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-800 dark:bg-blue-900/20"
    >
      <Globe className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <h2 id="licence-country-prompt-title" className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {t('countryPrompt.title')}
        </h2>
        <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{t('countryPrompt.body')}</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {missing.map((l) => (
            <button key={l.id} type="button" className="btn-secondary btn-sm" onClick={() => onAddCountry(l.id)}>
              {t('countryPrompt.add', { licence: `${l.regulatoryAuthority} ${l.licenseType}` })}
            </button>
          ))}
        </div>
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label={t('countryPrompt.dismiss')}
        className="-mr-2 -mt-1 inline-flex min-h-[44px] min-w-[44px] shrink-0 items-center justify-center rounded-md text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </section>
  );
}
