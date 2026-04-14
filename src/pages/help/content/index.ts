/**
 * Help content module — fully i18n-aware.
 *
 * Content is loaded via react-i18next from the `help` namespace.
 * EN content lives in `src/i18n/locales/en/help.json`, DE in `de/help.json`.
 * Use `useHelpContent()` hook to get translated help text.
 */

import { useTranslation } from 'react-i18next';
import { APP_NAME } from '../../../lib/config';

function brand(text: string): string {
  return text.replace(/NinerLog/g, APP_NAME);
}

export const helpSectionIds = [
  'getting-started',
  'aircraft',
  'licenses',
  'credentials',
  'flights',
  'import-export',
  'currency',
  'reports',
  'profile',
  'admin',
] as const;

export type HelpSectionId = (typeof helpSectionIds)[number];

/**
 * Hook returning translated help content for all sections.
 * Automatically switches when the user changes language.
 */
export function useHelpContent() {
  const { t } = useTranslation('help');

  const sections = helpSectionIds.map((id) => ({
    id,
    content: brand(t(id, { defaultValue: '' })),
  }));

  function getContent(id: HelpSectionId): string {
    return brand(t(id, { defaultValue: '' }));
  }

  return { sections, getContent };
}
