import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

/** The optional flights-list columns, as named by the API. */
export type FlightColumnKey = components['schemas']['FlightListColumn'];

/**
 * Reveal tiers for the optional flight table columns, narrowest first.
 *
 * These are container queries, not viewport queries: the table measures the
 * width it actually got (sidebar, page padding and browser zoom included), so a
 * wide desktop shows more of the logbook without the user opening each flight.
 * The class strings must stay literal for the Tailwind scanner to emit them.
 *
 * There is one tier per time column plus one for remarks, so even a user who
 * asks for every time column has a width at which each of them appears.
 *
 * The thresholds are measured against the table the columns actually build: a
 * tier that fires before its column fits puts the table into a horizontal
 * scroll, which is the thing the tiers exist to avoid.
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
] as const;

/**
 * Reveal tiers for the remarks column, indexed by how many time columns are
 * already showing.
 *
 * Remarks needs its own ladder because it is roughly three times the width of a
 * time column: borrowing the next time tier let it appear at a width where it
 * did not fit, which is exactly the horizontal scroll these tiers prevent.
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
] as const;

/**
 * How many time columns automatic mode may claim. Deliberately far below the
 * number of tiers: nobody asked for these columns, so they should not push
 * remarks off the widest screens.
 */
const AUTO_MAX_TIME_COLUMNS = 4;

interface FlightColumnDef {
  key: FlightColumnKey;
  /**
   * `time` columns are the ones that reveal progressively as the table gets
   * wider; `fixed` columns are either there or not.
   */
  kind: 'fixed' | 'time';
  /** Short column heading, `flights` namespace */
  labelKey: string;
  /** Full name — heading tooltip and settings label, `flights` namespace */
  titleKey: string;
  /** Minutes shown in the cell; time columns only */
  minutes?: (flight: Flight) => number;
  /** Whether a flight actually uses this column — drives automatic mode */
  hasValue: (flight: Flight) => boolean;
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
 * Every column a user can switch on or off, in display order. Date, route,
 * aircraft and total time are the identity of a logbook row and are always
 * shown, so they are not in here.
 *
 * For the time columns the order is also the priority order: the first ones
 * get the narrowest reveal tiers and so are the last to disappear. Keep it in
 * sync with `models.FlightListColumns` and the `FlightListColumn` enum in the
 * API's OpenAPI spec.
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
  minutesColumn('dualGivenTime', 'tableDualGiven', 'fields.dualGivenTime', (f) => f.dualGivenTime ?? 0),
  minutesColumn('multiPilotTime', 'tableMultiPilot', 'fields.multiPilotTime', (f) => f.multiPilotTime ?? 0),
  minutesColumn('soloTime', 'tableSolo', 'fields.soloTime', (f) => f.soloTime),
  minutesColumn('simulatedFlightTime', 'tableSim', 'fields.simulatedFlightTime', (f) => f.simulatedFlightTime ?? 0),
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

export interface FlightColumnLayout {
  offOnBlock: boolean;
  function: boolean;
  landings: boolean;
  time: FlightTimeColumn[];
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
 * always shows, plus the time columns a well-filled logbook would already be
 * showing under the automatic cap. Starting from an empty table would just
 * make the user rebuild what they had.
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

/**
 * Time columns a phone card can show, in the order they earn one of its slots.
 *
 * Not the table's order: a card has three slots, and PIC and dual time would
 * take two of them on nearly every page while only restating the function badge
 * already in the card's header. Night and IFR lead because they are what a
 * pilot scans a logbook for.
 */
const CARD_TIME_PRIORITY: FlightColumnKey[] = [
  'nightTime',
  'ifrTime',
  'crossCountryTime',
  'simulatedFlightTime',
  'dualGivenTime',
  'sicTime',
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
  /**
   * Whether the landings column splits day from night. Decided for the page,
   * not the flight: one card heading itself differently from the rest is the
   * same wobble the time columns would have.
   */
  landingsSplit: boolean;
  time: FlightCardColumn[];
}

/**
 * Decides which time columns the cards on a page of flights get.
 *
 * Chosen once for the page rather than per card: a card that picked its own
 * columns would give every entry a different set of headings at a different
 * width, and a list of those does not read as a list. So the page asks the same
 * question the table does — does any flight here use this column — and every
 * card answers it in the same columns, showing a dash where a flight logged
 * none of it.
 *
 * Custom mode hands over to the user's own column list, in their order, for the
 * same reason it does in the table: a column they asked for is worth a slot
 * even on a page where it stays empty.
 */
export function selectFlightCardColumns(
  flights: Flight[],
  prefs: FlightColumnPrefs = DEFAULT_FLIGHT_COLUMN_PREFS
): FlightCardColumns {
  const byKey = new Map(FLIGHT_COLUMNS.map((column) => [column.key, column]));
  const isTime = (key: FlightColumnKey) => byKey.get(key)?.kind === 'time';

  const order =
    prefs.mode === 'custom'
      ? prefs.columns.filter(isTime)
      : CARD_TIME_PRIORITY.filter((key) => flights.some((f) => byKey.get(key)!.hasValue(f)));

  return {
    landingsSplit: flights.some((f) => f.landingsNight > 0),
    time: order
      .slice(0, MAX_CARD_TIME_COLUMNS)
      .map((key) => byKey.get(key)!)
      .map((column) => ({ key: column.key, labelKey: column.labelKey, minutes: column.minutes! })),
  };
}

/**
 * Decides which optional columns a page of flights gets.
 *
 * In automatic mode a column is only worth the width if at least one flight on
 * the page has a value for it, so a VFR-only pilot never gets an empty IFR
 * column and a student never gets an empty PIC column.
 *
 * In custom mode the user's list wins as-is — an IFR column they asked for is
 * shown even on a page where every flight was VFR, because the emptiness is
 * itself the information they wanted. Width still has the last word: the time
 * columns reveal progressively, in the user's priority order, so the table
 * never has to scroll sideways on a phone to show what fits on a desktop.
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
      : AUTO_ALWAYS_ON.includes(column.key) || flights.some((f) => column.hasValue(f));

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

  return {
    offOnBlock: has('offOnBlock'),
    function: has('function'),
    landings: has('landings'),
    time,
    // Remarks takes the tier its own ladder gives for this many time columns,
    // and only exists while there is a tier left to give it.
    remarksRevealClass: has('remarks') ? REMARKS_TIERS[time.length] ?? null : null,
  };
}
