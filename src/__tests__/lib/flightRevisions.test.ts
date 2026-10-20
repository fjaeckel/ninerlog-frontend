import { describe, it, expect } from 'vitest';
import i18n from '../../i18n';
import type { components } from '../../api/schema';
import {
  formatRevisionValue,
  isSystemRevision,
  revisionFieldLabelKey,
  type RevisionValueFormatters,
} from '../../lib/flightRevisions';
import { LAUNCH_METHOD_KEYS } from '../../components/flights/flightTableColumns';

type Flight = components['schemas']['Flight'];
type RevisionSource = components['schemas']['FlightRevision']['source'];
type ApproachType = components['schemas']['ApproachType'];
type CrewRole = components['schemas']['CrewRole'];
type LaunchMethod = Exclude<NonNullable<Flight['launchMethod']>, 'null'>;

/** Every field of the Flight schema; tsc fails when one is missing or unknown. */
const ALL_FLIGHT_FIELDS = {
  id: true, userId: true, date: true, aircraftReg: true, aircraftType: true, departureIcao: true,
  arrivalIcao: true, departureAirportName: true, arrivalAirportName: true, displayPicName: true, offBlockTime: true, onBlockTime: true, departureTime: true, arrivalTime: true,
  totalTime: true, isPic: true, isDual: true, picTime: true, dualTime: true, nightTime: true,
  nightTimeOverride: true, ifrTime: true, landingsDay: true, landingsNight: true, allLandings: true,
  takeoffsDay: true, takeoffsNight: true, route: true, soloTime: true, crossCountryTime: true,
  crossCountryTimeOverride: true, takeoffsDayOverride: true, takeoffsNightOverride: true,
  landingsDayOverride: true, landingsNightOverride: true, sicTimeOverride: true, multiPilotTimeOverride: true,
  distance: true, remarks: true, instructorName: true, instructorComments: true, sicTime: true,
  dualGivenTime: true, simulatedFlightTime: true, groundTrainingTime: true, actualInstrumentTime: true,
  simulatedInstrumentTime: true, holds: true, approachesCount: true, isIpc: true, isFlightReview: true,
  isProficiencyCheck: true, launchMethod: true, launches: true, launchesOverride: true, isOutlanding: true,
  isTowFlight: true, releaseHeightM: true, warnings: true, picName: true, multiPilotTime: true, picusTime: true,
  spicTime: true, examinerTime: true, reliefTime: true, isSimulator: true, isPassenger: true, fstdType: true,
  approaches: true, endorsements: true, crewMembers: true, createdAt: true, updatedAt: true, signatureId: true,
} satisfies Record<keyof Flight, true>;

const SOURCES = { user_edit: true, recalc: true, aircraft_rename: true, contact_rename: true, import: true, unknown: true } satisfies Record<RevisionSource, true>;
const APPROACH_TYPES = {
  ILS: true, LOC: true, VOR: true, 'RNAV/GPS': true, NDB: true, LDA: true, SDF: true, PAR: true, ASR: true,
  Visual: true, Circling: true, Other: true, Unknown: true,
} satisfies Record<ApproachType, true>;
const CREW_ROLES = {
  PIC: true, SIC: true, Instructor: true, Student: true, Passenger: true, SafetyPilot: true, Examiner: true,
} satisfies Record<CrewRole, true>;
const LAUNCH_METHODS = { winch: true, aerotow: true, 'self-launch': true, car: true, bungee: true } satisfies Record<LaunchMethod, true>;

const LANGUAGES = ['en', 'de'] as const;

const resolve = (key: string, lng: string) => i18n.getFixedT(lng, 'flights')(key);
const hasKey = (key: string, lng: string) => i18n.exists(key, { lng, ns: 'flights', fallbackLng: false });

/** Formatters that translate through the real English resources. */
const fmtFor = (lng: string): RevisionValueFormatters => ({
  duration: (m: number) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`,
  date: (d: string) => `D(${d})`,
  label: (key, options) => i18n.getFixedT(lng, 'flights')(key, options),
  yes: 'Yes',
  no: 'No',
  unset: '—',
});
const fmt = fmtFor('en');

describe('flightRevisions', () => {
  describe.each(LANGUAGES)('labels in %s', (lng) => {
    it.each(Object.keys(ALL_FLIGHT_FIELDS))('labels the Flight field %s', (field) => {
      const key = revisionFieldLabelKey(field);
      expect(hasKey(key, lng), `${key} missing in ${lng}`).toBe(true);
      expect(resolve(key, lng)).not.toBe(field);
    });

    it('labels every revision source', () => {
      for (const source of Object.keys(SOURCES)) {
        expect(hasKey(`logbook:source.${source}`, lng), source).toBe(true);
      }
    });

    it('labels every approach type, crew role and launch method', () => {
      for (const type of Object.keys(APPROACH_TYPES)) {
        expect(hasKey(`approachTypes.${type.replace('/', '_')}`, lng), type).toBe(true);
      }
      for (const role of Object.keys(CREW_ROLES)) expect(hasKey(`crewRoles.${role}`, lng), role).toBe(true);
      for (const method of Object.keys(LAUNCH_METHODS)) {
        expect(hasKey(`launchMethods.${LAUNCH_METHOD_KEYS[method]}`, lng), method).toBe(true);
      }
    });
  });

  it('labels a field outside the Flight schema generically', () => {
    expect(resolve(revisionFieldLabelKey('someNewField'), 'en')).toBe('Other detail');
    expect(resolve(revisionFieldLabelKey('toString'), 'en')).toBe('Other detail');
  });

  it('labels fields from the flights namespace where one exists', () => {
    expect(revisionFieldLabelKey('totalTime')).toBe('fields.totalTime');
    expect(revisionFieldLabelKey('landingsNight')).toBe('fields.nightLandings');
    expect(revisionFieldLabelKey('crewMembers')).toBe('logbook:history.crew');
    expect(resolve(revisionFieldLabelKey('nightTimeOverride'), 'en')).toBe('Night time set by hand');
    expect(resolve(revisionFieldLabelKey('isSimulator'), 'de')).toBe('Simulatorsitzung');
  });

  it('formats values by type', () => {
    expect(formatRevisionValue('totalTime', 95, fmt)).toBe('1:35');
    expect(formatRevisionValue('landingsDay', 2, fmt)).toBe('2');
    expect(formatRevisionValue('date', '2026-08-14', fmt)).toBe('D(2026-08-14)');
    expect(formatRevisionValue('onBlockTime', '10:45:00', fmt)).toBe('10:45');
    expect(formatRevisionValue('isIpc', true, fmt)).toBe('Yes');
    expect(formatRevisionValue('nightTimeOverride', false, fmt)).toBe('No');
    expect(formatRevisionValue('remarks', null, fmt)).toBe('—');
    expect(formatRevisionValue('remarks', '', fmt)).toBe('—');
    expect(formatRevisionValue('crewMembers', [], fmt)).toBe('—');
  });

  it('renders enum values with their localised labels', () => {
    expect(formatRevisionValue('launchMethod', 'self-launch', fmt)).toBe('Self-Launch');
    expect(formatRevisionValue('launchMethod', 'winch', fmtFor('de'))).toBe('Windenstart');
    expect(formatRevisionValue('launchMethod', 'null', fmt)).toBe('—');
    expect(
      formatRevisionValue('crewMembers', [{ name: 'Amelia', role: 'SafetyPilot' }, { name: 'Bessie' }], fmt)
    ).toBe('Amelia (Safety Pilot), Bessie');
    expect(
      formatRevisionValue(
        'approaches',
        [
          { type: 'RNAV/GPS', airport: 'EDDF', runway: '25C' },
          { type: 'Visual', airport: null, runway: null },
        ],
        fmt
      )
    ).toBe('RNAV/GPS at EDDF, runway 25C; Visual');
    expect(formatRevisionValue('approaches', [{ type: 'ILS', airport: 'LSZH', runway: '14' }], fmtFor('de'))).toBe(
      'ILS in LSZH, Piste 14'
    );
  });

  it('never shows raw JSON for an object value', () => {
    expect(formatRevisionValue('other', { a: 'x', b: 2 }, fmt)).toBe('x 2');
  });

  it('classifies system sources', () => {
    expect(isSystemRevision({ source: 'recalc' })).toBe(true);
    expect(isSystemRevision({ source: 'aircraft_rename' })).toBe(true);
    expect(isSystemRevision({ source: 'contact_rename' })).toBe(true);
    expect(isSystemRevision({ source: 'import' })).toBe(true);
    expect(isSystemRevision({ source: 'user_edit' })).toBe(false);
    expect(isSystemRevision({ source: 'unknown' })).toBe(false);
  });
});
