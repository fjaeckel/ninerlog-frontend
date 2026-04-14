# i18n Developer Guide

This guide explains how to add new translatable strings to the NinerLog frontend.

## Quick Reference

```tsx
// 1. Import the hook
import { useTranslation } from 'react-i18next';

// 2. Use in component
function MyComponent() {
  const { t } = useTranslation('flights'); // namespace
  return <h1>{t('title')}</h1>;
}
```

## Adding New Strings

### Step 1: Add to English locale file

Add your key to the appropriate namespace file in `src/i18n/locales/en/`:

```json
// src/i18n/locales/en/flights.json
{
  "myNewSection": {
    "title": "New Feature",
    "description": "This is a new feature."
  }
}
```

### Step 2: Add German translation

Add the same key structure to `src/i18n/locales/de/`:

```json
// src/i18n/locales/de/flights.json
{
  "myNewSection": {
    "title": "Neue Funktion",
    "description": "Dies ist eine neue Funktion."
  }
}
```

### Step 3: Use in component

```tsx
const { t } = useTranslation('flights');
return <p>{t('myNewSection.description')}</p>;
```

## Namespaces

| Namespace | File | Purpose |
|-----------|------|---------|
| `common` | common.json | Shared strings: buttons, errors, navigation, admin |
| `auth` | auth.json | Login, register, 2FA, password reset |
| `nav` | nav.json | Sidebar/mobile navigation labels |
| `flights` | flights.json | Flight form, list, detail page |
| `aircraft` | aircraft.json | Aircraft CRUD |
| `dashboard` | dashboard.json | Dashboard page |
| `currency` | currency.json | Currency & recency |
| `licenses` | licenses.json | License and class rating CRUD |
| `credentials` | credentials.json | Credential CRUD |
| `reports` | reports.json | Reports and charts |
| `settings` | settings.json | Profile/settings page |
| `import` | import.json | CSV import wizard |
| `help` | help.json | Help Base content |

## Cross-namespace references

Use `namespace:key` syntax to reference keys from another namespace:

```tsx
const { t } = useTranslation('flights');
t('common:cancel')  // References common.json → cancel
t('common:loading') // References common.json → loading
```

## Interpolation

```json
{ "greeting": "Hello, {{name}}!" }
```
```tsx
t('greeting', { name: user.name }) // "Hello, John!"
```

## Date & Number Formatting

**Do NOT use `format()` from date-fns directly.** Use the `useFormatPrefs()` hook:

```tsx
import { useFormatPrefs } from '../hooks/useFormatPrefs';

function MyComponent() {
  const { fmtDate, fmtDateTime, fmtDateLong, fmtDuration } = useFormatPrefs();

  return (
    <div>
      <p>{fmtDate(flight.date)}</p>       {/* "14.04.2026" or "04/14/2026" */}
      <p>{fmtDateTime(flight.createdAt)}</p> {/* "14.04.2026 15:30" */}
      <p>{fmtDateLong(flight.date)}</p>    {/* "Montag, 14. April 2026" */}
      <p>{fmtDuration(flight.totalTime)}</p> {/* "1h 30m" or "1,5h" */}
    </div>
  );
}
```

The hook reads the user's `dateFormat`, `timeDisplayFormat`, and `decimalSeparator` preferences from the auth store.

For non-React contexts (utility functions), import the raw functions and pass preferences as parameters:

```ts
import { formatDate, type DateFormatPref } from '../lib/dateFormat';
import { formatDuration, type TimeDisplayFormat, type DecimalSeparator } from '../lib/duration';
```

## CI Check

The `i18n-check.yml` workflow verifies that EN and DE have identical key sets. It runs on any push/PR that modifies `src/i18n/locales/**`.
