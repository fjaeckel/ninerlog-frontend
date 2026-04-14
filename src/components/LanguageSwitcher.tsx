import { useTranslation } from 'react-i18next';
import { supportedLanguages, languageNames } from '../i18n';
import { useUpdateProfile } from '../hooks/useProfile';
import { useAuthStore } from '../stores/authStore';

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('settings');
  const updateProfile = useUpdateProfile();
  const { updateUser, isAuthenticated } = useAuthStore();

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
    </div>
  );
}
