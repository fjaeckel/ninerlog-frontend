import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { exportAnalyticsToCSV } from '../../lib/exportReports';
import type { FlightAnalytics } from '../../hooks/useAnalytics';

/** Captures the text handed to the Blob the download link points at. */
let captured = '';

beforeEach(() => {
  captured = '';
  vi.stubGlobal(
    'Blob',
    class {
      constructor(parts: string[]) {
        captured = parts.join('');
      }
    }
  );
  vi.stubGlobal('URL', { createObjectURL: () => 'blob:test', revokeObjectURL: () => {} });
  vi.spyOn(document, 'createElement').mockReturnValue({
    href: '',
    download: '',
    click: () => {},
  } as unknown as HTMLAnchorElement);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const empty: FlightAnalytics = {
  range: { months: 0, allTime: true, from: null, to: '2026-07-28' },
  totals: {
    totalFlights: 1, totalMinutes: 60, picMinutes: 60, sicMinutes: 0, dualMinutes: 0,
    dualGivenMinutes: 0, soloMinutes: 0, nightMinutes: 0, ifrMinutes: 0,
    actualInstrumentMinutes: 0, simulatedInstrumentMinutes: 0, crossCountryMinutes: 0,
    multiPilotMinutes: 0, simulatedFlightMinutes: 0, groundTrainingMinutes: 0,
    landingsDay: 1, landingsNight: 0, takeoffsDay: 1, takeoffsNight: 0,
    approaches: 0, holds: 0, distanceNm: 0, distinctRegistrations: 1, distinctTypes: 1,
    distinctAirports: 0, distinctCountries: 0, firstFlightDate: null, lastFlightDate: null,
  },
  monthly: [], yearly: [], byAircraftType: [], byRegistration: [], byClass: [],
  byCategory: [], byAirport: [], byCountry: [], byRoute: [], byInstructor: [],
  byCrew: [], approachTypes: [], dayOfWeek: [], hourOfDay: [], monthOfYear: [],
  durationBuckets: [],
  // Empty logbook modelled with keys left undefined, matching the API's
  // omitted absent fields.
  records: {
    longestFlight: undefined, longestDistanceFlight: undefined, busiestDay: null,
    busiestDayFlights: 0, busiestMonth: null, busiestMonthMinutes: 0,
    busiestYear: null, busiestYearMinutes: 0, longestStreakMonths: 0,
    currentStreakMonths: 0, activeMonths: 0, daysSinceLastFlight: null,
    farthestAirport: undefined, farthestAirportNm: 0, homeBase: null,
  },
};

describe('exportAnalyticsToCSV', () => {
  it('emits a block per report section', () => {
    exportAnalyticsToCSV(empty);
    for (const section of ['Totals', 'Monthly', 'Yearly', 'By aircraft type', 'Airports', 'Records']) {
      expect(captured).toContain(section);
    }
  });

  it('records the carried-forward hours behind the totals', () => {
    exportAnalyticsToCSV({
      ...empty,
      baseline: {
        baselineDate: '2020-06-30',
        totalFlights: 400,
        totalMinutes: 30000,
        picMinutes: 24000,
        dualMinutes: 0,
        nightMinutes: 0,
        ifrMinutes: 0,
        landingsDay: 600,
        landingsNight: 0,
      },
    });
    expect(captured).toContain('Initial hours,500h 0m carried forward as of 2020-06-30');
  });

  it('omits the initial-hours line when no snapshot applies', () => {
    exportAnalyticsToCSV(empty);
    expect(captured).not.toContain('Initial hours');
  });

  it('quotes fields containing commas, quotes or newlines', () => {
    exportAnalyticsToCSV({
      ...empty,
      byAirport: [
        {
          icao: 'LIRA',
          name: 'Ciampino, G. B. Pastine',
          country: 'IT',
          latitude: 0,
          longitude: 0,
          departures: 1,
          arrivals: 1,
          flights: 1,
        },
      ],
    });
    expect(captured).toContain('"Ciampino, G. B. Pastine"');
  });

  it('neutralises spreadsheet formula injection in user-supplied text', () => {
    // A leading =, +, - or @ is neutralised.
    exportAnalyticsToCSV({
      ...empty,
      byCrew: [
        { name: '=1+1', role: 'SIC', flights: 1, totalMinutes: 60, lastFlightDate: null },
        { name: '@SUM(A1:A9)', role: 'PIC', flights: 1, totalMinutes: 60, lastFlightDate: null },
        { name: '-2+3', role: null, flights: 1, totalMinutes: 60, lastFlightDate: null },
      ],
    });
    expect(captured).toContain("'=1+1");
    expect(captured).toContain("'@SUM(A1:A9)");
    expect(captured).toContain("'-2+3");
    // The raw formula must never appear at the start of a field.
    expect(captured).not.toMatch(/(^|,)=1\+1/m);
  });

  it('keeps ordinary values untouched', () => {
    exportAnalyticsToCSV({
      ...empty,
      byRegistration: [
        {
          label: 'D-EAAA',
          subLabel: 'Cessna 172S',
          flights: 6,
          totalMinutes: 600,
          picMinutes: 600,
          dualMinutes: 0,
          nightMinutes: 0,
          ifrMinutes: 0,
          landings: 8,
          distanceNm: 120,
          firstFlightDate: '2025-01-01',
          lastFlightDate: '2026-07-20',
        },
      ],
    });
    expect(captured).toContain('D-EAAA,Cessna 172S,6,10h 0m');
  });
});
