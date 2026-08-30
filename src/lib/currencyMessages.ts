import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useFormatPrefs } from '../hooks/useFormatPrefs';
import type { CurrencyMessageParams, CurrencyRequirement } from '../types/api';

/** Anything the currency engine keys: a rating, a passenger status, a flight review, a requirement. */
export interface KeyedMessage {
  messageKey?: string;
  messageParams?: CurrencyMessageParams;
  message?: string;
}

/** A requirement whose name is keyed. Custom rules carry `name` only. */
export interface KeyedName {
  nameKey?: string;
  name?: string;
}

type DateFormatter = (date: string) => string;

/**
 * Resolves `messages.<messageKey>` with its params, falling back to the
 * deprecated English `message` for keys this build does not know.
 * `extra` supplies values composed from the enclosing object's own fields,
 * which the contract keeps out of messageParams.
 */
export function resolveCurrencyMessage(
  t: TFunction,
  source: KeyedMessage | null | undefined,
  fmtDate: DateFormatter,
  extra?: Record<string, unknown>,
): string {
  const fallback = source?.message ?? '';
  if (!source?.messageKey) return fallback;

  const params = source.messageParams;
  return t(`messages.${source.messageKey}`, {
    ...extra,
    days: params?.days,
    needed: params?.needed,
    date: params?.date ? fmtDate(params.date) : undefined,
    count: params?.needed ?? params?.days,
    defaultValue: fallback,
  });
}

/**
 * Resolves a requirement's `nameKey`. Custom currency rules have no nameKey —
 * their `name` is pilot-authored user data and is rendered as-is.
 */
export function resolveRequirementName(t: TFunction, req: KeyedName | null | undefined): string {
  const fallback = req?.name ?? '';
  if (!req?.nameKey) return fallback;
  return t(req.nameKey, { defaultValue: fallback });
}

/** Renders a requirement amount without a trailing `.0`. */
export function formatAmount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

/**
 * Binds the resolvers to the `currency` namespace and the user's formatting
 * preferences. Every call site that renders currency engine text goes through
 * this — no component resolves a message key on its own.
 */
export function useCurrencyMessages() {
  const { t } = useTranslation('currency');
  const { fmtDate, fmtDuration } = useFormatPrefs();

  const currencyMessage = (source: KeyedMessage | null | undefined, extra?: Record<string, unknown>) =>
    resolveCurrencyMessage(t, source, fmtDate, extra);

  return {
    currencyMessage,

    requirementName: (req: KeyedName | null | undefined) => resolveRequirementName(t, req),

    /** Right-hand progress text of a requirement bar. Durations honour the user's time format. */
    requirementProgress: (req: CurrencyRequirement) =>
      req.unit === 'minutes'
        ? `${fmtDuration(req.current)} / ${fmtDuration(req.required)}`
        : currencyMessage(req, {
            current: formatAmount(req.current),
            required: formatAmount(req.required),
            unit: t(`units.${req.unit}`, { defaultValue: req.unit }),
          }),
  };
}
