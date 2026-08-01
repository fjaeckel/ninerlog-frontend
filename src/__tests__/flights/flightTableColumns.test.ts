import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CUSTOM_COLUMNS,
  FLIGHT_COLUMNS,
  selectFlightColumns,
  type FlightColumnKey,
} from '../../components/flights/flightTableColumns';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

const flight = (overrides: Partial<Flight> = {}): Flight =>
  ({
    id: 'flight-1',
    userId: 'user-1',
    date: '2026-01-15',
    aircraftReg: 'D-EFGH',
    aircraftType: 'C172',
    departureIcao: 'EDDF',
    arrivalIcao: 'EDDH',
    offBlockTime: '14:15:00',
    onBlockTime: '16:10:00',
    totalTime: 90,
    isPic: true,
    isDual: false,
    picTime: 0,
    dualTime: 0,
    nightTime: 0,
    ifrTime: 0,
    soloTime: 0,
    crossCountryTime: 0,
    sicTime: 0,
    dualGivenTime: 0,
    multiPilotTime: 0,
    simulatedFlightTime: 0,
    groundTrainingTime: 0,
    landingsDay: 1,
    landingsNight: 0,
    allLandings: 1,
    takeoffsDay: 1,
    takeoffsNight: 0,
    remarks: '',
    createdAt: '2026-01-15T00:00:00Z',
    updatedAt: '2026-01-15T00:00:00Z',
    ...overrides,
  }) as Flight;

const auto = { mode: 'auto' as const, columns: [] };
const custom = (columns: FlightColumnKey[]) => ({ mode: 'custom' as const, columns });

const keys = (layout: ReturnType<typeof selectFlightColumns>) => layout.time.map((c) => c.key);

describe('selectFlightColumns — automatic mode', () => {
  it('shows only the time columns the flights on the page actually use', () => {
    const layout = selectFlightColumns([flight({ picTime: 90, nightTime: 30 })], auto);

    expect(keys(layout)).toEqual(['picTime', 'nightTime']);
  });

  it('leaves out a time column no flight uses', () => {
    const layout = selectFlightColumns([flight({ picTime: 90 })], auto);

    expect(keys(layout)).not.toContain('ifrTime');
  });

  it('caps the time columns so remarks still has a tier left', () => {
    const busy = flight({
      picTime: 90,
      nightTime: 30,
      dualTime: 20,
      ifrTime: 10,
      crossCountryTime: 60,
      soloTime: 15,
      remarks: 'Cross-country',
    });

    const layout = selectFlightColumns([busy], auto);

    expect(layout.time).toHaveLength(4);
    expect(layout.remarksRevealClass).not.toBeNull();
  });

  it('drops remarks when no flight has any', () => {
    expect(selectFlightColumns([flight()], auto).remarksRevealClass).toBeNull();
  });

  it('keeps off-block, function and landings regardless of the data', () => {
    const layout = selectFlightColumns([flight({ offBlockTime: undefined, onBlockTime: undefined, allLandings: 0 })], auto);

    expect(layout.offOnBlock).toBe(true);
    expect(layout.function).toBe(true);
    expect(layout.landings).toBe(true);
  });

  it('is the behaviour when no preference is passed at all', () => {
    const flights = [flight({ picTime: 90, ifrTime: 45 })];

    expect(selectFlightColumns(flights)).toEqual(selectFlightColumns(flights, auto));
  });
});

describe('selectFlightColumns — custom mode', () => {
  it('shows a chosen column even when every flight on the page is empty for it', () => {
    const layout = selectFlightColumns([flight()], custom(['ifrTime']));

    expect(keys(layout)).toEqual(['ifrTime']);
  });

  it('hides a column the user did not choose even when flights use it', () => {
    const layout = selectFlightColumns([flight({ picTime: 90, nightTime: 30 })], custom(['nightTime']));

    expect(keys(layout)).toEqual(['nightTime']);
  });

  it('honours an empty selection as "no optional columns"', () => {
    const layout = selectFlightColumns([flight({ picTime: 90, remarks: 'note' })], custom([]));

    expect(layout).toEqual({
      offOnBlock: false,
      function: false,
      landings: false,
      time: [],
      remarksRevealClass: null,
    });
  });

  it('turns the fixed columns off individually', () => {
    const layout = selectFlightColumns([flight()], custom(['offOnBlock', 'landings']));

    expect(layout.offOnBlock).toBe(true);
    expect(layout.landings).toBe(true);
    expect(layout.function).toBe(false);
  });

  it('orders the time columns canonically, not by the order they were picked', () => {
    const layout = selectFlightColumns([flight()], custom(['soloTime', 'picTime', 'dualTime']));

    expect(keys(layout)).toEqual(['picTime', 'dualTime', 'soloTime']);
  });

  it('gives every column a reveal tier, even with all of them selected', () => {
    const everything = FLIGHT_COLUMNS.map((c) => c.key);

    const layout = selectFlightColumns([flight()], custom(everything));

    expect(layout.time).toHaveLength(10);
    expect(layout.time.every((c) => !!c.revealClass)).toBe(true);
    expect(layout.remarksRevealClass).not.toBeNull();
  });

  it('reveals the columns in priority order — the first pick survives narrowest', () => {
    const layout = selectFlightColumns([flight()], custom(['picTime', 'ifrTime']));

    expect(layout.time[0].revealClass).toContain('940px');
    expect(layout.time[1].revealClass).toContain('1030px');
  });
});

describe('column registry', () => {
  it('does not offer the columns that are always shown', () => {
    const offered = FLIGHT_COLUMNS.map((c) => c.key as string);

    expect(offered).not.toContain('date');
    expect(offered).not.toContain('route');
    expect(offered).not.toContain('totalTime');
  });

  it('starts a custom selection from columns that exist', () => {
    const offered = new Set(FLIGHT_COLUMNS.map((c) => c.key));

    expect(DEFAULT_CUSTOM_COLUMNS.every((key) => offered.has(key))).toBe(true);
  });
});
