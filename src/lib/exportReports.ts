import type { MonthlyTrend, AircraftBreakdown } from '../hooks/useReports';
import { APP_NAME } from './config';

export function exportTrendsToCSV(monthly: MonthlyTrend[], byAircraftType: AircraftBreakdown[]) {
  const lines: string[] = [];

  // Monthly trends section
  lines.push('Monthly Flight Trends');
  lines.push('Month,Flights,Total Hours,PIC Hours,Dual Hours,Night Hours,IFR Hours,Day Landings,Night Landings');
  for (const m of monthly) {
    lines.push(
      [m.month, m.totalFlights, m.totalHours.toFixed(1), m.picHours.toFixed(1),
       m.dualHours.toFixed(1), m.nightHours.toFixed(1), m.ifrHours.toFixed(1),
       m.landingsDay, m.landingsNight].join(',')
    );
  }

  lines.push('');
  lines.push('Hours by Aircraft Type');
  lines.push('Aircraft Type,Flights,Total Hours');
  for (const a of byAircraftType) {
    lines.push([a.aircraftType, a.totalFlights, a.totalHours.toFixed(1)].join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `pilotlog-report-${new Date().toISOString().split('T')[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

export function exportTrendsToPDF(monthly: MonthlyTrend[], byAircraftType: AircraftBreakdown[]) {
  // Simple printable HTML report opened in a new window
  const totalHours = monthly.reduce((s, m) => s + m.totalHours, 0);
  const totalFlights = monthly.reduce((s, m) => s + m.totalFlights, 0);
  const totalPIC = monthly.reduce((s, m) => s + m.picHours, 0);
  const totalDual = monthly.reduce((s, m) => s + m.dualHours, 0);

  const html = `
<!DOCTYPE html>
<html><head>
<title>${APP_NAME} Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 2rem; color: #1e293b; }
  h1 { font-size: 1.5rem; border-bottom: 2px solid #3b82f6; padding-bottom: 0.5rem; }
  h2 { font-size: 1.1rem; margin-top: 2rem; color: #475569; }
  table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.85rem; }
  th, td { padding: 6px 10px; text-align: right; border-bottom: 1px solid #e2e8f0; }
  th { background: #f8fafc; font-weight: 600; text-align: right; }
  th:first-child, td:first-child { text-align: left; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 1rem; margin: 1rem 0; }
  .stat { background: #f1f5f9; border-radius: 8px; padding: 1rem; text-align: center; }
  .stat-value { font-size: 1.5rem; font-weight: 700; color: #1e40af; }
  .stat-label { font-size: 0.75rem; color: #64748b; margin-top: 0.25rem; }
  @media print { body { padding: 0; } }
</style>
</head><body>
<h1>✈ ${APP_NAME} Flight Report</h1>
<p style="color:#64748b">Generated ${new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</p>

<div class="summary">
  <div class="stat"><div class="stat-value">${totalFlights}</div><div class="stat-label">Total Flights</div></div>
  <div class="stat"><div class="stat-value">${totalHours.toFixed(1)}</div><div class="stat-label">Total Hours</div></div>
  <div class="stat"><div class="stat-value">${totalPIC.toFixed(1)}</div><div class="stat-label">PIC Hours</div></div>
  <div class="stat"><div class="stat-value">${totalDual.toFixed(1)}</div><div class="stat-label">Dual Hours</div></div>
</div>

<h2>Monthly Trends</h2>
<table>
  <thead><tr><th>Month</th><th>Flights</th><th>Total</th><th>PIC</th><th>Dual</th><th>Night</th><th>IFR</th><th>Ldg Day</th><th>Ldg Night</th></tr></thead>
  <tbody>
    ${monthly.map(m => `<tr><td>${m.month}</td><td>${m.totalFlights}</td><td>${m.totalHours.toFixed(1)}</td><td>${m.picHours.toFixed(1)}</td><td>${m.dualHours.toFixed(1)}</td><td>${m.nightHours.toFixed(1)}</td><td>${m.ifrHours.toFixed(1)}</td><td>${m.landingsDay}</td><td>${m.landingsNight}</td></tr>`).join('')}
  </tbody>
</table>

<h2>Hours by Aircraft Type</h2>
<table>
  <thead><tr><th>Aircraft Type</th><th>Flights</th><th>Hours</th></tr></thead>
  <tbody>
    ${byAircraftType.map(a => `<tr><td>${a.aircraftType}</td><td>${a.totalFlights}</td><td>${a.totalHours.toFixed(1)}</td></tr>`).join('')}
  </tbody>
</table>

<script>window.onload = () => { window.print(); }</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
