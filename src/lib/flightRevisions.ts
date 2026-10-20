import type { components } from '../api/schema';
import { LAUNCH_METHOD_KEYS } from '../components/flights/flightTableColumns';

type Flight = components['schemas']['Flight'];
type FlightRevision = components['schemas']['FlightRevision'];

/** Revision sources that are system changes rather than the pilot's own edits. */
export const SYSTEM_SOURCES: readonly FlightRevision['source'][] = [
  'recalc',
  'aircraft_rename',
  'contact_rename',
  'import',
];

export const isSystemRevision = (revision: Pick<FlightRevision, 'source'>) =>
  SYSTEM_SOURCES.includes(revision.source);

/**
 * Label key for every Flight field: a `flights` namespace key, or a
 * `logbook:` prefixed one.
 */
export const FLIGHT_FIELD_LABEL_KEYS: Record<keyof Flight, string> = {
  id: 'logbook:history.fields.id',
  userId: 'logbook:history.fields.userId',
  date: 'fields.date',
  aircraftReg: 'fields.aircraftReg',
  aircraftType: 'fields.aircraftType',
  departureIcao: 'fields.departureIcao',
  arrivalIcao: 'fields.arrivalIcao',
  departureAirportName: 'logbook:history.fields.departureAirportName',
  arrivalAirportName: 'logbook:history.fields.arrivalAirportName',
  offBlockTime: 'fields.offBlockTime',
  onBlockTime: 'fields.onBlockTime',
  departureTime: 'fields.takeoffTime',
  arrivalTime: 'fields.landingTime',
  totalTime: 'fields.totalTime',
  isPic: 'fields.isPic',
  isDual: 'fields.isDual',
  picTime: 'fields.picTime',
  dualTime: 'fields.dualTime',
  nightTime: 'fields.nightTime',
  nightTimeOverride: 'logbook:history.fields.nightTimeOverride',
  ifrTime: 'fields.ifrTime',
  landingsDay: 'fields.dayLandings',
  landingsNight: 'fields.nightLandings',
  allLandings: 'fields.landings',
  takeoffsDay: 'fields.dayTakeoffs',
  takeoffsNight: 'fields.nightTakeoffs',
  route: 'fields.route',
  soloTime: 'fields.soloTime',
  crossCountryTime: 'fields.crossCountryTime',
  crossCountryTimeOverride: 'logbook:history.fields.crossCountryTimeOverride',
  takeoffsDayOverride: 'logbook:history.fields.takeoffsDayOverride',
  takeoffsNightOverride: 'logbook:history.fields.takeoffsNightOverride',
  landingsDayOverride: 'logbook:history.fields.landingsDayOverride',
  landingsNightOverride: 'logbook:history.fields.landingsNightOverride',
  sicTimeOverride: 'logbook:history.fields.sicTimeOverride',
  multiPilotTimeOverride: 'logbook:history.fields.multiPilotTimeOverride',
  distance: 'fields.distance',
  remarks: 'fields.remarks',
  instructorName: 'fields.instructorName',
  instructorComments: 'fields.instructorComments',
  sicTime: 'fields.sicTime',
  dualGivenTime: 'fields.dualGivenTime',
  simulatedFlightTime: 'fields.simulatedFlightTime',
  groundTrainingTime: 'fields.groundTrainingTime',
  actualInstrumentTime: 'fields.actualInstrumentTime',
  simulatedInstrumentTime: 'fields.simulatedInstrumentTime',
  holds: 'fields.holds',
  approachesCount: 'logbook:history.fields.approachesCount',
  isIpc: 'fields.isIpc',
  isFlightReview: 'fields.isFlightReview',
  isProficiencyCheck: 'fields.isProficiencyCheck',
  launchMethod: 'fields.launchMethod',
  picName: 'fields.picName',
  displayPicName: 'fields.picName',
  multiPilotTime: 'fields.multiPilotTime',
  picusTime: 'fields.picusTime',
  spicTime: 'fields.spicTime',
  examinerTime: 'fields.examinerTime',
  reliefTime: 'fields.reliefTime',
  isSimulator: 'simulatorEntry',
  isPassenger: 'passengerEntry',
  fstdType: 'fields.fstdType',
  approaches: 'fields.approaches',
  endorsements: 'fields.endorsements',
  crewMembers: 'logbook:history.crew',
  createdAt: 'logbook:history.fields.createdAt',
  updatedAt: 'logbook:history.fields.updatedAt',
  signatureId: 'logbook:history.fields.signatureId',
};

/** Label key for a field outside the Flight schema. */
export const OTHER_FIELD_LABEL_KEY = 'logbook:history.fields.other';

/** Flight fields holding a duration in minutes. */
export const DURATION_FIELDS = new Set([
  'totalTime', 'picTime', 'dualTime', 'nightTime', 'ifrTime', 'soloTime', 'crossCountryTime', 'sicTime',
  'picusTime', 'spicTime', 'examinerTime', 'reliefTime', 'dualGivenTime', 'multiPilotTime', 'simulatedFlightTime',
  'groundTrainingTime', 'actualInstrumentTime', 'simulatedInstrumentTime',
]);

/** The i18n key (`flights` namespace, or `logbook:` prefixed) labelling a revision field. */
export function revisionFieldLabelKey(field: string): string {
  return Object.prototype.hasOwnProperty.call(FLIGHT_FIELD_LABEL_KEYS, field)
    ? FLIGHT_FIELD_LABEL_KEYS[field as keyof Flight]
    : OTHER_FIELD_LABEL_KEY;
}

export interface RevisionValueFormatters {
  duration: (minutes: number) => string;
  date: (value: string) => string;
  /** Translates a `flights` namespace key, or a `logbook:` prefixed one. */
  label: (key: string, options?: Record<string, string>) => string;
  yes: string;
  no: string;
  unset: string;
}

const TIME_OF_DAY = /^(\d{2}:\d{2})(:\d{2})?$/;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const isObject = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const text = (value: unknown) => (value === null || value === undefined ? '' : String(value));

function approachTypeLabel(type: string, fmt: RevisionValueFormatters) {
  return fmt.label(`approachTypes.${type.replace('/', '_')}`, { defaultValue: type });
}

function crewText(item: Record<string, unknown>, fmt: RevisionValueFormatters) {
  const name = text(item.name);
  const role = text(item.role);
  return role ? `${name} (${fmt.label(`crewRoles.${role}`, { defaultValue: role })})` : name;
}

function approachText(item: Record<string, unknown>, fmt: RevisionValueFormatters) {
  const parts = [approachTypeLabel(text(item.type), fmt)];
  if (text(item.airport)) parts.push(fmt.label('logbook:history.approachAirport', { airport: text(item.airport) }));
  const head = parts.join(' ');
  return text(item.runway)
    ? `${head}, ${fmt.label('logbook:history.approachRunway', { runway: text(item.runway) })}`
    : head;
}

function arrayItemText(item: unknown, fmt: RevisionValueFormatters): string {
  if (isObject(item)) {
    if ('name' in item) return crewText(item, fmt);
    if ('type' in item) return approachText(item, fmt);
    return Object.values(item).map(text).filter(Boolean).join(' ');
  }
  return text(item);
}

/** A revision's old or new value as display text. */
export function formatRevisionValue(field: string, value: unknown, fmt: RevisionValueFormatters): string {
  if (value === null || value === undefined || value === '') return fmt.unset;
  if (typeof value === 'boolean') return value ? fmt.yes : fmt.no;
  if (typeof value === 'number') return DURATION_FIELDS.has(field) ? fmt.duration(value) : String(value);
  if (typeof value === 'string') {
    if (field === 'launchMethod') {
      if (value === 'null') return fmt.unset;
      const key = LAUNCH_METHOD_KEYS[value];
      return key ? fmt.label(`launchMethods.${key}`) : value;
    }
    if (DATE_ONLY.test(value)) return fmt.date(value);
    const time = value.match(TIME_OF_DAY);
    if (time) return time[1];
    return value;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return fmt.unset;
    return value.map((item) => arrayItemText(item, fmt)).join(field === 'approaches' ? '; ' : ', ');
  }
  if (isObject(value)) return arrayItemText(value, fmt);
  return String(value);
}
