import type { components } from '../api/schema';

type FlightRevision = components['schemas']['FlightRevision'];

/** Revision sources that are system changes rather than the pilot's own edits. */
export const SYSTEM_SOURCES: readonly FlightRevision['source'][] = ['recalc', 'aircraft_rename', 'import'];

export const isSystemRevision = (revision: Pick<FlightRevision, 'source'>) =>
  SYSTEM_SOURCES.includes(revision.source);

/** Flight fields whose label key in the `flights` namespace differs from `fields.<name>`. */
const LABEL_KEYS: Record<string, string> = {
  departureTime: 'fields.takeoffTime',
  arrivalTime: 'fields.landingTime',
  landingsDay: 'fields.dayLandings',
  landingsNight: 'fields.nightLandings',
  takeoffsDay: 'fields.dayTakeoffs',
  takeoffsNight: 'fields.nightTakeoffs',
  allLandings: 'fields.landings',
  approachesCount: 'fields.approaches',
};

/** Flight fields that have a `fields.<name>` label in the `flights` namespace. */
const PLAIN_LABEL_FIELDS = new Set([
  'date', 'aircraftReg', 'aircraftType', 'departureIcao', 'arrivalIcao', 'route', 'offBlockTime', 'onBlockTime',
  'totalTime', 'picTime', 'dualTime', 'nightTime', 'ifrTime', 'soloTime', 'crossCountryTime', 'sicTime',
  'picusTime', 'spicTime', 'examinerTime', 'reliefTime', 'dualGivenTime', 'multiPilotTime', 'simulatedFlightTime',
  'groundTrainingTime', 'actualInstrumentTime', 'simulatedInstrumentTime', 'landings', 'approaches', 'holds',
  'picName', 'instructorName', 'remarks', 'endorsements', 'fstdType', 'launchMethod', 'distance',
  'isFlightReview', 'isIpc', 'isProficiencyCheck', 'instructorComments',
]);

/** Flight fields holding a duration in minutes. */
export const DURATION_FIELDS = new Set([
  'totalTime', 'picTime', 'dualTime', 'nightTime', 'ifrTime', 'soloTime', 'crossCountryTime', 'sicTime',
  'picusTime', 'spicTime', 'examinerTime', 'reliefTime', 'dualGivenTime', 'multiPilotTime', 'simulatedFlightTime',
  'groundTrainingTime', 'actualInstrumentTime', 'simulatedInstrumentTime',
]);

/**
 * The i18n key (`flights` namespace, or `logbook:` prefixed) labelling a
 * revision field, or null when there is none and the raw name is shown.
 */
export function revisionFieldLabelKey(field: string): string | null {
  if (field === 'crewMembers') return 'logbook:history.crew';
  if (field in LABEL_KEYS) return LABEL_KEYS[field];
  if (PLAIN_LABEL_FIELDS.has(field)) return `fields.${field}`;
  return null;
}

export interface RevisionValueFormatters {
  duration: (minutes: number) => string;
  date: (value: string) => string;
  yes: string;
  no: string;
  unset: string;
}

const TIME_OF_DAY = /^(\d{2}:\d{2})(:\d{2})?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A revision's old or new value as display text. */
export function formatRevisionValue(field: string, value: unknown, fmt: RevisionValueFormatters): string {
  if (value === null || value === undefined || value === '') return fmt.unset;
  if (typeof value === 'boolean') return value ? fmt.yes : fmt.no;
  if (typeof value === 'number') return DURATION_FIELDS.has(field) ? fmt.duration(value) : String(value);
  if (typeof value === 'string') {
    if (DATE_ONLY.test(value)) return fmt.date(value);
    const time = value.match(TIME_OF_DAY);
    if (time) return time[1];
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return fmt.unset;
    return value
      .map((item) => {
        if (item && typeof item === 'object' && 'name' in item) {
          const { name, role } = item as { name?: unknown; role?: unknown };
          return role ? `${String(name)} (${String(role)})` : String(name);
        }
        return typeof item === 'object' ? JSON.stringify(item) : String(item);
      })
      .join(', ');
  }
  return JSON.stringify(value);
}
