import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];
export type FlightTotals = components['schemas']['FlightTotals'];

/** The optional flights-list columns, as named by the API. */
export type FlightColumnKey = components['schemas']['FlightListColumn'];

/** What the function column reads for one entry. */
export type FlightFunctionKind = 'sim' | 'pax' | 'pic' | 'picus' | 'spic' | 'dual' | 'sic' | 'none';

/**
 * An FSTD session and a flight the pilot was carried on log no flight
 * function at all, so they take the column over rather than share it.
 */
export function flightFunctionKind(flight: Flight): FlightFunctionKind {
  if (flight.isSimulator) return 'sim';
  if (flight.isPassenger) return 'pax';
  if (flight.isPic) return 'pic';
  if ((flight.picusTime || 0) > 0) return 'picus';
  if ((flight.spicTime || 0) > 0) return 'spic';
  if (flight.isDual) return 'dual';
  if ((flight.sicTime || 0) > 0 || (flight.reliefTime || 0) > 0) return 'sic';
  return 'none';
}

/** The function column's text. SIM and PAX are translated; the rest are ICAO shorthand. */
export function flightFunctionLabel(kind: FlightFunctionKind, t: (key: string) => string): string {
  if (kind === 'sim') return t('simulatorBadge');
  if (kind === 'pax') return t('passengerBadge');
  if (kind === 'none') return '—';
  return kind.toUpperCase();
}

/** The badge modifier each function kind wears. */
export const FLIGHT_FUNCTION_BADGE: Record<FlightFunctionKind, string> = {
  sim: 'badge-info',
  pax: 'badge-neutral',
  pic: 'badge-info',
  picus: 'badge-info',
  spic: 'badge-info',
  dual: 'badge-expiring',
  sic: 'badge-neutral',
  none: 'badge-neutral',
};

/**
 * Reveal tiers for the optional flight table columns, narrowest first.
 * Container queries, not viewport queries. The class strings must stay
 * literal for the Tailwind scanner to emit them. One tier per time column,
 * one or two per detail column.
 */
const REVEAL_TIERS = [
  'hidden @min-[1020px]:table-cell',
  'hidden @min-[1110px]:table-cell',
  'hidden @min-[1200px]:table-cell',
  'hidden @min-[1290px]:table-cell',
  'hidden @min-[1400px]:table-cell',
  'hidden @min-[1490px]:table-cell',
  'hidden @min-[1580px]:table-cell',
  'hidden @min-[1670px]:table-cell',
  'hidden @min-[1760px]:table-cell',
  'hidden @min-[1850px]:table-cell',
  'hidden @min-[1940px]:table-cell',
  'hidden @min-[2030px]:table-cell',
  'hidden @min-[2120px]:table-cell',
  'hidden @min-[2210px]:table-cell',
  'hidden @min-[2300px]:table-cell',
  'hidden @min-[2390px]:table-cell',
  'hidden @min-[2480px]:table-cell',
  'hidden @min-[2570px]:table-cell',
  'hidden @min-[2660px]:table-cell',
  'hidden @min-[2750px]:table-cell',
  'hidden @min-[2840px]:table-cell',
  'hidden @min-[2930px]:table-cell',
  'hidden @min-[3020px]:table-cell',
  'hidden @min-[3110px]:table-cell',
  'hidden @min-[3200px]:table-cell',
  'hidden @min-[3290px]:table-cell',
  'hidden @min-[3380px]:table-cell',
  'hidden @min-[3470px]:table-cell',
  'hidden @min-[3560px]:table-cell',
  'hidden @min-[3650px]:table-cell',
  'hidden @min-[3740px]:table-cell',
  'hidden @min-[3830px]:table-cell',
  'hidden @min-[3920px]:table-cell',
  'hidden @min-[4010px]:table-cell',
  'hidden @min-[4100px]:table-cell',
  'hidden @min-[4190px]:table-cell',
  'hidden @min-[4280px]:table-cell',
  'hidden @min-[4370px]:table-cell',
  'hidden @min-[4460px]:table-cell',
  'hidden @min-[4550px]:table-cell',
  'hidden @min-[4640px]:table-cell',
  'hidden @min-[4730px]:table-cell',
  'hidden @min-[4820px]:table-cell',
  'hidden @min-[4910px]:table-cell',
  'hidden @min-[5000px]:table-cell',
  'hidden @min-[5090px]:table-cell',
  'hidden @min-[5180px]:table-cell',
  'hidden @min-[5270px]:table-cell',
  'hidden @min-[5360px]:table-cell',
] as const;

/**
 * Reveal tiers for the remarks column, indexed by how many tiers the time
 * and detail columns already take.
 */
const REMARKS_TIERS = [
  'hidden @min-[1180px]:table-cell',
  'hidden @min-[1270px]:table-cell',
  'hidden @min-[1360px]:table-cell',
  'hidden @min-[1450px]:table-cell',
  'hidden @min-[1560px]:table-cell',
  'hidden @min-[1650px]:table-cell',
  'hidden @min-[1740px]:table-cell',
  'hidden @min-[1830px]:table-cell',
  'hidden @min-[1920px]:table-cell',
  'hidden @min-[2010px]:table-cell',
  'hidden @min-[2100px]:table-cell',
  'hidden @min-[2190px]:table-cell',
  'hidden @min-[2280px]:table-cell',
  'hidden @min-[2370px]:table-cell',
  'hidden @min-[2460px]:table-cell',
  'hidden @min-[2550px]:table-cell',
  'hidden @min-[2640px]:table-cell',
  'hidden @min-[2730px]:table-cell',
  'hidden @min-[2820px]:table-cell',
  'hidden @min-[2910px]:table-cell',
  'hidden @min-[3000px]:table-cell',
  'hidden @min-[3090px]:table-cell',
  'hidden @min-[3180px]:table-cell',
  'hidden @min-[3270px]:table-cell',
  'hidden @min-[3360px]:table-cell',
  'hidden @min-[3450px]:table-cell',
  'hidden @min-[3540px]:table-cell',
  'hidden @min-[3630px]:table-cell',
  'hidden @min-[3720px]:table-cell',
  'hidden @min-[3810px]:table-cell',
  'hidden @min-[3900px]:table-cell',
  'hidden @min-[3990px]:table-cell',
  'hidden @min-[4080px]:table-cell',
  'hidden @min-[4170px]:table-cell',
  'hidden @min-[4260px]:table-cell',
  'hidden @min-[4350px]:table-cell',
  'hidden @min-[4440px]:table-cell',
  'hidden @min-[4530px]:table-cell',
  'hidden @min-[4620px]:table-cell',
  'hidden @min-[4710px]:table-cell',
  'hidden @min-[4800px]:table-cell',
  'hidden @min-[4890px]:table-cell',
  'hidden @min-[4980px]:table-cell',
  'hidden @min-[5070px]:table-cell',
  'hidden @min-[5160px]:table-cell',
  'hidden @min-[5250px]:table-cell',
  'hidden @min-[5340px]:table-cell',
  'hidden @min-[5430px]:table-cell',
  'hidden @min-[5520px]:table-cell',
  'hidden @min-[5610px]:table-cell',
] as const;

/** Reveal tiers one detail column takes: one for a number, two for text. */
const detailTierSpan = (column: FlightDetailColumn) => (column.numeric ? 1 : 2);

/** How many time columns automatic mode may claim. */
const AUTO_MAX_TIME_COLUMNS = 4;

/** Translates a key in the `flights` namespace. */
type FlightsT = (key: string, options?: { defaultValue?: string; method?: string; count?: number }) => string;

/** Formats a time of day in the user's clock format. */
type TimeFormat = (value?: string | null) => string;

const plainTime: TimeFormat = (value) => value?.slice(0, 5) ?? '';

/** Builds a detail cell's text; `selfName` stands in for the API's "SELF". */
type DetailText = (flight: Flight, t: FlightsT, fmtTime?: TimeFormat, selfName?: string) => string;

/**
 * The flight's pilot-in-command as the API resolves it for the logbook
 * (`displayPicName`), with the "SELF" placeholder shown as `selfName`.
 */
export function displayPicName(flight: Flight, selfName?: string): string {
  const name = (flight.displayPicName ?? flight.picName ?? '').trim();
  if (!name) return '';
  return selfName && name.toLowerCase() === 'self' ? selfName : name;
}

interface FlightColumnDef {
  key: FlightColumnKey;
  /**
   * `time` columns reveal progressively as the table gets wider; `fixed`
   * columns are either there or not; `detail` columns are text or counts
   * that only custom mode shows.
   */
  kind: 'fixed' | 'time' | 'detail';
  /** Short column heading, `flights` namespace */
  labelKey: string;
  /** Full name — heading tooltip and settings label, `flights` namespace */
  titleKey: string;
  /** Minutes shown in the cell; time columns only */
  minutes?: (flight: Flight) => number;
  /** Minutes in the footer, from the list totals; time columns only */
  totalMinutes?: (totals: FlightTotals) => number;
  /** Cell text, empty when the flight has none; detail columns only */
  text?: DetailText;
  /** Footer text from the list totals; detail columns that add up only */
  total?: (totals: FlightTotals) => string;
  /** Detail columns holding a number, right-aligned in the table */
  numeric?: boolean;
  /** Whether a flight actually uses this column — drives automatic mode; always false for detail columns */
  hasValue: (flight: Flight) => boolean;
}

const detailColumn = (
  key: FlightColumnKey,
  labelKey: string,
  titleKey: string,
  text: DetailText,
  options: { numeric?: boolean; total?: (totals: FlightTotals) => string } = {}
): FlightColumnDef => ({
  key,
  kind: 'detail',
  labelKey,
  titleKey,
  text,
  numeric: !!options.numeric,
  total: options.total,
  hasValue: () => false,
});

const countText = (n: number | undefined) => (n ? String(n) : '');

/** A day/night pair as "D/N", empty when both are zero. */
const dayNightText = (day: number, night: number) => (day || night ? `${day}/${night}` : '');

/** Landings as "D/N" when the page splits them, otherwise their sum. */
export const landingsText = (day: number, night: number, split: boolean) =>
  split ? `${day}/${night}` : String(day + night);

/** Whether any flight on the page has night landings. */
export const hasNightLandings = (flights: Flight[]) => flights.some((f) => f.landingsNight > 0);

function takeoffLandingText(flight: Flight, _t: FlightsT, fmtTime: TimeFormat = plainTime): string {
  if (!flight.departureTime && !flight.arrivalTime) return '';
  return `${fmtTime(flight.departureTime) || '—'} / ${fmtTime(flight.arrivalTime) || '—'}`;
}

function approachTypesText(flight: Flight, t: FlightsT): string {
  const types = [...new Set((flight.approaches ?? []).map((a) => a.type))];
  return types.map((type) => t(`approachTypes.${type.replace('/', '_')}`, { defaultValue: type })).join(', ');
}

function checksText(flight: Flight, t: FlightsT): string {
  return [
    flight.isIpc && t('fields.isIpc'),
    flight.isFlightReview && t('fields.isFlightReview'),
    flight.isProficiencyCheck && t('fields.isProficiencyCheck'),
  ]
    .filter(Boolean)
    .join(', ');
}

/** The crew list as "Name (Role)", comma-separated. */
function crewText(flight: Flight, t: FlightsT): string {
  return (flight.crewMembers ?? [])
    .map((member) => `${member.name} (${t(`crewRoles.${member.role}`)})`)
    .join(', ');
}

/** Launch methods with a `launchMethods.*` translation, by API value. */
const LAUNCH_METHOD_KEYS: Record<string, string> = {
  winch: 'winch',
  aerotow: 'aerotow',
  'self-launch': 'selfLaunch',
  car: 'car',
  bungee: 'bungee',
};

function launchMethodText(flight: Flight, t: FlightsT): string {
  const method = flight.launchMethod;
  if (!method || method === 'null') return '';
  const key = LAUNCH_METHOD_KEYS[method];
  const name = key ? t(`launchMethods.${key}`) : method;
  const count = flight.launches ?? 1;
  return count > 1 ? t('launchCell', { method: name, count }) : name;
}

const minutesColumn = (
  key: FlightColumnKey,
  labelKey: string,
  titleKey: string,
  minutes: (flight: Flight) => number
): FlightColumnDef => ({
  key,
  kind: 'time',
  labelKey,
  titleKey,
  minutes,
  totalMinutes: (totals) => Number(totals[key as keyof FlightTotals] ?? 0),
  hasValue: (flight) => minutes(flight) > 0,
});

/**
 * Every column a user can switch on or off, in display order — which for time
 * columns is also the reveal-priority order. Date, route, aircraft and total
 * time are always shown and are not in here. Keep in sync with
 * `models.FlightListColumns` and the `FlightListColumn` enum in the API's
 * OpenAPI spec.
 */
export const FLIGHT_COLUMNS: FlightColumnDef[] = [
  {
    key: 'offOnBlock',
    kind: 'fixed',
    labelKey: 'tableOffOnBlock',
    titleKey: 'fields.offOnBlockTime',
    hasValue: (f) => rowClockTimes(f).some(Boolean),
  },
  minutesColumn('picTime', 'tablePic', 'fields.picTime', (f) => f.picTime),
  minutesColumn('nightTime', 'tableNight', 'fields.nightTime', (f) => f.nightTime),
  minutesColumn('dualTime', 'tableDual', 'fields.dualTime', (f) => f.dualTime),
  minutesColumn('ifrTime', 'tableIfr', 'fields.ifrTime', (f) => f.ifrTime),
  minutesColumn('crossCountryTime', 'tableXc', 'fields.crossCountryTime', (f) => f.crossCountryTime),
  minutesColumn('sicTime', 'tableSic', 'fields.sicTime', (f) => f.sicTime ?? 0),
  minutesColumn('picusTime', 'tablePicus', 'fields.picusTime', (f) => f.picusTime ?? 0),
  minutesColumn('spicTime', 'tableSpic', 'fields.spicTime', (f) => f.spicTime ?? 0),
  minutesColumn('reliefTime', 'tableRelief', 'fields.reliefTime', (f) => f.reliefTime ?? 0),
  minutesColumn('dualGivenTime', 'tableDualGiven', 'fields.dualGivenTime', (f) => f.dualGivenTime ?? 0),
  minutesColumn('examinerTime', 'tableExaminer', 'fields.examinerTime', (f) => f.examinerTime ?? 0),
  minutesColumn('multiPilotTime', 'tableMultiPilot', 'fields.multiPilotTime', (f) => f.multiPilotTime ?? 0),
  minutesColumn('soloTime', 'tableSolo', 'fields.soloTime', (f) => f.soloTime),
  minutesColumn('simulatedFlightTime', 'tableSim', 'fields.simulatedFlightTime', (f) => f.simulatedFlightTime ?? 0),
  minutesColumn('actualInstrumentTime', 'tableActualInstrument', 'fields.actualInstrumentTime', (f) => f.actualInstrumentTime ?? 0),
  minutesColumn('simulatedInstrumentTime', 'tableSimulatedInstrument', 'fields.simulatedInstrumentTime', (f) => f.simulatedInstrumentTime ?? 0),
  minutesColumn('groundTrainingTime', 'tableGroundTraining', 'fields.groundTrainingTime', (f) => f.groundTrainingTime ?? 0),
  {
    key: 'function',
    kind: 'fixed',
    labelKey: 'tableFunction',
    titleKey: 'fields.function',
    hasValue: () => true,
  },
  {
    key: 'landings',
    kind: 'fixed',
    labelKey: 'tableLdg',
    titleKey: 'fields.landings',
    hasValue: (f) => f.allLandings > 0,
  },
  detailColumn('takeoffLandingTime', 'tableTakeoffLanding', 'fields.takeoffLandingTime', takeoffLandingText),
  detailColumn('takeoffs', 'tableTakeoffs', 'fields.takeoffsDayNight', (f) => dayNightText(f.takeoffsDay, f.takeoffsNight), {
    numeric: true,
    total: (s) => dayNightText(s.takeoffsDay, s.takeoffsNight),
  }),
  detailColumn('approaches', 'tableApproaches', 'fields.approaches', (f) => countText(f.approachesCount), {
    numeric: true,
    total: (s) => countText(s.approaches),
  }),
  detailColumn('approachTypes', 'tableApproachTypes', 'fields.approachTypes', approachTypesText),
  detailColumn('holds', 'tableHolds', 'fields.holds', (f) => countText(f.holds), {
    numeric: true,
    total: (s) => countText(s.holds),
  }),
  detailColumn('distance', 'tableDistance', 'fields.distance', (f) => countText(Math.round(f.distance ?? 0)), {
    numeric: true,
    total: (s) => countText(Math.round(s.distance)),
  }),
  detailColumn('waypoints', 'tableWaypoints', 'fields.routeWaypoints', (f) => f.route?.trim() ?? ''),
  detailColumn('picName', 'tablePicName', 'fields.picName', (f, _t, _fmt, selfName) => displayPicName(f, selfName)),
  detailColumn('instructorName', 'tableInstructor', 'fields.instructorName', (f) => f.instructorName?.trim() ?? ''),
  detailColumn('crew', 'tableCrew', 'sections.crew', crewText),
  detailColumn('launchMethod', 'tableLaunch', 'fields.launchMethod', launchMethodText),
  detailColumn('fstdType', 'tableFstd', 'fields.fstdType', (f) => f.fstdType?.trim() ?? ''),
  detailColumn('checks', 'tableChecks', 'fields.checks', checksText),
  detailColumn('signed', 'tableSigned', 'fields.signedStatus', (f, t) => (f.signatureId ? t('signed') : '')),
  detailColumn('endorsements', 'tableEndorsements', 'fields.endorsements', (f) => f.endorsements?.trim() ?? ''),
  detailColumn('instructorComments', 'tableInstructorComments', 'fields.instructorComments', (f) => f.instructorComments?.trim() ?? ''),
  {
    key: 'remarks',
    kind: 'fixed',
    labelKey: 'tableRemarks',
    titleKey: 'fields.remarks',
    hasValue: (f) => !!f.remarks?.trim(),
  },
];

/** The columns automatic mode shows regardless of what is on the page. */
const AUTO_ALWAYS_ON: FlightColumnKey[] = ['offOnBlock', 'function', 'landings'];

export interface FlightTimeColumn {
  key: FlightColumnKey;
  /** Minutes in the footer, from the list totals */
  total: (totals: FlightTotals) => number;
  labelKey: string;
  titleKey: string;
  minutes: (flight: Flight) => number;
  /** Tailwind classes that reveal this column once the table is wide enough */
  revealClass: string;
}

/** Whether a flight carries block times, as opposed to take-off and landing only. */
export const hasBlockTimes = (f: Flight): boolean => !!(f.offBlockTime || f.onBlockTime);

/** The times a row shows: block times, else take-off and landing. */
export const rowClockTimes = (f: Flight): [string | null | undefined, string | null | undefined] =>
  hasBlockTimes(f) ? [f.offBlockTime, f.onBlockTime] : [f.departureTime, f.arrivalTime];

/** Heading of the times column: block times when any flight on the page has them. */
export const offOnBlockLabelKey = (flights: Flight[]): string =>
  flights.length === 0 || flights.some(hasBlockTimes) ? 'tableOffOnBlock' : 'tableTakeoffLandingTimes';

export interface FlightDetailColumn {
  key: FlightColumnKey;
  labelKey: string;
  titleKey: string;
  text: DetailText;
  numeric: boolean;
  total?: (totals: FlightTotals) => string;
}

export interface FlightTableDetailColumn extends FlightDetailColumn {
  /** Tailwind classes that reveal this column once the table is wide enough */
  revealClass: string;
}

export interface FlightColumnLayout {
  offOnBlock: boolean;
  /** Heading key of the times column, `flights` namespace */
  offOnBlockLabelKey: string;
  /** Launch method and launches; automatic mode only. */
  launch: boolean;
  function: boolean;
  landings: boolean;
  /** Whether the landings column splits day from night. Decided per page. */
  landingsSplit: boolean;
  time: FlightTimeColumn[];
  /** People and other details, in display order; custom mode only */
  details: FlightTableDetailColumn[];
  /** Reveal classes for the remarks column, or null when it is not shown */
  remarksRevealClass: string | null;
}

export interface FlightColumnPrefs {
  mode: 'auto' | 'custom';
  columns: FlightColumnKey[];
}

export const DEFAULT_FLIGHT_COLUMN_PREFS: FlightColumnPrefs = { mode: 'auto', columns: [] };

/** A column automatic mode can show that custom mode cannot list. */
export type AutoOnlyColumnKey = 'launch';

/** Relevance of a column to the pilot, for automatic mode. */
export interface ColumnRelevance {
  /** Whether the column serves the pilot; `hasValue` is whether the page holds data for it. */
  relevant: (key: FlightColumnKey | AutoOnlyColumnKey, hasValue: boolean) => boolean;
  /** Priority added to a relevant column. */
  boost: (key: FlightColumnKey | AutoOnlyColumnKey) => number;
}

/** Every column relevant, none boosted. */
export const ALL_COLUMNS_RELEVANT: ColumnRelevance = { relevant: () => true, boost: () => 0 };

/** Whether a flight carries a launch method. */
export const hasLaunchMethod = (flight: Flight): boolean =>
  !!flight.launchMethod && flight.launchMethod !== 'null';

/**
 * Orders columns for automatic mode: relevant columns first by boost, folded columns last;
 * ties keep their order.
 */
function byRelevance<T extends { key: FlightColumnKey }>(
  columns: T[],
  relevance: ColumnRelevance,
  hasValue: (column: T) => boolean
): T[] {
  const priority = (c: T) => (relevance.relevant(c.key, hasValue(c)) ? relevance.boost(c.key) : -1);
  return columns
    .map((column, index) => ({ column, index, p: priority(column) }))
    .sort((a, b) => b.p - a.p || a.index - b.index)
    .map((e) => e.column);
}

/**
 * What a first switch to custom mode starts from: the columns automatic mode
 * always shows, plus the first time columns under the automatic cap.
 */
export const DEFAULT_CUSTOM_COLUMNS: FlightColumnKey[] = [
  'offOnBlock',
  'picTime',
  'nightTime',
  'dualTime',
  'ifrTime',
  'function',
  'landings',
  'remarks',
];

/** Time columns a phone card can show, in the order they earn one of its slots. */
const CARD_TIME_PRIORITY: FlightColumnKey[] = [
  'nightTime',
  'ifrTime',
  'crossCountryTime',
  'simulatedFlightTime',
  'dualGivenTime',
  'sicTime',
  'picusTime',
  'spicTime',
  'reliefTime',
  'examinerTime',
  'multiPilotTime',
  'soloTime',
];

/** How many time columns fit beside the fixed ones on a phone card. */
export const MAX_CARD_TIME_COLUMNS = 3;

export interface FlightCardColumn {
  key: FlightColumnKey;
  labelKey: string;
  minutes: (flight: Flight) => number;
  /** Minutes from the list totals */
  total: (totals: FlightTotals) => number;
}

export interface FlightCardColumns {
  /** The off-block / on-block pair, as two cells. */
  offOnBlock: boolean;
  /** The PIC/DUAL/SIC badge in the row header. */
  function: boolean;
  landings: boolean;
  /** Whether the landings column splits day from night. Decided per page. */
  landingsSplit: boolean;
  time: FlightCardColumn[];
  /** People and other details, shown as one line under the header. */
  details: FlightDetailColumn[];
}

/**
 * Decides which time columns the cards on a page of flights get — once for
 * the page, not per card. Automatic mode shows columns any flight on the page
 * uses; custom mode uses the user's own column list in their order.
 */
export function selectFlightCardColumns(
  flights: Flight[],
  prefs: FlightColumnPrefs = DEFAULT_FLIGHT_COLUMN_PREFS,
  relevance: ColumnRelevance = ALL_COLUMNS_RELEVANT
): FlightCardColumns {
  const byKey = new Map(FLIGHT_COLUMNS.map((column) => [column.key, column]));
  const isTime = (key: FlightColumnKey) => byKey.get(key)?.kind === 'time';
  const custom = prefs.mode === 'custom';
  const selected = new Set(prefs.columns);
  const pageHas = (key: FlightColumnKey) => flights.some((f) => byKey.get(key)!.hasValue(f));
  const shows = (key: FlightColumnKey) =>
    custom ? selected.has(key) : AUTO_ALWAYS_ON.includes(key) && relevance.relevant(key, pageHas(key));

  const order = custom
    ? prefs.columns.filter(isTime)
    : byRelevance(
        CARD_TIME_PRIORITY.filter(pageHas).map((key) => ({ key })),
        relevance,
        () => true
      ).map((c) => c.key);

  return {
    offOnBlock: shows('offOnBlock'),
    function: shows('function'),
    landings: shows('landings'),
    landingsSplit: hasNightLandings(flights),
    time: order
      .slice(0, MAX_CARD_TIME_COLUMNS)
      .map((key) => byKey.get(key)!)
      .map((column) => ({
        key: column.key,
        labelKey: column.labelKey,
        minutes: column.minutes!,
        total: column.totalMinutes!,
      })),
    details: custom ? selectedDetails(selected) : [],
  };
}

function selectedDetails(selected: Set<FlightColumnKey>): FlightDetailColumn[] {
  return FLIGHT_COLUMNS.filter((c) => c.kind === 'detail' && selected.has(c.key)).map((c) => ({
    key: c.key,
    labelKey: c.labelKey,
    titleKey: c.titleKey,
    text: c.text!,
    numeric: !!c.numeric,
    total: c.total,
  }));
}

/**
 * Decides which optional columns a page of flights gets. Automatic mode shows
 * a column when at least one flight on the page has a value for it; custom
 * mode uses the user's list as-is. Time columns still reveal progressively
 * with width.
 */
export function selectFlightColumns(
  flights: Flight[],
  prefs: FlightColumnPrefs = DEFAULT_FLIGHT_COLUMN_PREFS,
  relevance: ColumnRelevance = ALL_COLUMNS_RELEVANT
): FlightColumnLayout {
  const custom = prefs.mode === 'custom';
  const selected = new Set(prefs.columns);
  const pageHas = (column: FlightColumnDef) => flights.some((f) => column.hasValue(f));

  const shows = (column: FlightColumnDef) =>
    custom
      ? selected.has(column.key)
      : column.kind !== 'detail' &&
        ((AUTO_ALWAYS_ON.includes(column.key) && relevance.relevant(column.key, pageHas(column))) || pageHas(column));

  const visible = custom ? FLIGHT_COLUMNS.filter(shows) : byRelevance(FLIGHT_COLUMNS.filter(shows), relevance, pageHas);

  const timeColumns = visible.filter((c) => c.kind === 'time');
  const time = (custom ? timeColumns : timeColumns.slice(0, AUTO_MAX_TIME_COLUMNS)).map((col, i) => ({
    key: col.key,
    labelKey: col.labelKey,
    titleKey: col.titleKey,
    minutes: col.minutes!,
    total: col.totalMinutes!,
    revealClass: REVEAL_TIERS[i],
  }));

  const has = (key: FlightColumnKey) => visible.some((c) => c.key === key);

  const pageHasLaunch = flights.some(hasLaunchMethod);

  let tiersTaken = time.length;
  const details = (custom ? selectedDetails(selected) : []).map((col) => {
    tiersTaken += detailTierSpan(col);
    return { ...col, revealClass: REVEAL_TIERS[tiersTaken - 1] };
  });

  return {
    offOnBlock: has('offOnBlock'),
    offOnBlockLabelKey: offOnBlockLabelKey(flights),
    launch: !custom && pageHasLaunch && relevance.relevant('launch', pageHasLaunch),
    function: has('function'),
    landings: has('landings'),
    landingsSplit: hasNightLandings(flights),
    time,
    details,
    // Remarks takes the tier its own ladder gives for the tiers already taken,
    // and only exists while there is a tier left to give it.
    remarksRevealClass: has('remarks') ? REMARKS_TIERS[tiersTaken] ?? null : null,
  };
}

/** Table width the flights list gets on a 1920px-wide desktop window. */
export const TYPICAL_DESKTOP_TABLE_WIDTH = 1600;

/** The container width a reveal class switches its column on at. */
export function revealWidth(revealClass: string): number {
  const match = /@min-\[(\d+)px\]/.exec(revealClass);
  return match ? Number(match[1]) : 0;
}

/**
 * The picked columns a table `width` pixels wide cannot show, in display
 * order. Columns without a reveal tier always show and are never listed.
 */
export function columnsHiddenAt(columns: FlightColumnKey[], width: number): FlightColumnKey[] {
  const layout = selectFlightColumns([], { mode: 'custom', columns });
  const tiered = [
    ...layout.time.map((c) => ({ key: c.key, revealClass: c.revealClass })),
    ...layout.details.map((c) => ({ key: c.key, revealClass: c.revealClass })),
  ];
  const hidden = new Set(tiered.filter((c) => revealWidth(c.revealClass) > width).map((c) => c.key));
  if (columns.includes('remarks') && (!layout.remarksRevealClass || revealWidth(layout.remarksRevealClass) > width)) {
    hidden.add('remarks');
  }
  return FLIGHT_COLUMNS.map((c) => c.key).filter((key) => hidden.has(key));
}
