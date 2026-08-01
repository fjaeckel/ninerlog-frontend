import type { FlightAnalytics } from '../hooks/useAnalytics';
import { APP_NAME } from './config';
import { formatDuration } from './duration';
import { formatDate, type DateFormatPref } from './dateFormat';

const fmt = (m: number) => formatDuration(m, 'hm');
const nm = (v: number) => Math.round(v).toString();

/**
 * Quotes a CSV field and neutralises spreadsheet formula injection.
 *
 * Logbook data is user-supplied (aircraft registrations, airport names,
 * instructor and crew names, remarks), so a value starting with =, +, - or @
 * would be evaluated as a formula when the export is opened in Excel or
 * Sheets. Prefixing with a single quote keeps the text intact while forcing
 * it to be read as a literal.
 */
function csvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  let s = String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\n\r]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

function csvRow(values: (string | number | null | undefined)[]): string {
  return values.map(csvField).join(',');
}

function download(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function rangeLabel(a: FlightAnalytics): string {
  if (a.range.allTime) return 'All time';
  return `${a.range.from ?? ''} to ${a.range.to ?? ''}`;
}

/**
 * Exports every section of the report as one multi-block CSV. Each block is
 * a titled table separated by a blank line — the shape spreadsheet users
 * expect from a report export, and stable enough to diff between runs.
 */
export function exportAnalyticsToCSV(a: FlightAnalytics) {
  const lines: string[] = [];
  const block = (title: string, header: string[], rows: (string | number | null | undefined)[][]) => {
    lines.push(title);
    lines.push(csvRow(header));
    for (const r of rows) lines.push(csvRow(r));
    lines.push('');
  };

  lines.push(`${APP_NAME} flight report`);
  lines.push(csvRow(['Timeframe', rangeLabel(a)]));
  lines.push(csvRow(['Generated', new Date().toISOString().slice(0, 10)]));
  lines.push('');

  const t = a.totals;
  block(
    'Totals',
    ['Metric', 'Value'],
    [
      ['Flights', t.totalFlights],
      ['Block time', fmt(t.totalMinutes)],
      ['PIC', fmt(t.picMinutes)],
      ['SIC', fmt(t.sicMinutes)],
      ['Dual received', fmt(t.dualMinutes)],
      ['Dual given', fmt(t.dualGivenMinutes)],
      ['Solo', fmt(t.soloMinutes)],
      ['Multi-pilot', fmt(t.multiPilotMinutes)],
      ['Night', fmt(t.nightMinutes)],
      ['IFR', fmt(t.ifrMinutes)],
      ['Actual instrument', fmt(t.actualInstrumentMinutes)],
      ['Simulated instrument', fmt(t.simulatedInstrumentMinutes)],
      ['Cross country', fmt(t.crossCountryMinutes)],
      ['Simulator', fmt(t.simulatedFlightMinutes)],
      ['Ground training', fmt(t.groundTrainingMinutes)],
      ['Landings day', t.landingsDay],
      ['Landings night', t.landingsNight],
      ['Take-offs day', t.takeoffsDay],
      ['Take-offs night', t.takeoffsNight],
      ['Approaches', t.approaches],
      ['Holds', t.holds],
      ['Distance (NM)', nm(t.distanceNm)],
      ['Aircraft types', t.distinctTypes],
      ['Registrations', t.distinctRegistrations],
      ['Airports', t.distinctAirports],
      ['Countries', t.distinctCountries],
      ['First flight', t.firstFlightDate ?? ''],
      ['Last flight', t.lastFlightDate ?? ''],
    ]
  );

  block(
    'Monthly',
    [
      'Month',
      'Flights',
      'Block time',
      'PIC',
      'SIC',
      'Dual',
      'Night',
      'IFR',
      'Ldg day',
      'Ldg night',
      'Distance (NM)',
      'Career total',
    ],
    a.monthly.map((m) => [
      m.month,
      m.flights,
      fmt(m.totalMinutes),
      fmt(m.picMinutes),
      fmt(m.sicMinutes),
      fmt(m.dualMinutes),
      fmt(m.nightMinutes),
      fmt(m.ifrMinutes),
      m.landingsDay,
      m.landingsNight,
      nm(m.distanceNm),
      fmt(m.cumulativeMinutes),
    ])
  );

  block(
    'Yearly',
    ['Year', 'Flights', 'Block time', 'PIC', 'Dual', 'Night', 'IFR', 'Landings', 'Distance (NM)'],
    a.yearly.map((y) => [
      y.year,
      y.flights,
      fmt(y.totalMinutes),
      fmt(y.picMinutes),
      fmt(y.dualMinutes),
      fmt(y.nightMinutes),
      fmt(y.ifrMinutes),
      y.landings,
      nm(y.distanceNm),
    ])
  );

  const aircraftRows = (rows: FlightAnalytics['byAircraftType']) =>
    rows.map((r) => [
      r.label,
      r.subLabel ?? '',
      r.flights,
      fmt(r.totalMinutes),
      fmt(r.picMinutes),
      fmt(r.dualMinutes),
      fmt(r.nightMinutes),
      fmt(r.ifrMinutes),
      r.landings,
      nm(r.distanceNm),
      r.firstFlightDate ?? '',
      r.lastFlightDate ?? '',
    ]);
  const aircraftHeader = [
    'Label',
    'Detail',
    'Flights',
    'Block time',
    'PIC',
    'Dual',
    'Night',
    'IFR',
    'Landings',
    'Distance (NM)',
    'First flight',
    'Last flight',
  ];
  block('By aircraft type', aircraftHeader, aircraftRows(a.byAircraftType));
  block('By registration', aircraftHeader, aircraftRows(a.byRegistration));

  const groupHeader = ['Group', 'Flights', 'Block time', 'PIC', 'Dual', 'Landings'];
  const groupRows = (rows: FlightAnalytics['byClass']) =>
    rows.map((r) => [r.label, r.flights, fmt(r.totalMinutes), fmt(r.picMinutes), fmt(r.dualMinutes), r.landings]);
  block('By aircraft class', groupHeader, groupRows(a.byClass));
  block('By aircraft category', groupHeader, groupRows(a.byCategory));

  block(
    'Airports',
    ['ICAO', 'Name', 'Country', 'Departures', 'Arrivals', 'Flights'],
    a.byAirport.map((r) => [r.icao, r.name ?? '', r.country ?? '', r.departures, r.arrivals, r.flights])
  );
  block(
    'Countries',
    ['Country', 'Airports', 'Flights'],
    a.byCountry.map((r) => [r.country, r.airports, r.flights])
  );
  block(
    'Routes',
    ['From', 'To', 'Flights', 'Block time', 'Distance (NM)'],
    a.byRoute.map((r) => [r.departureIcao, r.arrivalIcao, r.flights, fmt(r.totalMinutes), nm(r.distanceNm)])
  );

  block(
    'Instructors',
    ['Name', 'Flights', 'Dual received', 'Last flight'],
    a.byInstructor.map((r) => [r.name, r.flights, fmt(r.totalMinutes), r.lastFlightDate ?? ''])
  );
  block(
    'Crew',
    ['Name', 'Role', 'Flights', 'Block time', 'Last flight'],
    a.byCrew.map((r) => [r.name, r.role ?? '', r.flights, fmt(r.totalMinutes), r.lastFlightDate ?? ''])
  );

  block(
    'Approach types',
    ['Type', 'Count'],
    a.approachTypes.map((r) => [r.type, r.count])
  );

  const bucketHeader = ['Bucket', 'Flights', 'Block time'];
  const bucketRows = (rows: FlightAnalytics['dayOfWeek']) => rows.map((r) => [r.label, r.flights, fmt(r.totalMinutes)]);
  block('Day of week', bucketHeader, bucketRows(a.dayOfWeek));
  block('Hour of day (UTC)', bucketHeader, bucketRows(a.hourOfDay));
  block('Month of year', bucketHeader, bucketRows(a.monthOfYear));
  block('Flight length', bucketHeader, bucketRows(a.durationBuckets));

  const r = a.records;
  block(
    'Records',
    ['Record', 'Value', 'Detail'],
    [
      ['Longest flight', r.longestFlight ? fmt(r.longestFlight.totalMinutes) : '', r.longestFlight?.date ?? ''],
      [
        'Longest distance',
        r.longestDistanceFlight ? `${nm(r.longestDistanceFlight.distanceNm)} NM` : '',
        r.longestDistanceFlight?.date ?? '',
      ],
      ['Busiest day', r.busiestDayFlights || '', r.busiestDay ?? ''],
      ['Busiest month', r.busiestMonthMinutes ? fmt(r.busiestMonthMinutes) : '', r.busiestMonth ?? ''],
      ['Busiest year', r.busiestYearMinutes ? fmt(r.busiestYearMinutes) : '', r.busiestYear ?? ''],
      ['Home base', r.homeBase ?? '', a.byAirport[0]?.name ?? ''],
      ['Farthest airport', r.farthestAirport?.icao ?? '', r.farthestAirportNm ? `${nm(r.farthestAirportNm)} NM` : ''],
      ['Current streak (months)', r.currentStreakMonths, ''],
      ['Longest streak (months)', r.longestStreakMonths, ''],
      ['Active months', r.activeMonths, ''],
      ['Days since last flight', r.daysSinceLastFlight ?? '', ''],
    ]
  );

  download(lines.join('\n'), `ninerlog-report-${new Date().toISOString().slice(0, 10)}.csv`, 'text/csv;charset=utf-8;');
}

/** Escapes text interpolated into the print-preview document. */
function esc(v: unknown): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Opens a print-ready summary in a new window. Deliberately a single
 * portrait page of the numbers that matter — the charts are on screen; the
 * printed artefact is the record.
 */
export function exportAnalyticsToPDF(a: FlightAnalytics, dateFormatPref: DateFormatPref = 'DD.MM.YYYY') {
  const t = a.totals;
  const r = a.records;

  const table = (title: string, header: string[], rows: (string | number)[][]) => {
    if (rows.length === 0) return '';
    return `
<h2>${esc(title)}</h2>
<table>
  <thead><tr>${header.map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead>
  <tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody>
</table>`;
  };

  const html = `<!DOCTYPE html>
<html><head>
<meta charset="utf-8">
<title>${esc(APP_NAME)} Report</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 900px; margin: 0 auto; padding: 2rem; color: #0f172a; }
  h1 { font-size: 1.5rem; border-bottom: 2px solid #2a78d6; padding-bottom: 0.5rem; margin-bottom: 0.25rem; }
  h2 { font-size: 1rem; margin-top: 1.75rem; margin-bottom: 0.5rem; color: #475569; text-transform: uppercase; letter-spacing: 0.04em; }
  .meta { color: #64748b; font-size: 0.8rem; margin-bottom: 1.5rem; }
  table { width: 100%; border-collapse: collapse; margin: 0.5rem 0 1rem; font-size: 0.8rem; }
  th, td { padding: 5px 8px; text-align: right; border-bottom: 1px solid #e2e8f0; font-variant-numeric: tabular-nums; }
  th { background: #f8fafc; font-weight: 600; }
  th:first-child, td:first-child { text-align: left; font-variant-numeric: normal; }
  .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.75rem; margin: 1rem 0 0.5rem; }
  .stat { background: #f1f5f9; border-radius: 8px; padding: 0.75rem; text-align: center; }
  .stat-value { font-size: 1.25rem; font-weight: 700; color: #1c5cab; }
  .stat-label { font-size: 0.7rem; color: #64748b; margin-top: 0.2rem; }
  @media print { body { padding: 0; } h2 { page-break-after: avoid; } table { page-break-inside: auto; } tr { page-break-inside: avoid; } }
</style>
</head><body>
<h1>${esc(APP_NAME)} flight report</h1>
<p class="meta">${esc(rangeLabel(a))} &middot; generated ${esc(formatDate(new Date(), dateFormatPref))}</p>

<div class="summary">
  <div class="stat"><div class="stat-value">${esc(fmt(t.totalMinutes))}</div><div class="stat-label">Block time</div></div>
  <div class="stat"><div class="stat-value">${esc(t.totalFlights)}</div><div class="stat-label">Flights</div></div>
  <div class="stat"><div class="stat-value">${esc(t.landingsDay + t.landingsNight)}</div><div class="stat-label">Landings</div></div>
  <div class="stat"><div class="stat-value">${esc(nm(t.distanceNm))} NM</div><div class="stat-label">Distance</div></div>
</div>

${table(
  'Experience',
  ['Category', 'Time'],
  (
    [
      ['PIC', t.picMinutes],
      ['SIC', t.sicMinutes],
      ['Dual received', t.dualMinutes],
      ['Dual given', t.dualGivenMinutes],
      ['Solo', t.soloMinutes],
      ['Multi-pilot', t.multiPilotMinutes],
      ['Night', t.nightMinutes],
      ['IFR', t.ifrMinutes],
      ['Actual instrument', t.actualInstrumentMinutes],
      ['Simulated instrument', t.simulatedInstrumentMinutes],
      ['Cross country', t.crossCountryMinutes],
      ['Simulator', t.simulatedFlightMinutes],
    ] as [string, number][]
  )
    .filter(([, v]) => v > 0)
    .map(([label, v]) => [label, fmt(v)])
)}

${table(
  'By year',
  ['Year', 'Flights', 'Block time', 'PIC', 'Dual', 'Night', 'IFR', 'Landings', 'NM'],
  a.yearly.map((y) => [
    y.year,
    y.flights,
    fmt(y.totalMinutes),
    fmt(y.picMinutes),
    fmt(y.dualMinutes),
    fmt(y.nightMinutes),
    fmt(y.ifrMinutes),
    y.landings,
    nm(y.distanceNm),
  ])
)}

${table(
  'By aircraft type',
  ['Type', 'Flights', 'Block time', 'PIC', 'Dual', 'Landings'],
  a.byAircraftType.map((x) => [
    x.label,
    x.flights,
    fmt(x.totalMinutes),
    fmt(x.picMinutes),
    fmt(x.dualMinutes),
    x.landings,
  ])
)}

${table(
  'By aircraft class',
  ['Class', 'Flights', 'Block time', 'PIC', 'Dual', 'Landings'],
  a.byClass.map((x) => [
    x.label.replace(/_/g, ' '),
    x.flights,
    fmt(x.totalMinutes),
    fmt(x.picMinutes),
    fmt(x.dualMinutes),
    x.landings,
  ])
)}

${table(
  'Most visited airports',
  ['ICAO', 'Name', 'Departures', 'Arrivals', 'Flights'],
  a.byAirport.slice(0, 15).map((x) => [x.icao, x.name ?? '', x.departures, x.arrivals, x.flights])
)}

${table(
  'Approaches',
  ['Type', 'Count'],
  a.approachTypes.map((x) => [x.type, x.count])
)}

${table(
  'Records',
  ['Record', 'Value', 'Detail'],
  [
    ['Longest flight', r.longestFlight ? fmt(r.longestFlight.totalMinutes) : '—', r.longestFlight?.date ?? ''],
    [
      'Longest distance',
      r.longestDistanceFlight ? `${nm(r.longestDistanceFlight.distanceNm)} NM` : '—',
      r.longestDistanceFlight?.date ?? '',
    ],
    ['Busiest day', r.busiestDayFlights || '—', r.busiestDay ?? ''],
    ['Busiest month', r.busiestMonthMinutes ? fmt(r.busiestMonthMinutes) : '—', r.busiestMonth ?? ''],
    ['Home base', r.homeBase ?? '—', a.byAirport[0]?.name ?? ''],
    ['Farthest airport', r.farthestAirport?.icao ?? '—', r.farthestAirportNm ? `${nm(r.farthestAirportNm)} NM` : ''],
    ['Current streak', `${r.currentStreakMonths} months`, `longest ${r.longestStreakMonths}`],
  ]
)}

<script>window.onload = () => { window.print(); }</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}
