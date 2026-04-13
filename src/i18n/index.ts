import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// English namespaces
import enCommon from './locales/en/common.json';
import enAuth from './locales/en/auth.json';
import enNav from './locales/en/nav.json';
import enFlights from './locales/en/flights.json';
import enAircraft from './locales/en/aircraft.json';
import enDashboard from './locales/en/dashboard.json';
import enCurrency from './locales/en/currency.json';
import enLicenses from './locales/en/licenses.json';
import enCredentials from './locales/en/credentials.json';
import enReports from './locales/en/reports.json';
import enSettings from './locales/en/settings.json';
import enImport from './locales/en/import.json';
import enHelp from './locales/en/help.json';

// German namespaces
import deCommon from './locales/de/common.json';
import deAuth from './locales/de/auth.json';
import deNav from './locales/de/nav.json';
import deFlights from './locales/de/flights.json';
import deAircraft from './locales/de/aircraft.json';
import deDashboard from './locales/de/dashboard.json';
import deCurrency from './locales/de/currency.json';
import deLicenses from './locales/de/licenses.json';
import deCredentials from './locales/de/credentials.json';
import deReports from './locales/de/reports.json';
import deSettings from './locales/de/settings.json';
import deImport from './locales/de/import.json';
import deHelp from './locales/de/help.json';

export const supportedLanguages = ['en', 'de'] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageNames: Record<SupportedLanguage, string> = {
  en: 'English',
  de: 'Deutsch',
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        auth: enAuth,
        nav: enNav,
        flights: enFlights,
        aircraft: enAircraft,
        dashboard: enDashboard,
        currency: enCurrency,
        licenses: enLicenses,
        credentials: enCredentials,
        reports: enReports,
        settings: enSettings,
        import: enImport,
        help: enHelp,
      },
      de: {
        common: deCommon,
        auth: deAuth,
        nav: deNav,
        flights: deFlights,
        aircraft: deAircraft,
        dashboard: deDashboard,
        currency: deCurrency,
        licenses: deLicenses,
        credentials: deCredentials,
        reports: deReports,
        settings: deSettings,
        import: deImport,
        help: deHelp,
      },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common', 'auth', 'nav', 'flights', 'aircraft', 'dashboard',
      'currency', 'licenses', 'credentials', 'reports', 'settings',
      'import', 'help',
    ],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'ninerlog-language',
      caches: ['localStorage'],
    },
  });

export default i18n;
