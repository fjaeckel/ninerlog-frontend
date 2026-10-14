import type { components } from '../api/schema';
import type { FeatureId } from './relevance/registry';

export type CustomReport = components['schemas']['CustomReport'];
export type CustomReportInput = components['schemas']['CustomReportInput'];
export type CustomReportDefinition = components['schemas']['CustomReportDefinition'];
export type CustomReportFilter = components['schemas']['CustomReportFilter'];
export type CustomReportWindow = components['schemas']['CustomReportWindow'];
export type CustomReportGroupBy = components['schemas']['CustomReportGroupBy'];
export type CustomReportMetric = components['schemas']['CustomReportMetric'];
export type CustomReportResult = components['schemas']['CustomReportResult'];
export type CustomReportRow = components['schemas']['CustomReportRow'];
export type CustomReportTotals = components['schemas']['CustomReportTotals'];
export type CustomReportWindowKind = CustomReportWindow['kind'];

export const GROUP_BYS: readonly CustomReportGroupBy[] = [
  'month',
  'year',
  'dayOfWeek',
  'aircraftType',
  'registration',
  'departure',
  'arrival',
  'route',
  'launchMethod',
  'aircraftClass',
  'ulKind',
];

export const METRICS: readonly CustomReportMetric[] = [
  'flights',
  'totalTime',
  'picTime',
  'dualTime',
  'dualGivenTime',
  'nightTime',
  'ifrTime',
  'crossCountryTime',
  'fstdTime',
  'landings',
  'launches',
  'outlandings',
  'towFlights',
];

/** Soaring metrics; a result table shows them only when charted or not zero. */
export const SOARING_METRICS: readonly CustomReportMetric[] = ['launches', 'outlandings', 'towFlights'];

/** Registry entry deciding whether a metric is offered first in the picker. */
export const METRIC_FEATURES: Partial<Record<CustomReportMetric, FeatureId>> = {
  launches: 'reportMetric.launches',
  outlandings: 'reportMetric.outlandings',
  towFlights: 'reportMetric.towFlights',
};

/** Metrics a result table shows: every metric except soaring ones that are neither charted nor used. */
export function tableMetrics(result: Pick<CustomReportResult, 'metric' | 'totals'>): CustomReportMetric[] {
  return METRICS.filter(
    (m) => !SOARING_METRICS.includes(m) || m === result.metric || (result.totals[m] ?? 0) !== 0,
  );
}

export const WINDOW_KINDS: readonly CustomReportWindowKind[] = ['all', 'lastMonths', 'yearToDate', 'range'];

/** Groupings the API orders chronologically and gap-fills. */
export const TIME_GROUPINGS: readonly CustomReportGroupBy[] = ['month', 'year', 'dayOfWeek'];

export const DEFAULT_LIMIT = 20;
export const MAX_NAME_LENGTH = 120;
export const DEFAULT_WINDOW: CustomReportWindow = { kind: 'lastMonths', months: 12 };

export const isRankedGrouping = (groupBy: CustomReportGroupBy) => !TIME_GROUPINGS.includes(groupBy);

/** Whether a metric is a duration in minutes rather than a count. */
export const isDurationMetric = (metric: CustomReportMetric) =>
  !['flights', 'landings', 'launches', 'outlandings', 'towFlights'].includes(metric);

/** Filter keys shown as removable chips. */
export const STRUCTURED_FILTER_KEYS = [
  'aircraftReg',
  'departureIcao',
  'arrivalIcao',
  'role',
  'logbookLicenseId',
] as const;
export type StructuredFilterKey = (typeof STRUCTURED_FILTER_KEYS)[number];

/** Builds a report definition from the Flights page's URL search params. */
export function definitionFromSearchParams(params: URLSearchParams): CustomReportDefinition {
  const get = (key: string) => params.get(key)?.trim() ?? '';
  const filter: CustomReportFilter = {};
  if (get('q')) filter.q = get('q');
  if (get('aircraftReg')) filter.aircraftReg = get('aircraftReg');
  if (get('departureIcao')) filter.departureIcao = get('departureIcao').toUpperCase();
  if (get('arrivalIcao')) filter.arrivalIcao = get('arrivalIcao').toUpperCase();
  const fn = get('function');
  if (fn === 'pic' || fn === 'dual') filter.role = fn;
  if (get('logbook')) filter.logbookLicenseId = get('logbook');

  const startDate = get('startDate');
  const endDate = get('endDate');
  const window: CustomReportWindow =
    startDate || endDate
      ? { kind: 'range', ...(startDate ? { startDate } : {}), ...(endDate ? { endDate } : {}) }
      : { ...DEFAULT_WINDOW };

  return { filter, window, groupBy: 'month', metric: 'totalTime' };
}

/**
 * Flights page search params reproducing a report's filter, bounded by the
 * resolved window when given, else by the definition's own range.
 */
export function flightSearchParamsFor(
  definition: CustomReportDefinition,
  resolved?: { startDate?: string; endDate?: string }
): URLSearchParams {
  const { filter, window } = definition;
  const params = new URLSearchParams();
  if (filter.q) params.set('q', filter.q);
  if (filter.aircraftReg) params.set('aircraftReg', filter.aircraftReg);
  if (filter.departureIcao) params.set('departureIcao', filter.departureIcao);
  if (filter.arrivalIcao) params.set('arrivalIcao', filter.arrivalIcao);
  if (filter.role) params.set('function', filter.role);
  if (filter.logbookLicenseId) params.set('logbook', filter.logbookLicenseId);
  const startDate = resolved ? resolved.startDate : window.kind === 'range' ? window.startDate : undefined;
  const endDate = resolved ? resolved.endDate : window.kind === 'range' ? window.endDate : undefined;
  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  return params;
}

/** Drops empty filter values and fields that do not apply to the window kind or grouping. */
export function normalizeDefinition(definition: CustomReportDefinition): CustomReportDefinition {
  const filter: CustomReportFilter = {};
  for (const [key, value] of Object.entries(definition.filter) as [keyof CustomReportFilter, string | undefined][]) {
    const trimmed = value?.trim();
    if (trimmed) (filter as Record<string, string>)[key] = trimmed;
  }
  const { kind } = definition.window;
  const window: CustomReportWindow = { kind };
  if (kind === 'lastMonths') window.months = definition.window.months;
  if (kind === 'range') {
    if (definition.window.startDate) window.startDate = definition.window.startDate;
    if (definition.window.endDate) window.endDate = definition.window.endDate;
  }
  const out: CustomReportDefinition = { filter, window, groupBy: definition.groupBy, metric: definition.metric };
  if (isRankedGrouping(definition.groupBy) && definition.limit != null) out.limit = definition.limit;
  return out;
}

/** Client-side bounds check mirroring the API's; the API stays authoritative. */
export function isDefinitionValid(definition: CustomReportDefinition): boolean {
  const { window, limit, groupBy } = definition;
  if (window.kind === 'lastMonths') {
    const m = window.months;
    if (m == null || !Number.isInteger(m) || m < 1 || m > 120) return false;
  }
  if (window.kind === 'range' && window.startDate && window.endDate && window.startDate > window.endDate) {
    return false;
  }
  if (isRankedGrouping(groupBy) && limit != null && (!Number.isInteger(limit) || limit < 1 || limit > 100)) {
    return false;
  }
  return true;
}

/** Localized label for a result row key; null when the key is empty. */
export function localizedGroupLabel(
  groupBy: CustomReportGroupBy,
  key: string,
  fallback: string,
  locale: string,
  short = false
): string | null {
  if (key === '') return null;
  try {
    if (groupBy === 'month') {
      const [y, m] = key.split('-').map(Number);
      if (!y || !m) return fallback || key;
      return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(locale, {
        month: 'short',
        year: short ? '2-digit' : 'numeric',
        timeZone: 'UTC',
      });
    }
    if (groupBy === 'dayOfWeek') {
      const d = Number(key);
      if (!Number.isInteger(d) || d < 1 || d > 7) return fallback || key;
      // 2024-01-01 is a Monday.
      return new Date(Date.UTC(2024, 0, d)).toLocaleDateString(locale, {
        weekday: short ? 'short' : 'long',
        timeZone: 'UTC',
      });
    }
  } catch {
    return fallback || key;
  }
  if (groupBy === 'route') return key.replace('-', ' → ');
  return key;
}
