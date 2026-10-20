import type { TFunction } from 'i18next';
import { httpStatusOf } from '../api/client';
import { extractApiCode, extractApiError } from './errors';

/** True for the API's 400 on a correction or void reason over its length limit. */
export function isReasonTooLong(err: unknown): boolean {
  return httpStatusOf(err) === 400 && /too long/i.test(extractApiError(err, ''));
}

/**
 * Localized message for a strict-logbook error from a flight update or delete,
 * or `undefined` when the error is not one of them.
 */
export function logbookErrorMessage(err: unknown, t: TFunction): string | undefined {
  const code = extractApiCode(err);
  if (code === 'correction_reason_required') return t('logbook:errors.reasonRequired');
  if (code === 'override_exceeds_calculated') return t('logbook:errors.overrideExceeds');
  if (isReasonTooLong(err)) return t('logbook:errors.reasonTooLong');
  const status = httpStatusOf(err);
  if (status === 409) return t('logbook:errors.locked');
  if (status === 404) return t('logbook:errors.notFound');
  return undefined;
}
