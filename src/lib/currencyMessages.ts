import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useFormatPrefs } from '../hooks/useFormatPrefs';
import type { CurrencyMessageParams, CurrencyRemedy, CurrencyRequirement } from '../types/api';

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

/** Translation key of a launch method in the `flights` namespace. */
export function launchMethodKey(method: string): string {
  return `launchMethods.${method === 'self-launch' ? 'selfLaunch' : method}`;
}

/**
 * Resolves a remedy key with its params. An unknown key, or a known key
 * missing a param it needs, renders the generic `remedyUnrecognised`.
 */
export function resolveRemedy(
  t: TFunction,
  remedy: CurrencyRemedy | null | undefined,
  fmtDuration: (minutes: number) => string,
): string {
  const key = remedy?.remedyKey;
  if (!key) return '';
  const params = remedy?.remedyParams;
  const generic = t('remedyUnrecognised');
  switch (key) {
    case 'remedy.fly_more': {
      if (params?.missing == null || !params.unit) return generic;
      const amount = params.unit === 'minutes'
        ? t('remedyAmount.minutes', { duration: fmtDuration(params.missing) })
        : t(`remedyAmount.${params.unit}`, {
          count: params.missing,
          defaultValue: `${formatAmount(params.missing)} ${t(`units.${params.unit}`, { defaultValue: params.unit })}`,
        });
      return t('messages.remedy.fly_more', { amount });
    }
    case 'remedy.launch_method_dual': {
      if (params?.missing == null || !params.method) return generic;
      return t('messages.remedy.launch_method_dual', {
        count: params.missing,
        method: t(launchMethodKey(params.method), { ns: 'flights', defaultValue: params.method }),
      });
    }
    default:
      return t(`messages.${key}`, { defaultValue: '' }) || generic;
  }
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

  const remedy = (source: CurrencyRemedy | null | undefined) => resolveRemedy(t, source, fmtDuration);

  return {
    currencyMessage,

    /** What restores an unmet row; empty when the row carries no remedy. */
    remedy,

    /** "valid until <date>" in the user's date format. */
    validUntil: (date: string) => t('validUntil', { date: fmtDate(date) }),

    /** Localised launch method name. */
    launchMethod: (method: string) => t(launchMethodKey(method), { ns: 'flights', defaultValue: method }),

    /**
     * Why a readiness item is (not) ready. Remedy keys go through `remedy`,
     * every other key through the currency catalogue; unknown keys render the
     * generic text.
     */
    readinessReason: (item: { reasonKey: string; params?: CurrencyMessageParams }) => {
      if (item.reasonKey.startsWith('remedy.')) {
        return remedy({ remedyKey: item.reasonKey, remedyParams: item.params });
      }
      if (item.reasonKey === 'readiness.credential_valid' && !item.params?.date) {
        return t('readinessCredentialValidNoExpiry');
      }
      return currencyMessage({ messageKey: item.reasonKey, messageParams: item.params }) || t('messageUnrecognised');
    },

    requirementName: (req: KeyedName | null | undefined) => resolveRequirementName(t, req),

    /** Right-hand progress text of a requirement bar. Durations honour the user's time format. */
    requirementProgress: (req: CurrencyRequirement) =>
      req.unit === 'minutes'
        ? req.nameKey === 'requirement.training_flight'
          ? t('requirementLongest', { current: fmtDuration(req.current), required: fmtDuration(req.required) })
          : `${fmtDuration(req.current)} / ${fmtDuration(req.required)}`
        : currencyMessage(req, {
            current: formatAmount(req.current),
            required: formatAmount(req.required),
            unit: t(`units.${req.unit}`, { defaultValue: req.unit }),
          }),
  };
}
