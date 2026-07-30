---
name: i18n
description: Adding, changing, or translating user-facing strings in NinerLog (i18next, EN + DE namespaces). Load whenever you write text a user will see, add a translation namespace, hit the CI translation-completeness check, or need to keep en/de locale files in sync.
---

# Internationalization

All user-facing text is translated. NinerLog ships **English** and **German**. Translations are namespaced — one JSON per feature area under `src/i18n/locales/<lang>/`.

Namespaces: `common` `auth` `nav` `flights` `aircraft` `dashboard` `currency` `licenses` `credentials` `reports` `settings` `import` `help` `backups` `onboarding` `quicklog` `signatures`.

## Usage

```tsx
import { useTranslation } from 'react-i18next';

const { t } = useTranslation('flights');   // pick the namespace
return <button className="btn-primary">{t('addFlight')}</button>;
```

Cross-namespace access uses the prefixed form: `t('common:save')`.

## Rules

- **Never hard-code a display string in JSX.** This includes button labels, empty states, aria-labels, toasts, and validation messages.
- Every key added to `en` must be added to `de` in the same file. `.github/workflows/i18n-check.yml` diffs leaf keys with `jq` and **fails the build** on any key present in EN but missing in DE. (DE-only keys are a warning, not a failure.)
- The detected language is cached in `localStorage` under `ninerlog-language`; fallback is English.
- Keys are camelCase and grouped by feature, mirroring the UI structure.

## Adding a namespace

A new JSON file is not enough — register it in `src/i18n/index.ts`:

1. `import enFoo from './locales/en/foo.json';` and the `de` counterpart.
2. Add `foo: enFoo` / `foo: deFoo` under the respective `resources` entries.
3. Add `'foo'` to the `ns` array.

## Checking parity locally

```bash
for f in src/i18n/locales/en/*.json; do
  ns=$(basename "$f")
  diff <(jq -r '[paths(scalars)|join(".")]|sort[]' "$f") \
       <(jq -r '[paths(scalars)|join(".")]|sort[]' "src/i18n/locales/de/$ns") \
    >/dev/null || echo "drift in $ns"
done
```

## Translating to German

Aviation terminology stays in the form German-speaking pilots actually use — keep established English abbreviations (PIC, IFR, VFR, PPL, ATPL, METAR) untranslated, and prefer the term from the EASA German-language forms over a literal translation. Match the tone of neighbouring keys; the UI addresses the user informally but not chattily. See `docs/TRANSLATION_GUIDE.md`.
