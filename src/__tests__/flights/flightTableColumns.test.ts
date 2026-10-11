import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CUSTOM_COLUMNS,
  FLIGHT_COLUMNS,
  flightFunctionKind,
  selectFlightColumns,
  selectFlightCardColumns,
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
      landingsSplit: false,
      time: [],
      details: [],
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

    expect(layout.time).toHaveLength(17);
    expect(layout.time.every((c) => !!c.revealClass)).toBe(true);
    expect(layout.details).toHaveLength(16);
    expect(layout.details.every((c) => !!c.revealClass)).toBe(true);
    expect(layout.remarksRevealClass).not.toBeNull();
  });

  it('reveals the columns in priority order — the first pick survives narrowest', () => {
    const layout = selectFlightColumns([flight()], custom(['picTime', 'ifrTime']));

    // Each column needs more width than the one before it.
    expect(revealWidth(layout.time[0].revealClass)).toBeLessThan(revealWidth(layout.time[1].revealClass));
  });

  it('asks more width for remarks than for one more time column', () => {
    const layout = selectFlightColumns([flight({ remarks: 'Touch and go' })], custom(['picTime', 'ifrTime', 'remarks']));

    // Remarks has its own ladder.
    expect(revealWidth(layout.remarksRevealClass!)).toBeGreaterThan(revealWidth(layout.time[1].revealClass));
  });
});

describe('detail columns', () => {
  const tKey = (key: string) => key;
  const text = (layout: ReturnType<typeof selectFlightColumns>, key: FlightColumnKey, f: Flight) =>
    layout.details.find((c) => c.key === key)!.text(f, tKey);

  it('never appear in automatic mode, even when flights carry the data', () => {
    const layout = selectFlightColumns([flight({ picName: 'A. Earhart', instructorName: 'B. Coleman' })], auto);

    expect(layout.details).toEqual([]);
  });

  it('appear in canonical order in custom mode', () => {
    const layout = selectFlightColumns([flight()], custom(['crew', 'picName', 'distance']));

    expect(layout.details.map((c) => c.key)).toEqual(['distance', 'picName', 'crew']);
  });

  it('render people, crew roles, launch method and numbers', () => {
    const f = flight({
      picName: ' A. Earhart ',
      instructorName: 'B. Coleman',
      launchMethod: 'self-launch',
      distance: 123.6,
      approachesCount: 2,
      crewMembers: [
        { id: 'c1', flightId: 'flight-1', name: 'H. Hanna', role: 'Passenger' },
        { id: 'c2', flightId: 'flight-1', name: 'B. Coleman', role: 'Instructor' },
      ],
    });
    const layout = selectFlightColumns(
      [f],
      custom(['picName', 'instructorName', 'crew', 'launchMethod', 'distance', 'approaches'])
    );

    expect(text(layout, 'picName', f)).toBe('A. Earhart');
    expect(text(layout, 'instructorName', f)).toBe('B. Coleman');
    expect(text(layout, 'crew', f)).toBe('H. Hanna (crewRoles.Passenger), B. Coleman (crewRoles.Instructor)');
    expect(text(layout, 'launchMethod', f)).toBe('launchMethods.selfLaunch');
    expect(text(layout, 'distance', f)).toBe('124');
    expect(text(layout, 'approaches', f)).toBe('2');
  });

  it('render an empty string when the flight has nothing for them', () => {
    const f = flight();
    const layout = selectFlightColumns([f], custom(['picName', 'crew', 'launchMethod', 'distance', 'approaches']));

    expect(layout.details.map((c) => c.text(f, tKey))).toEqual(['', '', '', '', '']);
  });

  it('reveal after the time columns, and push remarks further out', () => {
    const withDetail = selectFlightColumns([flight({ remarks: 'x' })], custom(['picTime', 'picName', 'remarks']));
    const without = selectFlightColumns([flight({ remarks: 'x' })], custom(['picTime', 'remarks']));

    expect(revealWidth(withDetail.details[0].revealClass)).toBeGreaterThan(revealWidth(withDetail.time[0].revealClass));
    expect(revealWidth(withDetail.remarksRevealClass!)).toBeGreaterThan(revealWidth(without.remarksRevealClass!));
  });

  it('render takeoffs, times, approach types, checks and the signature', () => {
    const f = flight({
      takeoffsDay: 2,
      takeoffsNight: 1,
      departureTime: '09:15:00',
      arrivalTime: '10:45:00',
      approaches: [{ type: 'ILS' }, { type: 'RNAV/GPS' }, { type: 'ILS' }],
      holds: 1,
      isIpc: true,
      isFlightReview: true,
      signatureId: 'sig-1',
      fstdType: 'FNPT II',
      route: 'EDDF, KNG, EDDH',
    });
    const layout = selectFlightColumns(
      [f],
      custom(['takeoffLandingTime', 'takeoffs', 'approachTypes', 'holds', 'checks', 'signed', 'fstdType', 'waypoints'])
    );

    expect(text(layout, 'takeoffLandingTime', f)).toBe('09:15 / 10:45');
    expect(text(layout, 'takeoffs', f)).toBe('2/1');
    expect(text(layout, 'approachTypes', f)).toBe('approachTypes.ILS, approachTypes.RNAV_GPS');
    expect(text(layout, 'holds', f)).toBe('1');
    expect(text(layout, 'checks', f)).toBe('fields.isIpc, fields.isFlightReview');
    expect(text(layout, 'signed', f)).toBe('signed');
    expect(text(layout, 'fstdType', f)).toBe('FNPT II');
    expect(text(layout, 'waypoints', f)).toBe('EDDF, KNG, EDDH');
  });

  it('fall back to the raw value for an approach type or launch method with no translation', () => {
    const missing = (key: string, options?: { defaultValue?: string }) => options?.defaultValue ?? `missing:${key}`;
    const layout = selectFlightColumns([flight()], custom(['approachTypes', 'launchMethod']));
    const [approachTypes, launchMethod] = layout.details;

    expect(approachTypes.text(flight({ approaches: [{ type: 'Unknown' }] }), missing)).toBe('Unknown');
    expect(launchMethod.text(flight({ launchMethod: 'null' }), missing)).toBe('');
    expect(launchMethod.text(flight({ launchMethod: 'winch' }), missing)).toBe('missing:launchMethods.winch');
  });

  it('format takeoff and landing times with the formatter given', () => {
    const f = flight({ departureTime: '14:05:00', arrivalTime: null });
    const layout = selectFlightColumns([f], custom(['takeoffLandingTime']));

    expect(layout.details[0].text(f, tKey, (v) => (v ? `<${v}>` : ''))).toBe('<14:05:00> / —');
  });

  it('total only the columns that add up', () => {
    const layout = selectFlightColumns([flight()], custom(['takeoffs', 'approaches', 'distance', 'picName']));
    const sums = {
      takeoffsDay: 40,
      takeoffsNight: 2,
      approaches: 12,
      distance: 1234.6,
    } as Parameters<NonNullable<(typeof layout.details)[number]['total']>>[0];

    expect(layout.details.map((c) => c.total?.(sums) ?? null)).toEqual(['40/2', '12', '1235', null]);
  });

  it('let a number take one width tier and text two', () => {
    const numberFirst = selectFlightColumns([flight()], custom(['approaches', 'holds']));
    const textFirst = selectFlightColumns([flight()], custom(['holds', 'picName']));

    const step = revealWidth(numberFirst.details[1].revealClass) - revealWidth(numberFirst.details[0].revealClass);
    const textStep = revealWidth(textFirst.details[1].revealClass) - revealWidth(textFirst.details[0].revealClass);
    expect(textStep).toBeGreaterThan(step);
  });

  it('reach the phone card too', () => {
    const card = selectFlightCardColumns([flight()], custom(['instructorName']));

    expect(card.details.map((c) => c.key)).toEqual(['instructorName']);
  });
});

describe('time column totals', () => {
  it('read each time column from the list totals by its own key', () => {
    const layout = selectFlightColumns([flight()], custom(['picTime', 'nightTime', 'groundTrainingTime']));
    const sums = { picTime: 600, nightTime: 45, groundTrainingTime: 90 } as Parameters<
      (typeof layout.time)[number]['total']
    >[0];

    expect(layout.time.map((c) => c.total(sums))).toEqual([600, 45, 90]);
  });
});

describe('landings split', () => {
  it('splits day from night in the table once any flight has a night landing', () => {
    expect(selectFlightColumns([flight(), flight({ landingsNight: 1 })], auto).landingsSplit).toBe(true);
    expect(selectFlightColumns([flight()], auto).landingsSplit).toBe(false);
  });
});

describe('selectFlightCardColumns', () => {
  it('answers the same column setting the table does', () => {
    const flights = [flight({ nightTime: 30, picTime: 90 })];

    const table = selectFlightColumns(flights, custom(['nightTime']));
    const card = selectFlightCardColumns(flights, custom(['nightTime']));

    // A phone must not show what the table was told to hide
    expect(card.offOnBlock).toBe(table.offOnBlock);
    expect(card.function).toBe(table.function);
    expect(card.landings).toBe(table.landings);
  });

  it('keeps the fixed columns in automatic mode', () => {
    const card = selectFlightCardColumns([flight()], auto);

    expect(card.offOnBlock).toBe(true);
    expect(card.function).toBe(true);
    expect(card.landings).toBe(true);
  });

  it('caps the time columns at what a phone row can hold', () => {
    const busy = flight({ nightTime: 30, ifrTime: 20, crossCountryTime: 60, soloTime: 15 });

    expect(selectFlightCardColumns([busy], auto).time).toHaveLength(3);
  });

  it('splits landings for the page, not the flight', () => {
    const flights = [flight({ landingsNight: 0 }), flight({ landingsNight: 2 })];

    expect(selectFlightCardColumns(flights, auto).landingsSplit).toBe(true);
    expect(selectFlightCardColumns([flights[0]], auto).landingsSplit).toBe(false);
  });
});

/** The container width at which a reveal class switches its column on. */
function revealWidth(revealClass: string): number {
  const match = /@min-\[(\d+)px\]/.exec(revealClass);
  if (!match) throw new Error(`no reveal threshold in ${revealClass}`);
  return Number(match[1]);
}

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

describe('flightFunctionKind — declared function times', () => {
  it('labels a PICUS sector PICUS, not SIC or none', () => {
    const f = flight({ isPic: false, picusTime: 90, sicTime: 0 });
    expect(flightFunctionKind(f)).toBe('picus');
  });

  it('labels an SPIC sector SPIC even when isDual is set', () => {
    const f = flight({ isPic: false, isDual: true, spicTime: 90 });
    expect(flightFunctionKind(f)).toBe('spic');
  });

  it('labels a relief-only sector SIC', () => {
    const f = flight({ isPic: false, reliefTime: 90, sicTime: 0 });
    expect(flightFunctionKind(f)).toBe('sic');
  });
});
