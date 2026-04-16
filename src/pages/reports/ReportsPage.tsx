import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import { useTrends, useStatsByClass } from '../../hooks/useReports';
import { exportTrendsToCSV, exportTrendsToPDF } from '../../lib/exportReports';
import { StatCard } from '../../components/ui/StatCard';
import { SkeletonList } from '../../components/ui/Skeleton';
import { ErrorState } from '../../components/ui/ErrorState';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1'];

type TimeRange = 0 | 6 | 12 | 24;

export default function ReportsPage() {
  const { t } = useTranslation('reports');
  const [months, setMonths] = useState<TimeRange>(12);
  const { data: trends, isLoading, error } = useTrends(months);
  const { data: statsByClass } = useStatsByClass();
  const { fmtDuration, dateFormatPref } = useFormatPrefs();
  const fmt = fmtDuration;

  if (isLoading) {
    return (
      <div className="mx-auto max-w-[1280px] py-6">
        <SkeletonList rows={3} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="mx-auto max-w-[1280px] py-6">
        <ErrorState
          title={t('failedToLoad', 'Failed to load reports')}
          message={t('failedToLoadMessage', 'An error occurred while loading flight trends. Please try again.')}
        />
      </div>
    );
  }

  const monthly = trends?.monthly ?? [];
  const byAircraft = trends?.byAircraftType ?? [];

  const totalMinutes = monthly.reduce((s, m) => s + m.totalMinutes, 0);
  const totalFlights = monthly.reduce((s, m) => s + m.totalFlights, 0);

  const handleExportCSV = () => {
    if (trends) exportTrendsToCSV(trends.monthly, trends.byAircraftType);
  };

  const handleExportPDF = () => {
    if (trends) exportTrendsToPDF(trends.monthly, trends.byAircraftType, dateFormatPref);
  };

  return (
    <div className="mx-auto max-w-[1280px] py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {t('flightReports', 'Flight trends and statistics')}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Time range selector */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {([6, 12, 24, 0] as TimeRange[]).map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  months === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {m === 0 ? t('allTime') : `${m}mo`}
              </button>
            ))}
          </div>
          {/* Export buttons */}
          <button onClick={handleExportCSV} className="btn-secondary btn-sm text-xs" disabled={!trends}>
            {t('exportCsv')}
          </button>
          <button onClick={handleExportPDF} className="btn-secondary btn-sm text-xs" disabled={!trends}>
            {t('exportPdf')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <StatCard label="Flights" value={totalFlights.toString()} />
        <StatCard label="Total Time" value={fmt(totalMinutes)} />
        <StatCard label="Aircraft Types" value={byAircraft.length.toString()} />
        <StatCard label="Avg Time/Month" value={monthly.length > 0 ? fmt(Math.round(totalMinutes / monthly.length)) : '0h 0m'} />
      </div>

      {/* Block Hours Over Time */}
      {monthly.length > 0 ? (
        <>
          <div className="card mb-6">
            <h2 className="section-title mb-4">{t('blockHoursOverTime')}</h2>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    tickFormatter={(v) => {
                      const [y, m] = v.split('-');
                      return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m) - 1]} ${y.slice(2)}`;
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
                    labelFormatter={(v) => {
                      const [y, m] = String(v).split('-');
                      return `${['January','February','March','April','May','June','July','August','September','October','November','December'][parseInt(m) - 1]} ${y}`;
                    }}
                    formatter={(value: unknown) => [fmt(Number(value)), '']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="picMinutes" name="PIC" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="dualMinutes" name="Dual" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Flights Per Month (bar chart) */}
          <div className="card mb-6">
            <h2 className="section-title mb-4">{t('flightsPerMonth')}</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12, fill: '#94a3b8' }}
                    tickFormatter={(v) => {
                      const [, m] = v.split('-');
                      return ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][parseInt(m) - 1];
                    }}
                  />
                  <YAxis tick={{ fontSize: 12, fill: '#94a3b8' }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
                  />
                  <Bar dataKey="totalFlights" name="Flights" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : (
        <div className="card text-center py-12 mb-6">
          <p className="text-slate-500 dark:text-slate-400">
            {t('noData')}
          </p>
        </div>
      )}

      {/* Hours by Aircraft Type */}
      {byAircraft.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="section-title mb-4">{t('hoursByAircraftType')}</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byAircraft}
                    dataKey="totalMinutes"
                    nameKey="aircraftType"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {byAircraft.map((_, idx) => (
                      <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#f8fafc', fontSize: '13px' }}
                    formatter={(value: unknown) => [fmt(Number(value)), 'Time']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h2 className="section-title mb-4">{t('aircraftTypeBreakdown', 'Aircraft Type Breakdown')}</h2>
            <div className="space-y-3">
              {byAircraft.map((ac, idx) => {
                const maxMinutes = byAircraft[0]?.totalMinutes || 1;
                const pct = (ac.totalMinutes / maxMinutes) * 100;
                return (
                  <div key={ac.aircraftType}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{ac.aircraftType}</span>
                      <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums">
                        {fmt(ac.totalMinutes)} · {ac.totalFlights} flights
                      </span>
                    </div>
                    <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: COLORS[idx % COLORS.length] }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* PIC & Dual Time by Category */}
      {(() => {
        const classRows = statsByClass?.byClass?.filter(c => c.class !== 'Unclassified' && (c.picMinutes > 0 || c.dualMinutes > 0)) ?? [];
        const categoryRows = statsByClass?.byCategory?.filter(c => c.picMinutes > 0 || c.dualMinutes > 0) ?? [];
        const allRows = [
          ...classRows.map(c => ({ label: c.class.replace(/_/g, ' '), picMinutes: c.picMinutes, dualMinutes: c.dualMinutes, flights: c.flights })),
          ...categoryRows.map(c => ({ label: c.category, picMinutes: c.picMinutes, dualMinutes: c.dualMinutes, flights: c.flights })),
        ];
        if (allRows.length === 0) return null;
        return (
          <div className="card mt-6">
            <h2 className="section-title mb-4">{t('timeByCategory', 'Time by Aircraft Category')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700">
                    <th className="text-left py-2 pr-4 font-medium text-slate-500 dark:text-slate-400">{t('category', 'Category')}</th>
                    <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400">PIC</th>
                    <th className="text-right py-2 px-4 font-medium text-slate-500 dark:text-slate-400">Dual</th>
                    <th className="text-right py-2 pl-4 font-medium text-slate-500 dark:text-slate-400">{t('flights', 'Flights')}</th>
                  </tr>
                </thead>
                <tbody>
                  {allRows.map(row => (
                    <tr key={row.label} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                      <td className="py-2 pr-4 font-medium text-slate-700 dark:text-slate-300">{row.label}</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">{fmt(row.picMinutes)}</td>
                      <td className="py-2 px-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">{fmt(row.dualMinutes)}</td>
                      <td className="py-2 pl-4 text-right font-mono tabular-nums text-slate-600 dark:text-slate-400">{row.flights}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
