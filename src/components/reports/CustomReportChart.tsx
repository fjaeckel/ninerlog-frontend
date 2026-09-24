import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { isDurationMetric, isRankedGrouping, type CustomReportResult } from '../../lib/customReports';
import { useChartTheme } from './chartTheme';
import { ValueBarChart } from './charts';
import { RankedBars } from './primitives';
import { useCustomReportFormat } from './customReportFormat';

/**
 * The chart for a result: vertical bars for time groupings, ranked
 * horizontal bars otherwise.
 */
export function CustomReportChart({ result, height }: { result: CustomReportResult; height?: string }) {
  const { t } = useTranslation('reports');
  const theme = useChartTheme();
  const { fmtMetric, rowLabel } = useCustomReportFormat();
  const metric = result.metric;

  const points = useMemo(
    () =>
      result.rows.map((row) => ({
        key: row.key,
        tick: rowLabel(result, row, true),
        label: rowLabel(result, row),
        value: row.value,
      })),
    [result, rowLabel]
  );

  if (isRankedGrouping(result.groupBy)) {
    return (
      <RankedBars
        color={theme.accent}
        emptyLabel={t('noData')}
        rows={points.map((p) => ({
          key: p.key || '__none',
          label: p.label,
          value: p.value,
          formatted: fmtMetric(metric, p.value),
        }))}
      />
    );
  }

  return (
    <ValueBarChart
      data={points}
      theme={theme}
      durations={isDurationMetric(metric)}
      fmtValue={(v) => fmtMetric(metric, v)}
      seriesName={t(`custom.metric.${metric}`)}
      emptyLabel={t('noData')}
      height={height}
    />
  );
}

/** Note for groups cut by the limit. */
export function OtherGroupsNote({ count }: { count: number }) {
  const { t } = useTranslation('reports');
  if (count <= 0) return null;
  return (
    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3">{t('custom.otherGroups', { count })}</p>
  );
}
