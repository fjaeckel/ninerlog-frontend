import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { useLicenses } from '../../hooks/useLicenses';
import {
  isDurationMetric,
  localizedGroupLabel,
  METRICS,
  type CustomReportDefinition,
  type CustomReportMetric,
  type CustomReportResult,
  type CustomReportRow,
  type CustomReportTotals,
} from '../../lib/customReports';
import type { TableColumn } from './primitives';

/** Formatters for custom report rows, metrics and definitions. */
export function useCustomReportFormat() {
  const { t, i18n } = useTranslation('reports');
  const { fmtDuration, fmtDate } = useFormatPrefs();
  const locale = i18n.language;

  const fmtMetric = useCallback(
    (metric: CustomReportMetric, value: number) =>
      isDurationMetric(metric) ? fmtDuration(value) : value.toLocaleString(locale),
    [fmtDuration, locale]
  );

  const rowLabel = useCallback(
    (result: Pick<CustomReportResult, 'groupBy'>, row: Pick<CustomReportRow, 'key' | 'label'>, short = false) =>
      localizedGroupLabel(result.groupBy, row.key, row.label, locale, short) ?? t('custom.unknownGroup'),
    [locale, t]
  );

  const windowLabel = useCallback(
    (definition: CustomReportDefinition) => {
      const w = definition.window;
      switch (w.kind) {
        case 'all':
          return t('custom.window.allLabel');
        case 'lastMonths':
          return t('custom.window.lastMonthsLabel', { count: w.months ?? 0 });
        case 'yearToDate':
          return t('custom.window.yearToDateLabel');
        case 'range':
          if (w.startDate && w.endDate) {
            return t('custom.window.rangeLabel', { from: fmtDate(w.startDate), to: fmtDate(w.endDate) });
          }
          if (w.startDate) return t('custom.window.fromLabel', { from: fmtDate(w.startDate) });
          if (w.endDate) return t('custom.window.untilLabel', { to: fmtDate(w.endDate) });
          return t('custom.window.allLabel');
      }
    },
    [t, fmtDate]
  );

  /** One line: metric by grouping, window, then each active filter. */
  const summary = useCallback(
    (definition: CustomReportDefinition, logbookLabel?: (id: string) => string | undefined) => {
      const f = definition.filter;
      const parts = [
        t('custom.metricByGroup', {
          metric: t(`custom.metric.${definition.metric}`),
          groupBy: t(`custom.groupByInline.${definition.groupBy}`),
        }),
        windowLabel(definition),
      ];
      if (f.aircraftReg) parts.push(f.aircraftReg);
      if (f.departureIcao) parts.push(t('custom.filter.departureValue', { value: f.departureIcao }));
      if (f.arrivalIcao) parts.push(t('custom.filter.arrivalValue', { value: f.arrivalIcao }));
      if (f.role) parts.push(t(`custom.filter.role.${f.role}`));
      if (f.logbookLicenseId) {
        parts.push(logbookLabel?.(f.logbookLicenseId) ?? t('custom.filter.logbook'));
      }
      if (f.q) parts.push(`“${f.q}”`);
      return parts.join(' · ');
    },
    [t, windowLabel]
  );

  return { fmtMetric, rowLabel, windowLabel, summary };
}

/** Table columns: the group, then every metric. */
export function useCustomReportColumns(
  result: CustomReportResult | undefined
): TableColumn<CustomReportRow | TotalsRow>[] {
  const { t } = useTranslation('reports');
  const { fmtMetric, rowLabel } = useCustomReportFormat();
  return useMemo(() => {
    if (!result) return [];
    return [
      {
        key: 'group',
        header: t(`custom.groupBy.${result.groupBy}`),
        numeric: false,
        render: (r) =>
          'isTotal' in r ? <strong className="font-semibold">{t('custom.totals')}</strong> : rowLabel(result, r),
      },
      ...METRICS.map<TableColumn<CustomReportRow | TotalsRow>>((metric) => ({
        key: metric,
        header: t(`custom.metricShort.${metric}`),
        render: (r) => {
          const v = fmtMetric(metric, r[metric]);
          return 'isTotal' in r ? <strong className="font-semibold">{v}</strong> : v;
        },
      })),
    ];
  }, [result, t, fmtMetric, rowLabel]);
}

export type TotalsRow = CustomReportTotals & { isTotal: true };

/** Rows plus a trailing totals row. */
export function tableRowsOf(result: CustomReportResult | undefined): (CustomReportRow | TotalsRow)[] {
  if (!result) return [];
  if (result.rows.length === 0) return [];
  return [...result.rows, { ...result.totals, isTotal: true }];
}


/** Resolves a logbook licence id to a short label. */
export function useLogbookLabel() {
  const { data: licenses } = useLicenses();
  return useCallback(
    (id: string) => {
      const lic = licenses?.find((l) => l.id === id);
      return lic ? `${lic.regulatoryAuthority} ${lic.licenseType}` : undefined;
    },
    [licenses]
  );
}
