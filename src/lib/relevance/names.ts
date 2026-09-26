import type { TFunction } from 'i18next';

/** Short discipline name: "Glider", "Segelflug". */
export const toolkitName = (t: TFunction, d: string): string =>
  t(`relevance:toolkit.${d}`, { defaultValue: d });

/** Toolkit label: "Glider toolkit", "Segelflug-Werkzeuge". */
export const toolkitLabel = (t: TFunction, d: string): string =>
  t('relevance:toolkitLabel', { name: toolkitName(t, d) });
