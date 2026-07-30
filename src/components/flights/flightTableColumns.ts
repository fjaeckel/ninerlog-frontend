import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];

/**
 * Reveal tiers for the optional flight table columns, narrowest first.
 *
 * These are container queries, not viewport queries: the table measures the
 * width it actually got (sidebar, page padding and browser zoom included), so a
 * wide desktop shows more of the logbook without the user opening each flight.
 * The class strings must stay literal for the Tailwind scanner to emit them.
 */
const REVEAL_TIERS = [
  'hidden @min-[940px]:table-cell',
  'hidden @min-[1030px]:table-cell',
  'hidden @min-[1120px]:table-cell',
  'hidden @min-[1210px]:table-cell',
  'hidden @min-[1320px]:table-cell',
] as const;

/** At most this many time columns, so the widest tier is left for remarks. */
const MAX_TIME_COLUMNS = REVEAL_TIERS.length - 1;

interface TimeColumn {
  /** Short column heading, `flights` namespace */
  labelKey: string;
  /** Full name used as the heading tooltip, `flights` namespace */
  titleKey: string;
  minutes: (flight: Flight) => number;
}

/**
 * Candidate time columns in priority order — the first ones that any flight on
 * the current page actually uses get the narrowest reveal tiers.
 */
const TIME_COLUMNS: TimeColumn[] = [
  { labelKey: 'tablePic', titleKey: 'fields.picTime', minutes: (f) => f.picTime },
  { labelKey: 'tableNight', titleKey: 'fields.nightTime', minutes: (f) => f.nightTime },
  { labelKey: 'tableDual', titleKey: 'fields.dualTime', minutes: (f) => f.dualTime },
  { labelKey: 'tableIfr', titleKey: 'fields.ifrTime', minutes: (f) => f.ifrTime },
  { labelKey: 'tableXc', titleKey: 'fields.crossCountryTime', minutes: (f) => f.crossCountryTime },
  { labelKey: 'tableSic', titleKey: 'fields.sicTime', minutes: (f) => f.sicTime ?? 0 },
  { labelKey: 'tableDualGiven', titleKey: 'fields.dualGivenTime', minutes: (f) => f.dualGivenTime ?? 0 },
  { labelKey: 'tableMultiPilot', titleKey: 'fields.multiPilotTime', minutes: (f) => f.multiPilotTime ?? 0 },
  { labelKey: 'tableSolo', titleKey: 'fields.soloTime', minutes: (f) => f.soloTime },
  { labelKey: 'tableSim', titleKey: 'fields.simulatedFlightTime', minutes: (f) => f.simulatedFlightTime ?? 0 },
];

export interface ExtraFlightColumn extends TimeColumn {
  /** Tailwind classes that reveal this column once the table is wide enough */
  revealClass: string;
}

export interface ExtraFlightColumns {
  time: ExtraFlightColumn[];
  /** Reveal classes for the remarks column, or null when no flight has remarks */
  remarksRevealClass: string | null;
}

/**
 * Picks the optional columns for a page of flights: a column is only worth the
 * width if at least one flight on the page has a value for it, so a VFR-only
 * pilot never gets an empty IFR column and a student never gets an empty PIC
 * column.
 */
export function selectExtraFlightColumns(flights: Flight[]): ExtraFlightColumns {
  const time = TIME_COLUMNS
    .filter((col) => flights.some((f) => col.minutes(f) > 0))
    .slice(0, MAX_TIME_COLUMNS)
    .map((col, i) => ({ ...col, revealClass: REVEAL_TIERS[i] }));

  const hasRemarks = flights.some((f) => !!f.remarks?.trim());

  return {
    time,
    remarksRevealClass: hasRemarks ? REVEAL_TIERS[time.length] : null,
  };
}
