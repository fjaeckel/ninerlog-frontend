import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AnalyticsBucketRow, AnalyticsMonthPoint } from '../../hooks/useAnalytics';
import { tooltipStyles, type ChartTheme } from './chartTheme';
import { NoData } from './primitives';

/** Mark specs shared by every chart on the page. */
const BAR_MAX = 24;
const BAR_RADIUS: [number, number, number, number] = [4, 4, 0, 0];
const LINE_WIDTH = 2;
const AREA_OPACITY = 0.1;

/** Axis ticks show whole hours; the tooltip carries the exact duration. */
const toHours = (minutes: number) => String(Math.round(minutes / 60));

function monthTick(month: string) {
  const [y, m] = month.split('-');
  const label = new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleString(undefined, { month: 'short' });
  return `${label} ${y.slice(2)}`;
}

function monthLabel(month: string) {
  const [y, m] = String(month).split('-');
  const label = new Date(Date.UTC(Number(y), Number(m) - 1, 1)).toLocaleString(undefined, {
    month: 'long',
    year: 'numeric',
  });
  return label;
}

/**
 * Thins x-axis ticks so labels never collide. Recharts' own `interval`
 * heuristic overlaps once the series passes roughly two years of months.
 */
function tickInterval(count: number, target = 12) {
  return Math.max(0, Math.ceil(count / target) - 1);
}

interface ChartProps {
  theme: ChartTheme;
  fmtDuration: (minutes: number) => string;
}

/**
 * Career hours — a single series, so no legend: the card title names it.
 * Area fill is a 10% wash under a 2px line.
 */
export function CumulativeHoursChart({
  data,
  theme,
  fmtDuration,
  emptyLabel,
}: ChartProps & { data: AnalyticsMonthPoint[]; emptyLabel: string }) {
  const { t } = useTranslation('reports');
  if (data.length === 0) return <NoData label={emptyLabel} />;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <defs>
            <linearGradient id="cumulativeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.accent} stopOpacity={AREA_OPACITY * 2.5} />
              <stop offset="100%" stopColor={theme.accent} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={monthTick}
            interval={tickInterval(data.length)}
            tick={{ fontSize: 11, fill: theme.tick }}
            tickLine={false}
            axisLine={{ stroke: theme.axis }}
            minTickGap={8}
          />
          <YAxis
            tickFormatter={toHours}
            tick={{ fontSize: 11, fill: theme.tick }}
            tickLine={false}
            axisLine={false}
            width={44}
            unit="h"
          />
          <Tooltip
            {...tooltipStyles(theme)}
            labelFormatter={(v) => monthLabel(String(v))}
            formatter={(value: unknown) => [fmtDuration(Number(value)), t('chart.careerTotal')]}
          />
          <Area
            type="monotone"
            dataKey="cumulativeMinutes"
            stroke={theme.accent}
            strokeWidth={LINE_WIDTH}
            fill="url(#cumulativeFill)"
            activeDot={{ r: 4, strokeWidth: 2, stroke: theme.surface }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Block hours per month. One series, one hue — length is the encoding. */
export function MonthlyHoursChart({
  data,
  theme,
  fmtDuration,
  emptyLabel,
}: ChartProps & { data: AnalyticsMonthPoint[]; emptyLabel: string }) {
  const { t } = useTranslation('reports');
  if (data.length === 0) return <NoData label={emptyLabel} />;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="month"
            tickFormatter={monthTick}
            interval={tickInterval(data.length)}
            tick={{ fontSize: 11, fill: theme.tick }}
            tickLine={false}
            axisLine={{ stroke: theme.axis }}
            minTickGap={8}
          />
          <YAxis
            tickFormatter={toHours}
            tick={{ fontSize: 11, fill: theme.tick }}
            tickLine={false}
            axisLine={false}
            width={44}
            unit="h"
          />
          <Tooltip
            {...tooltipStyles(theme)}
            labelFormatter={(v) => monthLabel(String(v))}
            formatter={(value: unknown, _n, item) => [
              `${fmtDuration(Number(value))} · ${(item?.payload as AnalyticsMonthPoint)?.flights ?? 0} ${t('flights').toLowerCase()}`,
              t('chart.blockTime'),
            ]}
          />
          <Bar dataKey="totalMinutes" fill={theme.accent} radius={BAR_RADIUS} maxBarSize={BAR_MAX} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Role split per year. PIC / SIC / Dual received is a true part-to-whole
 * under EASA — every flight is logged as exactly one of the three — so a
 * stack is honest here. The 2px stroke in the surface colour is the gap that
 * separates segments; it is not a border.
 */
export function RoleCompositionChart({
  data,
  theme,
  fmtDuration,
  emptyLabel,
}: ChartProps & {
  data: { year: string; picMinutes: number; sicMinutes: number; dualMinutes: number }[];
  emptyLabel: string;
}) {
  const { t } = useTranslation('reports');
  if (data.length === 0) return <NoData label={emptyLabel} />;

  const series = [
    { key: 'picMinutes', name: t('role.pic'), color: theme.series[0] },
    { key: 'dualMinutes', name: t('role.dual'), color: theme.series[1] },
    { key: 'sicMinutes', name: t('role.sic'), color: theme.series[2] },
  ];

  return (
    <div className="h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 4, bottom: 4 }}>
          <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="year"
            tick={{ fontSize: 11, fill: theme.tick }}
            tickLine={false}
            axisLine={{ stroke: theme.axis }}
          />
          <YAxis
            tickFormatter={toHours}
            tick={{ fontSize: 11, fill: theme.tick }}
            tickLine={false}
            axisLine={false}
            width={44}
            unit="h"
          />
          <Tooltip
            {...tooltipStyles(theme)}
            formatter={(value: unknown, name: unknown) => [fmtDuration(Number(value)), String(name)]}
          />
          <Legend
            iconType="circle"
            iconSize={8}
            wrapperStyle={{ fontSize: 12, color: theme.tick, paddingTop: 8 }}
          />
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.name}
              stackId="role"
              fill={s.color}
              stroke={theme.surface}
              strokeWidth={2}
              maxBarSize={44}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/**
 * Fixed-axis histogram (day of week, hour of day, month of year, flight
 * length). One hue; the busiest bucket is emphasised so the eye lands on the
 * point of the chart without adding a second colour meaning.
 */
export function PatternChart({
  data,
  theme,
  labelFor,
  valueKey = 'flights',
  height = 'h-44',
  fmtValue,
  emptyLabel,
}: {
  data: AnalyticsBucketRow[];
  theme: ChartTheme;
  labelFor: (row: AnalyticsBucketRow) => string;
  valueKey?: 'flights' | 'totalMinutes';
  height?: string;
  fmtValue: (value: number) => string;
  emptyLabel: string;
}) {
  const { t } = useTranslation('reports');
  const rows = useMemo(() => data.map((d) => ({ ...d, tick: labelFor(d) })), [data, labelFor]);
  const peak = useMemo(() => Math.max(...data.map((d) => d[valueKey]), 0), [data, valueKey]);

  if (data.length === 0 || peak === 0) return <NoData label={emptyLabel} />;

  return (
    <div className={height}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid stroke={theme.grid} strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="tick"
            tick={{ fontSize: 11, fill: theme.tick }}
            tickLine={false}
            axisLine={{ stroke: theme.axis }}
            interval={0}
            minTickGap={0}
          />
          <YAxis
            tick={{ fontSize: 11, fill: theme.tick }}
            tickLine={false}
            axisLine={false}
            width={30}
            allowDecimals={false}
          />
          <Tooltip
            {...tooltipStyles(theme)}
            formatter={(value: unknown) => [
              fmtValue(Number(value)),
              valueKey === 'flights' ? t('flights') : t('chart.blockTime'),
            ]}
          />
          {/* Emphasis, not a second colour: every bar is the accent hue and
              the busiest bucket is the only one at full strength, so the eye
              lands on the peak while the whole distribution stays legible. */}
          <Bar dataKey={valueKey} radius={BAR_RADIUS} maxBarSize={BAR_MAX} fill={theme.accent}>
            {rows.map((row) => (
              <Cell key={row.key} fillOpacity={row[valueKey] === peak ? 1 : 0.45} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
