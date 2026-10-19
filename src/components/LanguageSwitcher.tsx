import { useTranslation } from 'react-i18next';
import { supportedLanguages, languageNames } from '../i18n';
import { useUpdateProfile } from '../hooks/useProfile';
import { useAuthStore } from '../stores/authStore';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('settings');
  const updateProfile = useUpdateProfile();
  const { user, updateUser, isAuthenticated } = useAuthStore();

  const currentLang = supportedLanguages.find(
    (l) => i18n.language === l || i18n.language.startsWith(l),
  ) ?? 'en';

  const handleChange = async (lang: string) => {
    await i18n.changeLanguage(lang);
    if (isAuthenticated) {
      try {
        await updateProfile.mutateAsync({ preferredLocale: lang } as any);
        updateUser({ preferredLocale: lang as 'en' | 'de' });
      } catch {
        // Language change in UI still applies even if API call fails
      }
    }
  };

  const handleLogbookTermsChange = async (english: boolean) => {
    const value = english ? 'english' : 'localized';
    try {
      await updateProfile.mutateAsync({ logbookTerms: value });
      updateUser({ logbookTerms: value });
    } catch {
      // Preference is left unchanged when the API call fails
    }
  };

  return (
    <div className="card mb-6">
      <h2 className="section-title mb-2">{t('language.title')}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">
        {t('language.description')}
      </p>
      <select
        value={currentLang}
        onChange={(e) => handleChange(e.target.value)}
        className="input w-full"
      >
        {supportedLanguages.map((lang) => (
          <option key={lang} value={lang}>
            {languageNames[lang]}
          </option>
        ))}
      </select>
      {isAuthenticated && currentLang !== 'en' && (
        <label className="flex items-start gap-3 cursor-pointer mt-4">
          <input
            type="checkbox"
            checked={user?.logbookTerms === 'english'}
            onChange={(e) => handleLogbookTermsChange(e.target.checked)}
            className="checkbox mt-0.5"
            data-testid="logbook-terms-english-toggle"
          />
          <span className="text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-300">{t('language.logbookTerms')}</span>
            <span className="block text-slate-500 dark:text-slate-400">{t('language.logbookTermsDesc')}</span>
          </span>
        </label>
      )}
    </div>
  );
}
