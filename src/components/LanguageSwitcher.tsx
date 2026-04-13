import { useTranslation } from 'react-i18next';
import { supportedLanguages, languageNames } from '../i18n';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('settings');

  const currentLang = supportedLanguages.find(
    (l) => i18n.language === l || i18n.language.startsWith(l),
  ) ?? 'en';

  return (
    <div className="card mb-6">
      <h2 className="section-title mb-2">{t('language.title')}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        {t('language.description')}
      </p>
      <select
        value={currentLang}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className="input w-full"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {languageNames[lang]}
          </option>
        ))}
      </select>
    </div>
  );
}
