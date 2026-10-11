import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

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
 * two per detail column.
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
] as const;

/** Reveal tiers one detail column takes. */
const DETAIL_TIER_SPAN = 2;

/** How many time columns automatic mode may claim. */
const AUTO_MAX_TIME_COLUMNS = 4;

/** Translates a key in the `flights` namespace. */
type FlightsT = (key: string) => string;

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
  /** Cell text, empty when the flight has none; detail columns only */
  text?: (flight: Flight, t: FlightsT) => string;
  /** Detail columns holding a number, right-aligned in the table */
  numeric?: boolean;
  /** Whether a flight actually uses this column — drives automatic mode */
  hasValue: (flight: Flight) => boolean;
}

const detailColumn = (
  key: FlightColumnKey,
  labelKey: string,
  titleKey: string,
  text: (flight: Flight, t: FlightsT) => string,
  numeric = false
): FlightColumnDef => ({
  key,
  kind: 'detail',
  labelKey,
  titleKey,
  text,
  numeric,
  hasValue: (flight) => text(flight, (k) => k) !== '',
});

/** The crew list as "Name (Role)", comma-separated. */
function crewText(flight: Flight, t: FlightsT): string {
  return (flight.crewMembers ?? [])
    .map((member) => `${member.name} (${t(`crewRoles.${member.role}`)})`)
    .join(', ');
}

function launchMethodText(flight: Flight, t: FlightsT): string {
  if (!flight.launchMethod) return '';
  return t(`launchMethods.${flight.launchMethod === 'self-launch' ? 'selfLaunch' : flight.launchMethod}`);
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
    hasValue: (f) => !!(f.offBlockTime || f.onBlockTime),
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
  detailColumn('approaches', 'tableApproaches', 'fields.approaches', (f) => (f.approachesCount ? String(f.approachesCount) : ''), true),
  detailColumn('distance', 'tableDistance', 'fields.distance', (f) => (f.distance ? String(Math.round(f.distance)) : ''), true),
  detailColumn('picName', 'tablePicName', 'fields.picName', (f) => f.picName?.trim() ?? ''),
  detailColumn('instructorName', 'tableInstructor', 'fields.instructorName', (f) => f.instructorName?.trim() ?? ''),
  detailColumn('crew', 'tableCrew', 'sections.crew', crewText),
  detailColumn('launchMethod', 'tableLaunch', 'fields.launchMethod', launchMethodText),
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
  labelKey: string;
  titleKey: string;
  minutes: (flight: Flight) => number;
  /** Tailwind classes that reveal this column once the table is wide enough */
  revealClass: string;
}

export interface FlightDetailColumn {
  key: FlightColumnKey;
  labelKey: string;
  titleKey: string;
  text: (flight: Flight, t: FlightsT) => string;
  numeric: boolean;
}

export interface FlightTableDetailColumn extends FlightDetailColumn {
  /** Tailwind classes that reveal this column once the table is wide enough */
  revealClass: string;
}

export interface FlightColumnLayout {
  offOnBlock: boolean;
  function: boolean;
  landings: boolean;
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
  prefs: FlightColumnPrefs = DEFAULT_FLIGHT_COLUMN_PREFS
): FlightCardColumns {
  const byKey = new Map(FLIGHT_COLUMNS.map((column) => [column.key, column]));
  const isTime = (key: FlightColumnKey) => byKey.get(key)?.kind === 'time';
  const custom = prefs.mode === 'custom';
  const selected = new Set(prefs.columns);
  const shows = (key: FlightColumnKey) => (custom ? selected.has(key) : AUTO_ALWAYS_ON.includes(key));

  const order = custom
    ? prefs.columns.filter(isTime)
    : CARD_TIME_PRIORITY.filter((key) => flights.some((f) => byKey.get(key)!.hasValue(f)));

  return {
    offOnBlock: shows('offOnBlock'),
    function: shows('function'),
    landings: shows('landings'),
    landingsSplit: flights.some((f) => f.landingsNight > 0),
    time: order
      .slice(0, MAX_CARD_TIME_COLUMNS)
      .map((key) => byKey.get(key)!)
      .map((column) => ({ key: column.key, labelKey: column.labelKey, minutes: column.minutes! })),
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
  prefs: FlightColumnPrefs = DEFAULT_FLIGHT_COLUMN_PREFS
): FlightColumnLayout {
  const custom = prefs.mode === 'custom';
  const selected = new Set(prefs.columns);

  const shows = (column: FlightColumnDef) =>
    custom
      ? selected.has(column.key)
      : column.kind !== 'detail' &&
        (AUTO_ALWAYS_ON.includes(column.key) || flights.some((f) => column.hasValue(f)));

  const visible = FLIGHT_COLUMNS.filter(shows);

  const timeColumns = visible.filter((c) => c.kind === 'time');
  const time = (custom ? timeColumns : timeColumns.slice(0, AUTO_MAX_TIME_COLUMNS)).map((col, i) => ({
    key: col.key,
    labelKey: col.labelKey,
    titleKey: col.titleKey,
    minutes: col.minutes!,
    revealClass: REVEAL_TIERS[i],
  }));

  const has = (key: FlightColumnKey) => visible.some((c) => c.key === key);

  const details = (custom ? selectedDetails(selected) : []).map((col, i) => ({
    ...col,
    revealClass: REVEAL_TIERS[time.length + (i + 1) * DETAIL_TIER_SPAN - 1],
  }));
  const tiersTaken = time.length + details.length * DETAIL_TIER_SPAN;

  return {
    offOnBlock: has('offOnBlock'),
    function: has('function'),
    landings: has('landings'),
    time,
    details,
    // Remarks takes the tier its own ladder gives for the tiers already taken,
    // and only exists while there is a tier left to give it.
    remarksRevealClass: has('remarks') ? REMARKS_TIERS[tiersTaken] ?? null : null,
  };
}
