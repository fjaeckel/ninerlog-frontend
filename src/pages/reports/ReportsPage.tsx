import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  PieChart, Pie, Cell,
  AreaChart, Area,
} from 'recharts';
import { useTrends } from '../../hooks/useReports';
import { exportTrendsToCSV, exportTrendsToPDF } from '../../lib/exportReports';

const COLORS = ['#3b82f6', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444', '#10b981', '#ec4899', '#6366f1'];

type TimeRange = 6 | 12 | 24;

export default function ReportsPage() {
  const [months, setMonths] = useState<TimeRange>(12);
  const { data: trends, isLoading } = useTrends(months);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-slate-400">Loading reports...</div>
      </div>
    );
  }

  const monthly = trends?.monthly ?? [];
  const byAircraft = trends?.byAircraftType ?? [];

  const totalHours = monthly.reduce((s, m) => s + m.totalHours, 0);
  const totalFlights = monthly.reduce((s, m) => s + m.totalFlights, 0);

  const handleExportCSV = () => {
    if (trends) exportTrendsToCSV(trends.monthly, trends.byAircraftType);
  };

  const handleExportPDF = () => {
    if (trends) exportTrendsToPDF(trends.monthly, trends.byAircraftType);
  };

  return (
    <div className="mx-auto max-w-[1280px] py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Flight trends and statistics
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {/* Time range selector */}
          <div className="flex rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
            {([6, 12, 24] as TimeRange[]).map((m) => (
              <button
                key={m}
                onClick={() => setMonths(m)}
                className={`px-3 py-1.5 text-sm font-medium transition-colors ${
                  months === m
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {m}mo
              </button>
            ))}
          </div>
          {/* Export buttons */}
          <button onClick={handleExportCSV} className="btn-secondary btn-sm text-xs" disabled={!trends}>
            Export CSV
          </button>
          <button onClick={handleExportPDF} className="btn-secondary btn-sm text-xs" disabled={!trends}>
            Export PDF
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <SummaryCard label="Flights" value={totalFlights.toString()} />
        <SummaryCard label="Total Hours" value={totalHours.toFixed(1)} />
        <SummaryCard label="Aircraft Types" value={byAircraft.length.toString()} />
        <SummaryCard label="Avg Hours/Month" value={monthly.length > 0 ? (totalHours / monthly.length).toFixed(1) : '0'} />
      </div>

      {/* Block Hours Over Time */}
      {monthly.length > 0 ? (
        <>
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Block Hours Over Time</h2>
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
                    formatter={(value: unknown) => [(Number(value)).toFixed(1) + 'h', '']}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="picHours" name="PIC" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  <Area type="monotone" dataKey="dualHours" name="Dual" stackId="1" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.6} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Flights Per Month (bar chart) */}
          <div className="card mb-6">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Flights Per Month</h2>
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
            No flight data available for the selected period.
          </p>
        </div>
      )}

      {/* Hours by Aircraft Type */}
      {byAircraft.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Hours by Aircraft Type</h2>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={byAircraft}
                    dataKey="totalHours"
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
                    formatter={(value: unknown) => [Number(value).toFixed(1) + 'h', 'Hours']}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-100 mb-4">Aircraft Type Breakdown</h2>
            <div className="space-y-3">
              {byAircraft.map((ac, idx) => {
                const maxHours = byAircraft[0]?.totalHours || 1;
                const pct = (ac.totalHours / maxHours) * 100;
                return (
                  <div key={ac.aircraftType}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-slate-700 dark:text-slate-300">{ac.aircraftType}</span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {ac.totalHours.toFixed(1)}h · {ac.totalFlights} flights
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
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card text-center">
      <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{value}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">{label}</div>
    </div>
  );
}
