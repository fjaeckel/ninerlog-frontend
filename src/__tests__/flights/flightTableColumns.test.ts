import { describe, it, expect } from 'vitest';
import {
  displayPicName,
  TYPICAL_DESKTOP_TABLE_WIDTH,
  columnsHiddenAt,
  DEFAULT_CUSTOM_COLUMNS,
  FLIGHT_COLUMNS,
  flightFunctionKind,
  selectFlightColumns,
  selectFlightCardColumns,
  type FlightColumnKey,
} from '../../components/flights/flightTableColumns';
import type { components } from '../../api/schema';
import { resolveDisciplines } from '../../hooks/usePilotProfile';
import { columnRelevanceFor } from '../../hooks/useFlightColumnRelevance';
import { PERSONA_PROFILES } from '../../test/pilotProfile';

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
      launch: false,
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

describe('displayPicName', () => {
  it('uses the name the API resolves for the logbook', () => {
    expect(displayPicName(flight({ picName: null, displayPicName: 'Jacqueline Cochran' }), 'Alex Fischer')).toBe(
      'Jacqueline Cochran'
    );
  });

  it('shows the user for the SELF placeholder, whatever its case', () => {
    expect(displayPicName(flight({ displayPicName: 'SELF' }), 'Alex Fischer')).toBe('Alex Fischer');
    expect(displayPicName(flight({ displayPicName: 'Self' }), 'Alex Fischer')).toBe('Alex Fischer');
    expect(displayPicName(flight({ displayPicName: 'SELF' }))).toBe('SELF');
  });

  it('falls back to the stored PIC name, and is empty for an FSTD session', () => {
    expect(displayPicName(flight({ picName: 'Bessie Coleman' }))).toBe('Bessie Coleman');
    expect(displayPicName(flight({ displayPicName: null, picName: null }))).toBe('');
  });

  it('feeds the PIC Name column', () => {
    const f = flight({ displayPicName: 'SELF' });
    const layout = selectFlightColumns([f], custom(['picName']));

    expect(layout.details[0].text(f, (k) => k, undefined, 'Alex Fischer')).toBe('Alex Fischer');
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

describe('columnsHiddenAt', () => {
  it('lists nothing for a selection that fits', () => {
    expect(columnsHiddenAt(['picTime', 'nightTime', 'landings', 'picName'], TYPICAL_DESKTOP_TABLE_WIDTH)).toEqual([]);
  });

  it('lists the picked columns past the width, in display order, remarks included', () => {
    const everything = FLIGHT_COLUMNS.map((c) => c.key);
    const hidden = columnsHiddenAt(everything, TYPICAL_DESKTOP_TABLE_WIDTH);

    expect(hidden).toContain('remarks');
    expect(hidden).toContain('instructorComments');
    expect(hidden).not.toContain('picTime');
    expect(hidden).not.toContain('landings');
    expect(hidden).toEqual(everything.filter((key) => hidden.includes(key)));
  });

  it('never lists a column that was not picked', () => {
    expect(columnsHiddenAt(['picTime'], 100)).toEqual(['picTime']);
    expect(columnsHiddenAt(['landings', 'offOnBlock'], 100)).toEqual([]);
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

describe('selectFlightColumns — relevance in automatic mode', () => {
  const rel = (p: ReturnType<(typeof PERSONA_PROFILES)[keyof typeof PERSONA_PROFILES]>) =>
    columnRelevanceFor(resolveDisciplines(p, false));
  const glider = (o: Partial<Flight> = {}) =>
    flight({ aircraftReg: 'D-1234', aircraftType: 'ASK 21', offBlockTime: null, onBlockTime: null, ...o });

  it('A2 Mark: an airline page is unchanged by relevance', () => {
    const page = [
      flight({ picTime: 90, nightTime: 30, ifrTime: 60 }),
      flight({ sicTime: 90, multiPilotTime: 90, ifrTime: 90 }),
    ];
    expect(selectFlightColumns(page, auto, rel(PERSONA_PROFILES.mark()))).toEqual(selectFlightColumns(page, auto));
    expect(selectFlightCardColumns(page, auto, rel(PERSONA_PROFILES.mark()))).toEqual(selectFlightCardColumns(page, auto));
  });

  it('L Lena: off/on block is not force-shown when no flight on the page has block times', () => {
    const page = [glider({ picTime: 8, launchMethod: 'winch', launches: 6 })];
    const layout = selectFlightColumns(page, auto, rel(PERSONA_PROFILES.lena()));
    expect(layout.offOnBlock).toBe(false);
    expect(selectFlightCardColumns(page, auto, rel(PERSONA_PROFILES.lena())).offOnBlock).toBe(false);
  });

  it('L Lena: block times on the page still show the column (data always wins)', () => {
    const page = [glider({ offBlockTime: '10:00:00', onBlockTime: '10:10:00' })];
    expect(selectFlightColumns(page, auto, rel(PERSONA_PROFILES.lena())).offOnBlock).toBe(true);
  });

  it('K Karl: a TMG pilot keeps the block column even when the page has none', () => {
    const page = [flight({ offBlockTime: null, onBlockTime: null })];
    expect(selectFlightColumns(page, auto, rel(PERSONA_PROFILES.karl())).offOnBlock).toBe(true);
  });

  it('shows the launch column when any flight on the page has a launch method', () => {
    const lena = rel(PERSONA_PROFILES.lena());
    expect(selectFlightColumns([glider({ launchMethod: 'winch' })], auto, lena).launch).toBe(true);
    expect(selectFlightColumns([glider()], auto, lena).launch).toBe(false);
    expect(selectFlightColumns([glider({ launchMethod: 'aerotow' })], auto, rel(PERSONA_PROFILES.mark())).launch).toBe(true);
    expect(selectFlightColumns([glider({ launchMethod: 'winch' })], custom(['picTime'])).launch).toBe(false);
  });

  it('P Petra: a relevant boosted column comes before generic ones', () => {
    const page = [glider({ picTime: 60, dualTime: 30, crossCountryTime: 60, soloTime: 20, dualGivenTime: 45 })];
    expect(keys(selectFlightColumns(page, auto))).toEqual(['picTime', 'dualTime', 'crossCountryTime', 'dualGivenTime']);
    expect(keys(selectFlightColumns(page, auto, rel(PERSONA_PROFILES.petra())))).toEqual([
      'dualGivenTime', 'picTime', 'dualTime', 'crossCountryTime',
    ]);
  });

  it('S3 Sabine: an IFR or SIC column sorts after the relevant ones', () => {
    const page = [flight({ picTime: 60, dualTime: 10, crossCountryTime: 30, ifrTime: 5, soloTime: 20 })];
    expect(keys(selectFlightColumns(page, auto, rel(PERSONA_PROFILES.sabine())))).toEqual([
      'picTime', 'dualTime', 'crossCountryTime', 'soloTime',
    ]);
  });

  it('fails open while the profile loads', () => {
    const page = [glider({ picTime: 60 })];
    const loading = columnRelevanceFor(resolveDisciplines(undefined, true));
    expect(selectFlightColumns(page, auto, loading)).toEqual(selectFlightColumns(page, auto));
  });
});
