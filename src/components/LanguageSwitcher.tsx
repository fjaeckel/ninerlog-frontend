import { useTranslation } from 'react-i18next';
import { supportedLanguages, languageNames, type SupportedLanguage } from '../i18n';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('settings');

  return (
    <div className="card mb-6">
      <h2 className="section-title mb-2">{t('language.title')}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        {t('language.description')}
      </p>
      <div className="flex gap-3">
        {supportedLanguages.map((lang) => (
          <button
            key={lang}
            onClick={() => i18n.changeLanguage(lang)}
            className={`flex-1 px-4 py-3 rounded-lg border-2 text-sm font-medium transition-colors ${
              i18n.language === lang || (i18n.language.startsWith(lang) && !supportedLanguages.includes(i18n.language as SupportedLanguage))
                ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-500'
                : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600'
            }`}
          >
            {languageNames[lang]}
          </button>
        ))}
      </div>
    </div>
  );
}
