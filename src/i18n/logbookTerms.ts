import type { i18n as I18n, PostProcessorModule, TOptions } from 'i18next';
import { useAuthStore } from '../stores/authStore';

/** i18next event emitted when the logbook-terms preference changes. */
export const LOGBOOK_TERMS_CHANGED = 'logbookTermsChanged';

/**
 * Keys rendered in English when the user's `logbookTerms` preference is
 * `english`: logbook field names, flight-time column headings, pilot functions
 * and crew roles. `ns:key` matches one key; a trailing `*` matches a prefix.
 */
export const LOGBOOK_TERM_KEYS: readonly string[] = [
  'flights:fields.*',
  'flights:table*',
  'flights:crewRoles.*',
  'flights:launchMethods.*',
  'flights:approachTypes.*',
  'flights:simulatorBadge',
  'flights:passengerBadge',
  'flights:filterPicOnly',
  'flights:filterDualOnly',
  'flights:detail.aircraft',
  'flights:detail.departure',
  'flights:detail.arrival',
  'flights:detail.offBlock',
  'flights:detail.takeoff',
  'flights:detail.landing',
  'flights:detail.onBlock',
  'flights:detail.totalBlockTime',
  'flights:detail.pilotFunction',
  'flights:detail.dualTime',
  'flights:detail.crossCountry',
  'flights:detail.sicTime',
  'flights:detail.dualGiven',
  'flights:detail.instructor',
  'flights:detail.instructorComments',
  'flights:detail.totalTakeoffs',
  'flights:detail.totalLandings',
  'dashboard:breakdownLabels.*',
  'dashboard:stats.totalTime',
  'dashboard:stats.picTime',
  'dashboard:stats.landings',
  'reports:role.*',
  'quicklog:offBlock',
  'quicklog:takeoff',
  'quicklog:landing',
  'quicklog:onBlock',
  'quicklog:blockTime',
  'settings:baseline.fields.*',
];

const exactKeys = new Set(LOGBOOK_TERM_KEYS.filter((k) => !k.endsWith('*')));
const prefixKeys = LOGBOOK_TERM_KEYS.filter((k) => k.endsWith('*')).map((k) => k.slice(0, -1));

/** Whether `ns:key` is a logbook term. */
export function isLogbookTerm(ns: string, key: string): boolean {
  const full = `${ns}:${key}`;
  return exactKeys.has(full) || prefixKeys.some((p) => full.startsWith(p));
}

/** Whether the signed-in user wants logbook terms in English. */
export function englishLogbookTerms(): boolean {
  return useAuthStore.getState().user?.logbookTerms === 'english';
}

interface ResolvedOptions extends TOptions {
  i18nResolved?: { usedKey?: string; usedNS?: string; usedLng?: string; res?: unknown };
}

interface Translator {
  translate: (key: string, options: TOptions) => string;
}

/** Re-translates logbook terms in English. Needs `postProcessPassResolved: true`. */
export const logbookTermsPostProcessor: PostProcessorModule = {
  type: 'postProcessor',
  name: 'logbookTerms',
  process(value, _key, options: ResolvedOptions, translator: Translator) {
    const resolved = options.i18nResolved;
    if (!resolved?.res || !resolved.usedKey || !resolved.usedNS) return value;
    if (resolved.usedLng === 'en' || !englishLogbookTerms()) return value;
    if (!isLogbookTerm(resolved.usedNS, resolved.usedKey)) return value;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { i18nResolved, lngs, ...rest } = options;
    return translator.translate(resolved.usedKey, {
      ...rest,
      ns: resolved.usedNS,
      lng: 'en',
      applyPostProcessor: false,
    });
  },
};

/** Re-renders translations whenever the stored preference changes. */
export function bindLogbookTermsToAuth(i18n: I18n): () => void {
  let previous = englishLogbookTerms();
  return useAuthStore.subscribe(() => {
    const next = englishLogbookTerms();
    if (next === previous) return;
    previous = next;
    i18n.emit(LOGBOOK_TERMS_CHANGED);
  });
}
