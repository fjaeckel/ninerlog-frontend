# Translation Contribution Guide

Thank you for contributing translations to NinerLog! This guide explains how to add a new language or improve existing translations.

## Overview

NinerLog uses [react-i18next](https://react.i18next.com/) for internationalization. Translations are organized into **namespace files** (JSON) stored in `src/i18n/locales/<lang>/`.

Currently supported languages:
- **English (en)** — source language (always complete)
- **German (de)** — full translation

## Directory Structure

```
src/i18n/locales/
  en/               ← Source language
    common.json      ← Shared UI strings (navigation, buttons, errors, admin)
    auth.json        ← Login, register, password reset
    nav.json         ← Navigation labels
    flights.json     ← Flight form, list, detail page
    aircraft.json    ← Aircraft form and list
    dashboard.json   ← Dashboard page
    currency.json    ← Currency & recency status
    licenses.json    ← License and class rating forms
    credentials.json ← Credential forms and lists
    reports.json     ← Reports and charts
    settings.json    ← Profile settings page
    import.json      ← Import wizard
    help.json        ← Help Base content
  de/               ← German translations (same file structure)
    common.json
    auth.json
    ...
```

## Adding a New Language

1. **Create the locale directory:**

   ```bash
   mkdir src/i18n/locales/fr  # Example: French
   ```

2. **Copy all English namespace files:**

   ```bash
   cp src/i18n/locales/en/*.json src/i18n/locales/fr/
   ```

3. **Translate each file.** Replace English values with translated text. Keep the JSON keys unchanged.

4. **Register the language in `src/i18n/index.ts`:**

   ```ts
   // Add imports
   import frCommon from './locales/fr/common.json';
   import frAuth from './locales/fr/auth.json';
   // ... all 13 namespaces

   // Add to supportedLanguages
   export const supportedLanguages = ['en', 'de', 'fr'] as const;

   // Add to languageNames
   export const languageNames = { en: 'English', de: 'Deutsch', fr: 'Français' };

   // Add to resources in init()
   fr: { common: frCommon, auth: frAuth, ... },
   ```

5. **Add the locale to the backend** — update the `preferred_locale` validation in `internal/api/handlers/user.go` to accept the new locale code.

6. **Run the CI check** to verify all keys are present:

   ```bash
   # The i18n-check workflow runs automatically on PR
   ```

## Translation Guidelines

### General
- Keep translations **concise** — German words are often longer than English; ensure they fit the UI layout.
- Use **formal German** (Sie-Form) consistently.
- Keep **technical terms** in English when they are standard aviation terminology (e.g., "PIC", "IFR", "METAR").

### Aviation Terminology
- Keep regulatory references untranslated: "FCL.740.A", "14 CFR 61.57", "LuftPersV §45"
- Aircraft class types stay in English: "SEP", "MEP", "TMG", "IR"
- Translate descriptive terms: "Klassenberechtigung" for "class rating", "Flugüberprüfung" for "flight review"

### Interpolation
- Translation strings use `{{variable}}` syntax for dynamic values: `"Expires in {{days}} days"`
- Do NOT change variable names — they must match the code.

### Pluralization
- English uses `_one` / `_other` suffixes: `"alerts_one": "{{count}} alert"`, `"alerts_other": "{{count}} alerts"`
- Check [i18next pluralization rules](https://www.i18next.com/translation-function/plurals) for your language.

## Testing Translations

1. Switch language in Profile → Preferences → Language
2. Navigate through all major pages to verify translations appear correctly
3. Check mobile layout — German text is typically 20-30% longer than English
4. Verify no raw keys (e.g., `common.loading`) are displayed

## CI Verification

The `i18n-check.yml` GitHub Actions workflow automatically verifies that all translation keys present in `en/*.json` also exist in `de/*.json` (and any other supported languages). Missing keys will fail the check.
