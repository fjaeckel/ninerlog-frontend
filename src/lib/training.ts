import type { TFunction } from 'i18next';
import type { TrainingItem, TrainingProgramme, TrainingUnit } from '../hooks/useTrainingProgress';

/**
 * Every `training.*` key the API emits, from ninerlog-api docs/CURRENCY_MESSAGES.md
 * "Training progress (`GET /training/progress`)". Keep in step with that table.
 */
export const TRAINING_MESSAGE_KEYS = [
  'training.programme.spl',
  'training.programme.spl_tmg_extension',
  'training.programme.ul_three_axis',
  'training.programme.ul_weight_shift',
  'training.spl.instruction_time',
  'training.spl.dual_time',
  'training.spl.supervised_solo_time',
  'training.spl.launches',
  'training.spl.cross_country',
  'training.spl.credit_sfcl130b',
  'training.tmg.instruction_time',
  'training.tmg.dual_time',
  'training.tmg.solo_cross_country',
  'training.ul.total_time',
  'training.ul.dual_time',
  'training.ul.solo_time',
  'training.met',
  'training.not_met',
  'training.cross_country_distance_unknown',
  'training.credit_available',
  'training.credit_none',
] as const;

/** Article behind a requirement key (docs/SAILPLANES.md, docs/DOMAIN.md "Training progress"). */
export function itemLegalBasis(key: string, programme: Pick<TrainingProgramme, 'legalBasis'>): string {
  if (key === 'training.spl.credit_sfcl130b') return 'SFCL.130(b)';
  if (key.startsWith('training.spl.')) return 'SFCL.130(a)';
  return programme.legalBasis;
}

/** `key` without the `training.` prefix, for nested translation lookups. */
const bare = (key: string) => key.replace(/^training\./, '');

/** An amount in `unit`: minutes through `fmtDuration`, counts pluralised. */
export function formatTrainingAmount(
  t: TFunction,
  value: number,
  unit: TrainingUnit,
  fmtDuration: (minutes: number) => string,
): string {
  if (unit === 'minutes') return fmtDuration(value);
  return t(`currency:trainingCard.amount.${unit}`, { count: value });
}

/** `current / required` with the unit, e.g. `7h 10m / 15h 0m` or `92 / 45 launches`. */
export function formatTrainingProgress(
  t: TFunction,
  item: Pick<TrainingItem, 'current' | 'required' | 'unit'>,
  fmtDuration: (minutes: number) => string,
): string {
  if (item.unit === 'minutes') {
    return t('currency:trainingCard.progress', { current: fmtDuration(item.current), required: fmtDuration(item.required) });
  }
  const progress = t('currency:trainingCard.progress', { current: item.current, required: item.required });
  return `${progress} ${t(`currency:trainingCard.unit.${item.unit}`)}`;
}

/** Requirement label for `item.key`. */
export function trainingItemLabel(t: TFunction, key: string): string {
  return t(`currency:messages.${key}`, { defaultValue: key });
}

/** Programme title, e.g. `SPL — SFCL.130`. */
export function trainingProgrammeTitle(t: TFunction, p: Pick<TrainingProgramme, 'titleKey' | 'legalBasis' | 'id'>): string {
  const name = t(`currency:messages.${p.titleKey}`, { defaultValue: p.id });
  return t('currency:trainingCard.programmeTitle', { name, basis: p.legalBasis });
}

/** Status text for `item.messageKey`, with the remaining or credited amount filled in. */
export function trainingItemMessage(
  t: TFunction,
  item: TrainingItem,
  fmtDuration: (minutes: number) => string,
): string {
  const remaining = formatTrainingAmount(t, Math.max(item.required - item.current, 0), item.unit, fmtDuration);
  const amount = formatTrainingAmount(t, item.current, item.unit, fmtDuration);
  return t(`currency:messages.${item.messageKey}`, { remaining, amount, defaultValue: '' });
}

/** What counts toward `key`, for the details view. */
export function trainingItemCounts(t: TFunction, key: string): string {
  return t(`currency:trainingCard.counts.${bare(key)}`, { defaultValue: '' });
}
