import { describe, expect, it } from 'vitest';
import {
  definitionFromSearchParams,
  flightSearchParamsFor,
  isDefinitionValid,
  localizedGroupLabel,
  normalizeDefinition,
  type CustomReportDefinition,
} from '../../lib/customReports';

const base: CustomReportDefinition = {
  filter: {},
  window: { kind: 'all' },
  groupBy: 'month',
  metric: 'totalTime',
};

describe('definitionFromSearchParams', () => {
  it('maps the Flights page params onto a filter', () => {
    const def = definitionFromSearchParams(
      new URLSearchParams('q=night%3E0&aircraftReg=D-EABC&departureIcao=eddf&arrivalIcao=eddh&function=pic&logbook=lic-1&sortBy=date&page=2')
    );
    expect(def.filter).toEqual({
      q: 'night>0',
      aircraftReg: 'D-EABC',
      departureIcao: 'EDDF',
      arrivalIcao: 'EDDH',
      role: 'pic',
      logbookLicenseId: 'lic-1',
    });
  });

  it('uses a range window when dates are set', () => {
    const def = definitionFromSearchParams(new URLSearchParams('startDate=2026-01-01&endDate=2026-06-30'));
    expect(def.window).toEqual({ kind: 'range', startDate: '2026-01-01', endDate: '2026-06-30' });
  });

  it('defaults to the last 12 months without dates', () => {
    const def = definitionFromSearchParams(new URLSearchParams('function=solo'));
    expect(def.window).toEqual({ kind: 'lastMonths', months: 12 });
    expect(def.filter).toEqual({});
  });
});

describe('flightSearchParamsFor', () => {
  it('writes the filter back as Flights page params with the resolved window', () => {
    const params = flightSearchParamsFor(
      { ...base, filter: { q: 'x', role: 'dual', logbookLicenseId: 'lic-1', departureIcao: 'EDDF' } },
      { startDate: '2025-09-01', endDate: '2026-08-31' }
    );
    expect(Object.fromEntries(params)).toEqual({
      q: 'x',
      function: 'dual',
      logbook: 'lic-1',
      departureIcao: 'EDDF',
      startDate: '2025-09-01',
      endDate: '2026-08-31',
    });
  });

  it('falls back to the definition range when no result is resolved', () => {
    const params = flightSearchParamsFor({ ...base, window: { kind: 'range', startDate: '2026-02-01' } });
    expect(params.get('startDate')).toBe('2026-02-01');
    expect(params.has('endDate')).toBe(false);
  });
});

describe('normalizeDefinition', () => {
  it('drops empty filters, window fields of other kinds and the limit of time groupings', () => {
    const def = normalizeDefinition({
      filter: { q: '  ', aircraftReg: 'D-EABC' },
      window: { kind: 'yearToDate', months: 6, startDate: '2026-01-01' },
      groupBy: 'month',
      metric: 'flights',
      limit: 5,
    });
    expect(def).toEqual({ filter: { aircraftReg: 'D-EABC' }, window: { kind: 'yearToDate' }, groupBy: 'month', metric: 'flights' });
  });

  it('keeps the limit for ranked groupings', () => {
    expect(normalizeDefinition({ ...base, groupBy: 'route', limit: 5 }).limit).toBe(5);
  });
});

describe('isDefinitionValid', () => {
  it('bounds months, limit and range order', () => {
    expect(isDefinitionValid({ ...base, window: { kind: 'lastMonths', months: 12 } })).toBe(true);
    expect(isDefinitionValid({ ...base, window: { kind: 'lastMonths', months: 0 } })).toBe(false);
    expect(isDefinitionValid({ ...base, window: { kind: 'lastMonths' } })).toBe(false);
    expect(isDefinitionValid({ ...base, groupBy: 'registration', limit: 101 })).toBe(false);
    expect(
      isDefinitionValid({ ...base, window: { kind: 'range', startDate: '2026-05-01', endDate: '2026-01-01' } })
    ).toBe(false);
  });
});

describe('localizedGroupLabel', () => {
  it('localizes months and ISO weekdays', () => {
    expect(localizedGroupLabel('month', '2026-03', '2026-03', 'en')).toBe('Mar 2026');
    expect(localizedGroupLabel('month', '2026-03', '2026-03', 'de')).toMatch(/^März 2026$/);
    expect(localizedGroupLabel('dayOfWeek', '1', 'Monday', 'de')).toBe('Montag');
    expect(localizedGroupLabel('dayOfWeek', '7', 'Sunday', 'en', true)).toBe('Sun');
  });

  it('returns null for the empty key and passes other keys through', () => {
    expect(localizedGroupLabel('registration', '', '', 'en')).toBeNull();
    expect(localizedGroupLabel('registration', 'D-EABC', 'D-EABC', 'en')).toBe('D-EABC');
    expect(localizedGroupLabel('route', 'EDDF-EDDH', 'EDDF-EDDH', 'en')).toBe('EDDF → EDDH');
  });
});
