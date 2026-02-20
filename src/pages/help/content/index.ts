/**
 * Help content module — i18n-ready.
 *
 * Content is sourced from `src/i18n/locales/en/help.json` (the single source
 * of truth). When react-i18next is installed in Phase 7, this module can be
 * replaced with `t('help:<sectionId>')` calls — the JSON namespace is already
 * structured for that.
 *
 * Until then, we import the JSON directly and re-export each section as a
 * named constant so existing consumers (HelpPage, tests) continue to work
 * without changes.
 */

import helpContent from '../../../i18n/locales/en/help.json';
import { APP_NAME } from '../../../lib/config';

/**
 * Replace all occurrences of "NinerLog" in help content with the configured
 * APP_NAME. This allows the help text to reflect a custom product name set
 * via the VITE_APP_NAME environment variable.
 */
function brand(text: string): string {
  return text.replace(/NinerLog/g, APP_NAME);
}

// Re-export individual sections for backwards-compatible named imports
export const gettingStarted: string = brand(helpContent['getting-started']);
export const aircraft: string = brand(helpContent['aircraft']);
export const licenses: string = brand(helpContent['licenses']);
export const credentials: string = brand(helpContent['credentials']);
export const flights: string = brand(helpContent['flights']);
export const importExport: string = brand(helpContent['import-export']);
export const currency: string = brand(helpContent['currency']);
export const reports: string = brand(helpContent['reports']);
export const profile: string = brand(helpContent['profile']);
export const admin: string = brand(helpContent['admin']);

/**
 * All section IDs available in the help namespace.
 * Matches the keys in en/help.json (excluding _meta).
 */
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
 * Get help content by section ID.
 * In Phase 7 this becomes: `t(`help:${id}`)`.
 */
export function getHelpContent(id: HelpSectionId): string {
  return brand(helpContent[id]);
}
