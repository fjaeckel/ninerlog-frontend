/**
 * Story fixtures for marketing captures — a "famous women in aviation"
 * logbook. Amelia Earhart's account: her Vega, Electra and a borrowed Gipsy
 * Moth, flights retracing the record crossings, Neta Snook signing the
 * training flight, and a Ninety-Nines member roster on the admin console.
 *
 * Shapes follow `src/api/schema.ts`, same contract as `fixtures.mjs`. The
 * clock is pinned to TODAY; only the live Quick Log session derives from the
 * real clock, so its block timer reads minutes rather than days.
 */

import { importTemplates } from './fixtures.mjs';

const TODAY = new Date('2026-08-16T10:00:00Z');
const iso = (d) => new Date(d).toISOString();
const shift = (days) => new Date(TODAY.getTime() + days * 86_400_000).toISOString();
const day = (days) => shift(days).slice(0, 10);
const minutesAgo = (m) => new Date(Date.now() - m * 60_000).toISOString();

export const user = {
  id: 'u1',
  email: 'amelia@ninety-nines.example',
  name: 'Amelia Earhart',
  isAdmin: true,
  twoFactorEnabled: true,
  timeDisplayFormat: 'hm',
  dateFormat: 'MM/DD/YYYY',
  preferredLocale: 'en',
  recencyPerModel: true,
  recencyPerRegistration: true,
  flightListColumnMode: 'auto',
  createdAt: iso('2024-01-01'),
  updatedAt: iso('2026-01-01'),
};

const baseFlight = (i, offset) => ({
  id: `f${i}`,
  userId: 'u1',
  date: day(offset),
  offBlockTime: null,
  onBlockTime: null,
  isPic: false,
  isDual: false,
  soloTime: 0,
  crossCountryTime: 0,
  distance: 0,
  route: null,
  signatureId: null,
  sicTime: 0,
  dualTime: 0,
  dualGivenTime: 0,
  nightTime: 0,
  ifrTime: 0,
  landingsDay: 1,
  landingsNight: 0,
  allLandings: 1,
  takeoffsDay: 1,
  takeoffsNight: 0,
  simulatedFlightTime: 0,
  groundTrainingTime: 0,
  isSimulator: false,
  isPassenger: false,
  remarks: null,
  instructorName: null,
  instructorComments: null,
  crewMembers: [],
  createdAt: iso('2026-01-01'),
  updatedAt: iso('2026-01-01'),
});

export const flights = [
  {
    ...baseFlight(9, -1),
    aircraftReg: 'NC7952', aircraftType: 'VEGA',
    departureIcao: 'KOAK', arrivalIcao: 'KOAK',
    offBlockTime: '19:05', onBlockTime: '20:20',
    departureTime: '19:12', arrivalTime: '20:12',
    totalTime: 75, picTime: 75, isPic: true, nightTime: 40,
    landingsDay: 1, landingsNight: 2, allLandings: 3, takeoffsDay: 1, takeoffsNight: 2,
    remarks: 'Evening circuits over the bay — night current again.',
  },
  {
    ...baseFlight(1, -2),
    aircraftReg: 'NC7952', aircraftType: 'VEGA',
    departureIcao: 'CYYT', arrivalIcao: 'EGAE',
    offBlockTime: '19:12', onBlockTime: '10:08',
    departureTime: '19:20', arrivalTime: '09:59',
    totalTime: 896, picTime: 896, isPic: true, crossCountryTime: 896, distance: 1740,
    nightTime: 540, ifrTime: 300,
    remarks: 'Solo across the Atlantic — Harbour Grace to Culmore, 14 h 56 m.',
  },
  {
    ...baseFlight(6, -3),
    aircraftReg: '', aircraftType: 'L10E',
    departureIcao: null, arrivalIcao: null,
    departureTime: null, arrivalTime: null,
    totalTime: 0, picTime: 0,
    landingsDay: 0, landingsNight: 0, allLandings: 0, takeoffsDay: 0, takeoffsNight: 0,
    isSimulator: true, simulatedFlightTime: 120, fstdType: 'FNPT II',
    remarks: 'Instrument practice — partial panel, holds over the beacon.',
  },
  {
    ...baseFlight(2, -6),
    aircraftReg: 'NC7952', aircraftType: 'VEGA',
    departureIcao: 'PHNL', arrivalIcao: 'KOAK',
    offBlockTime: '17:45', onBlockTime: '11:32',
    departureTime: '17:55', arrivalTime: '11:20',
    totalTime: 1067, picTime: 1067, isPic: true, crossCountryTime: 1067, distance: 2090,
    nightTime: 620, ifrTime: 240,
    remarks: 'Honolulu to Oakland, solo — 2,408 miles of open Pacific.',
  },
  {
    ...baseFlight(7, -9),
    aircraftReg: 'NX4204', aircraftType: 'F7B',
    departureIcao: 'CYYT', arrivalIcao: 'EGFH',
    offBlockTime: '11:40', onBlockTime: '08:25',
    departureTime: '11:51', arrivalTime: '08:10',
    totalTime: 1245, picTime: 0, isPassenger: true, distance: 1900,
    remarks: '"Friendship" across the Atlantic as a passenger — next time I fly it myself.',
  },
  {
    ...baseFlight(3, -12),
    aircraftReg: 'NR16020', aircraftType: 'L10E',
    departureIcao: 'KOAK', arrivalIcao: 'KBUR',
    offBlockTime: '09:15', onBlockTime: '11:37',
    departureTime: '09:24', arrivalTime: '11:29',
    totalTime: 142, picTime: 142, isPic: true, crossCountryTime: 142, distance: 283, ifrTime: 40,
    crewMembers: [{ id: 'cm1', flightId: 'f3', contactId: 'p3', name: 'Ruth Nichols', role: 'SIC' }],
    remarks: 'Electra shakedown out of Oakland — long-range tanks full.',
  },
  {
    ...baseFlight(4, -16),
    aircraftReg: 'NC7952', aircraftType: 'VEGA',
    departureIcao: 'KCPM', arrivalIcao: 'KCPM',
    offBlockTime: '14:00', onBlockTime: '15:05',
    departureTime: '14:06', arrivalTime: '14:58',
    totalTime: 65, picTime: 0, dualTime: 65, isDual: true, signatureId: 'sig1',
    landingsDay: 6, allLandings: 6, takeoffsDay: 6,
    instructorName: 'Neta Snook',
    instructorComments: 'Crosswind work coming along nicely. Solo soon.',
    crewMembers: [{ id: 'cm2', flightId: 'f4', contactId: 'p1', name: 'Neta Snook', role: 'Instructor' }],
    remarks: 'Circuits at Kinner Field with Neta — crosswind practice.',
  },
  {
    ...baseFlight(5, -20),
    aircraftReg: 'G-AAAH', aircraftType: 'DH60',
    departureIcao: 'EGKK', arrivalIcao: 'LOWW',
    offBlockTime: '06:30', onBlockTime: '16:00',
    departureTime: '06:38', arrivalTime: '15:49',
    totalTime: 570, picTime: 570, isPic: true, crossCountryTime: 570, distance: 640, ifrTime: 60,
    remarks: "First leg of Amy's England–Australia route — Croydon to Vienna in Jason.",
  },
  {
    ...baseFlight(8, -30),
    aircraftReg: 'NC7952', aircraftType: 'VEGA',
    departureIcao: 'MMMX', arrivalIcao: 'KEWR',
    offBlockTime: '06:10', onBlockTime: '20:29',
    departureTime: '06:18', arrivalTime: '20:20',
    totalTime: 859, picTime: 859, isPic: true, crossCountryTime: 859, distance: 1820,
    nightTime: 200, ifrTime: 180,
    remarks: 'Mexico City to Newark nonstop — 14 h 19 m.',
  },
];

export const aircraft = [
  {
    id: 'a1', userId: 'u1', registration: 'NC7952', type: 'VEGA', make: 'Lockheed', model: 'Vega 5B',
    aircraftClass: 'SEP_LAND', isComplex: false, isHighPerformance: true, isTailwheel: true, isMultiPilot: false,
    defaultDepartureIcao: 'KOAK', defaultArrivalIcao: 'KOAK', isActive: true,
    notes: '"Little Red Bus" — the Atlantic solo Vega.',
    createdAt: iso('2024-02-01'), updatedAt: iso('2026-01-01'),
  },
  {
    id: 'a2', userId: 'u1', registration: 'NR16020', type: 'L10E', make: 'Lockheed', model: 'Model 10-E Electra',
    aircraftClass: 'MEP_LAND', isComplex: true, isHighPerformance: true, isTailwheel: true, isMultiPilot: true,
    defaultDepartureIcao: 'KOAK', defaultArrivalIcao: null, isActive: true,
    notes: 'Round-the-world Electra — long-range tanks fitted.',
    createdAt: iso('2024-02-01'), updatedAt: iso('2026-01-01'),
  },
  {
    id: 'a3', userId: 'u1', registration: 'G-AAAH', type: 'DH60', make: 'de Havilland', model: 'DH.60G Gipsy Moth',
    aircraftClass: 'SEP_LAND', isComplex: false, isHighPerformance: false, isTailwheel: true, isMultiPilot: false,
    defaultDepartureIcao: null, defaultArrivalIcao: null, isActive: true,
    notes: '"Jason" — on loan from Amy Johnson.',
    createdAt: iso('2024-02-01'), updatedAt: iso('2026-01-01'),
  },
  {
    id: 'a4', userId: 'u1', registration: 'N1538C', type: 'C180', make: 'Cessna', model: '180 Skywagon',
    aircraftClass: 'SEP_LAND', isComplex: false, isHighPerformance: false, isTailwheel: true, isMultiPilot: false,
    defaultDepartureIcao: null, defaultArrivalIcao: null, isActive: false,
    notes: '"Spirit of Columbus" — Jerrie\'s round-the-world 180.',
    createdAt: iso('2024-02-01'), updatedAt: iso('2026-01-01'),
  },
];

export const aircraftStats = {
  data: [
    { registration: 'NC7952', aircraftType: 'VEGA', totalFlights: 148, totalMinutes: 41230, landingsDay: 210, landingsNight: 34, lastFlightDate: day(-1), landingsLast90Days: 14, recencyLapsesOn: day(74) },
    { registration: 'NR16020', aircraftType: 'L10E', totalFlights: 36, totalMinutes: 12840, landingsDay: 41, landingsNight: 5, lastFlightDate: day(-12), landingsLast90Days: 3, recencyLapsesOn: day(78) },
    { registration: 'G-AAAH', aircraftType: 'DH60', totalFlights: 22, totalMinutes: 4980, landingsDay: 31, landingsNight: 0, lastFlightDate: day(-20), landingsLast90Days: 2, recencyLapsesOn: null },
    { registration: 'N1538C', aircraftType: 'C180', totalFlights: 8, totalMinutes: 2410, landingsDay: 12, landingsNight: 1, lastFlightDate: day(-190), landingsLast90Days: 0, recencyLapsesOn: null },
  ],
  byType: [
    { aircraftType: 'VEGA', totalFlights: 148, totalMinutes: 41230, landingsDay: 210, landingsNight: 34, lastFlightDate: day(-1), landingsLast90Days: 14 },
    { aircraftType: 'L10E', totalFlights: 36, totalMinutes: 12840, landingsDay: 41, landingsNight: 5, lastFlightDate: day(-12), landingsLast90Days: 3 },
    { aircraftType: 'DH60', totalFlights: 22, totalMinutes: 4980, landingsDay: 31, landingsNight: 0, lastFlightDate: day(-20), landingsLast90Days: 2 },
    { aircraftType: 'C180', totalFlights: 8, totalMinutes: 2410, landingsDay: 12, landingsNight: 1, lastFlightDate: day(-190), landingsLast90Days: 0 },
  ],
};

export const licenses = [
  {
    id: 'l1', userId: 'u1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)', licenseNumber: 'FAI-6017',
    issueDate: '2021-05-16', issuingAuthority: 'LBA', requiresSeparateLogbook: false,
    createdAt: iso('2024-01-01'), updatedAt: iso('2026-01-01'),
  },
  {
    id: 'l2', userId: 'u1', regulatoryAuthority: 'FAA', licenseType: 'PPL', licenseNumber: '6017',
    issueDate: '2022-05-15', issuingAuthority: 'FAA', requiresSeparateLogbook: true,
    createdAt: iso('2024-01-01'), updatedAt: iso('2026-01-01'),
  },
];

export const classRatings = {
  l1: [
    { id: 'cr1', licenseId: 'l1', classType: 'SEP_LAND', issueDate: '2024-06-01', expiryDate: day(45), notes: null, createdAt: iso('2024-06-01'), updatedAt: iso('2026-01-01') },
    { id: 'cr2', licenseId: 'l1', classType: 'MEP_LAND', issueDate: '2025-03-01', expiryDate: day(210), notes: 'The Electra.', createdAt: iso('2025-03-01'), updatedAt: iso('2026-01-01') },
    { id: 'cr3', licenseId: 'l1', classType: 'TMG', issueDate: '2023-03-01', expiryDate: day(-20), notes: null, createdAt: iso('2023-03-01'), updatedAt: iso('2026-01-01') },
  ],
  l2: [],
};

export const credentials = [
  { id: 'c1', userId: 'u1', credentialType: 'EASA_CLASS2_MEDICAL', credentialNumber: 'MED-1929-99', issueDate: '2025-11-02', expiryDate: day(18), issuingAuthority: 'AeMC Oakland', notes: null, createdAt: iso('2025-11-02'), updatedAt: iso('2026-01-01') },
  { id: 'c2', userId: 'u1', credentialType: 'RADIO_BZF2', credentialNumber: 'BZF-II-6017', issueDate: '2019-05-20', expiryDate: null, issuingAuthority: 'Bundesnetzagentur', notes: 'Lifetime validity.', createdAt: iso('2019-05-20'), updatedAt: iso('2026-01-01') },
  { id: 'c3', userId: 'u1', credentialType: 'LANG_ICAO_LEVEL4', credentialNumber: 'ELP-4', issueDate: '2022-02-11', expiryDate: day(-9), issuingAuthority: 'LBA', notes: null, createdAt: iso('2022-02-11'), updatedAt: iso('2026-01-01') },
];

export const statistics = {
  licenseId: 'l1', totalFlights: 312, totalMinutes: 87480, picMinutes: 71400, dualMinutes: 5200,
  nightMinutes: 9600, ifrMinutes: 6400, landingsDay: 641, landingsNight: 58,
  soloMinutes: 22800, crossCountryMinutes: 51600,
};

export const currency = {
  ratings: [
    {
      classRatingId: 'cr1', classType: 'SEP_LAND', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
      status: 'expiring', expiryDate: day(45), windowOpensAt: day(-320), windowOpen: true,
      message: 'Revalidation window open — 9 h 40 m of 12 h flown.',
      ruleDescription: 'EASA FCL.740.A — 12 h, 12 take-offs and landings, 1 h training flight.',
      requirements: [
        { name: 'Total time', met: false, current: 580, required: 720, unit: 'minutes', message: '9h 40m / 12h 00m' },
        { name: 'PIC time', met: true, current: 520, required: 360, unit: 'minutes', message: '8h 40m / 6h 00m' },
        { name: 'Take-offs & landings', met: false, current: 9, required: 12, unit: 'landings', message: '9 / 12' },
        { name: 'Training flight', met: true, current: 1, required: 1, unit: 'flights', message: '1 / 1' },
      ],
    },
    {
      classRatingId: 'cr2', classType: 'MEP_LAND', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
      status: 'current', expiryDate: day(210),
      message: 'Rating current until next spring.',
      ruleDescription: 'EASA FCL.740 — revalidation by proficiency check.',
      requirements: [
        { name: 'Proficiency check', met: true, current: 1, required: 1, unit: 'checks', message: '1 / 1' },
      ],
    },
    {
      classRatingId: 'cr3', classType: 'TMG', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
      status: 'expired', expiryDate: day(-20),
      message: 'Rating expired — renewal requires a proficiency check.',
      requirements: [
        { name: 'Total time', met: false, current: 60, required: 720, unit: 'minutes', message: '1h 00m / 12h 00m' },
        { name: 'Take-offs & landings', met: false, current: 2, required: 12, unit: 'landings', message: '2 / 12' },
      ],
    },
  ],
  passengerCurrency: [
    {
      classType: 'SEP_LAND', regulatoryAuthority: 'FAA', dayStatus: 'current', nightStatus: 'current',
      dayLandings: 6, nightLandings: 3, dayRequired: 3, nightRequired: 3, nightPrivilege: true,
      message: '§61.57(a) — day and night passenger currency satisfied.',
      ruleDescription: '3 take-offs and landings in the preceding 90 days.',
      passengerPrivilege: { eligible: true, message: 'Passenger carriage permitted, day and night' },
    },
  ],
  flightReview: { lastCompleted: '2025-04-18', expiresOn: '2027-04-30', status: 'current', message: 'Flight review valid until April 2027.' },
};

const evaluation = (status, windowLabel, requirements, expiresOn) => ({
  status, windowLabel, requirements, ...(expiresOn ? { expiresOn } : {}), evaluatedAt: shift(0),
});

export const customCurrencyRules = [
  {
    rule: {
      id: 'ccr1', userId: 'u1', name: 'Night landings', emoji: '🌙',
      description: 'Stay night-current for passengers.',
      definition: {
        window: { amount: 90, unit: 'days' },
        filters: [{ field: 'has_night', op: 'is_true' }],
        requirements: [{ metric: 'night_landings', min: 3, label: 'Night landings' }],
      },
      enabled: true, notify: true, isShared: true, shareToken: 'ninety-nines-night',
      createdAt: iso('2025-06-01'), updatedAt: iso('2026-01-01'),
    },
    evaluation: evaluation('current', 'last 90 days',
      [{ name: 'Night landings', met: true, current: 5, required: 3, unit: 'landings', message: '5 / 3' }], day(41)),
  },
  {
    rule: {
      id: 'ccr2', userId: 'u1', name: 'Bendix ready', emoji: '🏁',
      description: 'Ten cross-country PIC hours a quarter — race trim.',
      definition: {
        window: { amount: 90, unit: 'days' },
        filters: [{ field: 'is_pic', op: 'is_true' }, { field: 'is_cross_country', op: 'is_true' }],
        requirements: [{ metric: 'cross_country_time', min: 10, unit: 'hours', label: 'Cross-country PIC' }],
      },
      enabled: true, notify: false, isShared: false,
      createdAt: iso('2025-09-01'), updatedAt: iso('2026-01-01'),
    },
    evaluation: evaluation('expiring', 'last 90 days',
      [{ name: 'Cross-country PIC', met: true, current: 684, required: 600, unit: 'minutes', message: '11h 24m / 10h 00m' }], day(12)),
  },
  {
    rule: {
      id: 'ccr3', userId: 'u1', name: 'Ocean legs', emoji: '🌊',
      description: 'One long overwater leg a year.',
      definition: {
        window: { amount: 12, unit: 'months' },
        filters: [{ field: 'is_cross_country', op: 'is_true' }],
        requirements: [{ metric: 'flights', min: 1, label: 'Overwater legs' }],
      },
      enabled: false, notify: false, isShared: false,
      createdAt: iso('2025-02-01'), updatedAt: iso('2026-01-01'),
    },
    evaluation: evaluation('unknown', 'last 12 months',
      [{ name: 'Overwater legs', met: false, current: 0, required: 1, unit: 'flights', message: 'Rule paused' }]),
  },
];

export const signatures = {
  f4: [
    {
      id: 'sig1', flightId: 'f4', method: 'live', status: 'completed',
      instructorName: 'Neta Snook', instructorCredentialNumber: 'CFI 1921-0099',
      instructorEmail: null, emailSentAt: null, emailSendCount: 0,
      tokenExpiresAt: null, signedAt: shift(-15), voidedAt: null, voidedReason: null,
      createdAt: shift(-16), updatedAt: shift(-15),
    },
  ],
};

export const adminStats = {
  totalUsers: 99, totalFlights: 24867, totalSimulatorSessions: 486, totalPassengerFlights: 132,
  totalAircraft: 61, totalContacts: 517, activeSessions: 41, totalCredentials: 244,
  totalImports: 87, flightsThisMonth: 412, newUsersThisWeek: 3, lockedAccounts: 0, disabledAccounts: 0,
  importsByFormat: { FOREFLIGHT_CSV: 31, LOGTEN_CSV: 18, MYFLIGHTBOOK_CSV: 14,
    VEREINSFLIEGER_EXTENDED_CSV: 9, SKYDEMON_CSV: 7, CSV: 5, VEREINSFLIEGER_CSV: 3 },
  cloudBackupDestinations: { total: 34, byProvider: { s3: 18, webdav: 9, sftp: 7 } },
};

const member = (id, name, email, extra = {}) => ({
  id, email, name, isAdmin: false, emailVerified: true, twoFactorEnabled: false,
  locked: false, disabled: false, flightCount: 0, aircraftCount: 1,
  createdAt: iso('2024-04-11'), lastLoginAt: shift(-1), ...extra,
});

export const adminUsers = {
  data: [
    member('u1', 'Amelia Earhart', 'amelia@ninety-nines.example', { isAdmin: true, twoFactorEnabled: true, flightCount: 312, aircraftCount: 4, createdAt: iso('2024-01-01'), lastLoginAt: shift(0) }),
    member('u2', 'Bessie Coleman', 'bessie@ninety-nines.example', { flightCount: 214, twoFactorEnabled: true, aircraftCount: 2 }),
    member('u3', 'Amy Johnson', 'amy@ninety-nines.example', { flightCount: 189, aircraftCount: 1, lastLoginAt: shift(-2) }),
    member('u4', 'Jacqueline Cochran', 'jackie@ninety-nines.example', { flightCount: 267, twoFactorEnabled: true, lastLoginAt: shift(-3) }),
    member('u5', 'Beryl Markham', 'beryl@ninety-nines.example', { flightCount: 158, lastLoginAt: shift(-5) }),
    member('u6', 'Jerrie Mock', 'jerrie@ninety-nines.example', { flightCount: 96, lastLoginAt: shift(-4) }),
    member('u7', 'Louise Thaden', 'louise@ninety-nines.example', { flightCount: 173, twoFactorEnabled: true, lastLoginAt: shift(-1) }),
    member('u8', 'Wally Funk', 'wally@ninety-nines.example', { emailVerified: false, flightCount: 0, aircraftCount: 0, createdAt: shift(-2), lastLoginAt: null }),
  ],
  pagination: { page: 1, pageSize: 20, total: 99, totalPages: 5 },
};

export const contacts = [
  { id: 'p1', userId: 'u1', name: 'Neta Snook', email: 'neta@ninety-nines.example', phone: '+1 562 555 1921', notes: 'My instructor at Kinner Field.', createdAt: iso('2025-02-01'), updatedAt: iso('2026-01-01') },
  { id: 'p2', userId: 'u1', name: 'Louise Thaden', email: 'louise@ninety-nines.example', phone: null, notes: 'Bendix 1936 — beat us all.', createdAt: iso('2025-06-14'), updatedAt: iso('2026-01-01') },
  { id: 'p3', userId: 'u1', name: 'Ruth Nichols', email: null, phone: null, notes: 'Record-holder, rival, friend.', createdAt: iso('2025-06-14'), updatedAt: iso('2026-01-01') },
  { id: 'p4', userId: 'u1', name: 'Amy Johnson', email: 'amy@ninety-nines.example', phone: null, notes: "Jason's owner. England to Australia, solo.", createdAt: iso('2025-08-01'), updatedAt: iso('2026-01-01') },
];

export const trends = {
  trends: Array.from({ length: 12 }, (_, i) => ({
    month: `2026-${String(i + 1).padStart(2, '0')}`,
    totalMinutes: [820, 640, 1210, 960, 1520, 1180, 1610, 1470, 0, 0, 0, 0][i],
    flights: [6, 4, 8, 6, 9, 7, 10, 8, 0, 0, 0, 0][i],
  })),
};

export const statsByClass = {
  byClass: [
    { class: 'SEP_LAND', minutes: 64800, flights: 248, landings: 540 },
    { class: 'MEP_LAND', minutes: 18200, flights: 48, landings: 96 },
    { class: 'TMG', minutes: 4480, flights: 16, landings: 63 },
  ],
};

const monthPoint = (month, flightCount, minutes, cumulative) => ({
  month, flights: flightCount, totalMinutes: minutes,
  picMinutes: Math.round(minutes * 0.82), sicMinutes: 0,
  dualMinutes: Math.round(minutes * 0.06), dualGivenMinutes: 0,
  soloMinutes: Math.round(minutes * 0.3), nightMinutes: Math.round(minutes * 0.11),
  ifrMinutes: Math.round(minutes * 0.07),
  landingsDay: flightCount + 2, landingsNight: Math.round(flightCount / 3),
  distanceNm: minutes * 1.9, cumulativeMinutes: cumulative,
});

const bucket = (key, label, flightCount, minutes) => ({ key, label, flights: flightCount, totalMinutes: minutes });

export const analytics = {
  range: { months: 0, allTime: true, from: '2021-05-16', to: day(0) },
  totals: {
    totalFlights: 312, totalMinutes: 87480, picMinutes: 71400, sicMinutes: 0, dualMinutes: 5200,
    dualGivenMinutes: 0, soloMinutes: 22800, nightMinutes: 9600, ifrMinutes: 6400,
    actualInstrumentMinutes: 2400, simulatedInstrumentMinutes: 4000, crossCountryMinutes: 51600,
    multiPilotMinutes: 3800, simulatedFlightMinutes: 1440, groundTrainingMinutes: 300,
    landingsDay: 641, landingsNight: 58, takeoffsDay: 641, takeoffsNight: 58,
    approaches: 42, holds: 11, distanceNm: 96400, distinctRegistrations: 4, distinctTypes: 4,
    distinctAirports: 38, distinctCountries: 11,
    firstFlightDate: '2021-06-22', lastFlightDate: day(-1),
  },
  monthly: [
    monthPoint('2026-01', 6, 820, 79300), monthPoint('2026-02', 4, 640, 79940),
    monthPoint('2026-03', 8, 1210, 81150), monthPoint('2026-04', 6, 960, 82110),
    monthPoint('2026-05', 9, 1520, 83630), monthPoint('2026-06', 7, 1180, 84810),
    monthPoint('2026-07', 10, 1610, 86420), monthPoint('2026-08', 8, 1060, 87480),
  ],
  yearly: [
    { year: 2024, flights: 84, totalMinutes: 21400, picMinutes: 17200, dualMinutes: 1600, nightMinutes: 2200, ifrMinutes: 1500, landings: 168, distanceNm: 24100 },
    { year: 2025, flights: 102, totalMinutes: 28900, picMinutes: 24400, dualMinutes: 1400, nightMinutes: 3300, ifrMinutes: 2200, landings: 204, distanceNm: 33600 },
    { year: 2026, flights: 58, totalMinutes: 9000, picMinutes: 7600, dualMinutes: 800, nightMinutes: 1100, ifrMinutes: 900, landings: 121, distanceNm: 12900 },
  ],
  byAircraftType: [
    { label: 'VEGA', subLabel: 'Lockheed Vega 5B', flights: 148, totalMinutes: 41230, picMinutes: 38900, dualMinutes: 1200, nightMinutes: 6200, ifrMinutes: 3400, landings: 244, distanceNm: 51200, firstFlightDate: '2024-02-14', lastFlightDate: day(-1) },
    { label: 'L10E', subLabel: 'Lockheed Model 10-E Electra', flights: 36, totalMinutes: 12840, picMinutes: 11400, dualMinutes: 600, nightMinutes: 1600, ifrMinutes: 1800, landings: 46, distanceNm: 16800, firstFlightDate: '2025-03-03', lastFlightDate: day(-12) },
    { label: 'DH60', subLabel: 'de Havilland DH.60G Gipsy Moth', flights: 22, totalMinutes: 4980, picMinutes: 4600, dualMinutes: 200, nightMinutes: 0, ifrMinutes: 120, landings: 31, distanceNm: 5400, firstFlightDate: '2025-04-19', lastFlightDate: day(-20) },
    { label: 'C180', subLabel: 'Cessna 180 Skywagon', flights: 8, totalMinutes: 2410, picMinutes: 2200, dualMinutes: 0, nightMinutes: 300, ifrMinutes: 200, landings: 13, distanceNm: 3900, firstFlightDate: '2025-09-12', lastFlightDate: day(-190) },
  ],
  byRegistration: [
    { label: 'NC7952', subLabel: 'VEGA', flights: 148, totalMinutes: 41230, picMinutes: 38900, dualMinutes: 1200, nightMinutes: 6200, ifrMinutes: 3400, landings: 244, distanceNm: 51200, firstFlightDate: '2024-02-14', lastFlightDate: day(-1) },
    { label: 'NR16020', subLabel: 'L10E', flights: 36, totalMinutes: 12840, picMinutes: 11400, dualMinutes: 600, nightMinutes: 1600, ifrMinutes: 1800, landings: 46, distanceNm: 16800, firstFlightDate: '2025-03-03', lastFlightDate: day(-12) },
    { label: 'G-AAAH', subLabel: 'DH60', flights: 22, totalMinutes: 4980, picMinutes: 4600, dualMinutes: 200, nightMinutes: 0, ifrMinutes: 120, landings: 31, distanceNm: 5400, firstFlightDate: '2025-04-19', lastFlightDate: day(-20) },
    { label: 'N1538C', subLabel: 'C180', flights: 8, totalMinutes: 2410, picMinutes: 2200, dualMinutes: 0, nightMinutes: 300, ifrMinutes: 200, landings: 13, distanceNm: 3900, firstFlightDate: '2025-09-12', lastFlightDate: day(-190) },
  ],
  byClass: [
    { label: 'SEP_LAND', flights: 248, totalMinutes: 64800, picMinutes: 58200, dualMinutes: 3600, landings: 540 },
    { label: 'MEP_LAND', flights: 48, totalMinutes: 18200, picMinutes: 15800, dualMinutes: 1200, landings: 96 },
    { label: 'TMG', flights: 16, totalMinutes: 4480, picMinutes: 3900, dualMinutes: 400, landings: 63 },
  ],
  byCategory: [
    { label: 'complex', flights: 48, totalMinutes: 18200, picMinutes: 15800, dualMinutes: 1200, landings: 96 },
    { label: 'tailwheel', flights: 214, totalMinutes: 61460, picMinutes: 56900, dualMinutes: 2000, landings: 334 },
  ],
  byAirport: [
    { icao: 'KOAK', name: 'Oakland', country: 'US', latitude: 37.721, longitude: -122.221, departures: 62, arrivals: 58, flights: 120 },
    { icao: 'KEWR', name: 'Newark Liberty', country: 'US', latitude: 40.692, longitude: -74.169, departures: 11, arrivals: 14, flights: 25 },
    { icao: 'CYYT', name: "St. John's", country: 'CA', latitude: 47.619, longitude: -52.752, departures: 8, arrivals: 6, flights: 14 },
    { icao: 'EGAE', name: 'City of Derry', country: 'GB', latitude: 55.043, longitude: -7.161, departures: 3, arrivals: 5, flights: 8 },
    { icao: 'PHNL', name: 'Honolulu', country: 'US', latitude: 21.319, longitude: -157.922, departures: 4, arrivals: 3, flights: 7 },
    { icao: 'MMMX', name: 'Mexico City', country: 'MX', latitude: 19.436, longitude: -99.072, departures: 3, arrivals: 2, flights: 5 },
    { icao: 'EGKK', name: 'London Gatwick', country: 'GB', latitude: 51.148, longitude: -0.190, departures: 4, arrivals: 3, flights: 7 },
  ],
  byCountry: [
    { country: 'US', airports: 14, flights: 226 },
    { country: 'GB', airports: 6, flights: 34 },
    { country: 'CA', airports: 3, flights: 16 },
    { country: 'MX', airports: 2, flights: 8 },
    { country: 'AT', airports: 1, flights: 4 },
  ],
  byRoute: [
    { departureIcao: 'CYYT', arrivalIcao: 'EGAE', flights: 3, totalMinutes: 2688, distanceNm: 1740 },
    { departureIcao: 'PHNL', arrivalIcao: 'KOAK', flights: 2, totalMinutes: 2134, distanceNm: 2090 },
    { departureIcao: 'MMMX', arrivalIcao: 'KEWR', flights: 2, totalMinutes: 1718, distanceNm: 1820 },
    { departureIcao: 'KOAK', arrivalIcao: 'KBUR', flights: 14, totalMinutes: 1988, distanceNm: 283 },
  ],
  byInstructor: [
    { name: 'Neta Snook', role: 'Instructor', flights: 20, totalMinutes: 1300, lastFlightDate: day(-16) },
  ],
  byCrew: [
    { name: 'Ruth Nichols', role: 'SIC', flights: 9, totalMinutes: 1240, lastFlightDate: day(-12) },
    { name: 'Louise Thaden', role: 'Passenger', flights: 4, totalMinutes: 380, lastFlightDate: day(-40) },
  ],
  approachTypes: [
    { type: 'ILS', count: 22 },
    { type: 'RNAV/GPS', count: 12 },
    { type: 'VOR', count: 6 },
    { type: 'NDB', count: 2 },
  ],
  dayOfWeek: [
    bucket(1, 'Mon', 28, 6200), bucket(2, 'Tue', 34, 8100), bucket(3, 'Wed', 38, 9400),
    bucket(4, 'Thu', 36, 8800), bucket(5, 'Fri', 44, 12200), bucket(6, 'Sat', 78, 26900),
    bucket(7, 'Sun', 54, 15880),
  ],
  hourOfDay: Array.from({ length: 24 }, (_, h) =>
    bucket(h, String(h).padStart(2, '0'), h >= 6 && h <= 19 ? ((h * 3) % 7) + 2 : 0, h >= 6 && h <= 19 ? (((h * 3) % 7) + 2) * 110 : 0)
  ),
  monthOfYear: Array.from({ length: 12 }, (_, m) =>
    bucket(m + 1, ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m], [18,14,24,22,30,28,36,32,28,24,18,14][m], [4900,3800,6600,6100,8400,7900,10200,9100,7900,6800,5000,3900][m])
  ),
  durationBuckets: [
    bucket('lt30', 'under 30m', 22, 520), bucket('30to60', '30–60m', 64, 3040),
    bucket('1to2', '1–2h', 128, 11600), bucket('2to3', '2–3h', 56, 8300),
    bucket('3to5', '3–5h', 28, 7200), bucket('gt5', 'over 5h', 14, 12400),
  ],
  records: {
    longestFlight: { id: 'f2', date: day(-6), aircraftReg: 'NC7952', aircraftType: 'VEGA', departureIcao: 'PHNL', arrivalIcao: 'KOAK', totalMinutes: 1067, distanceNm: 2090 },
    longestDistanceFlight: { id: 'f2', date: day(-6), aircraftReg: 'NC7952', aircraftType: 'VEGA', departureIcao: 'PHNL', arrivalIcao: 'KOAK', totalMinutes: 1067, distanceNm: 2090 },
    busiestDay: day(-2), busiestDayFlights: 3,
    busiestMonth: '2026-07', busiestMonthMinutes: 1610,
    busiestYear: 2025, busiestYearMinutes: 28900,
    longestStreakMonths: 19, currentStreakMonths: 8, activeMonths: 27, daysSinceLastFlight: 1,
    farthestAirport: { icao: 'PHNL', name: 'Honolulu', country: 'US', latitude: 21.319, longitude: -157.922, departures: 4, arrivals: 3, flights: 7 },
    farthestAirportNm: 2090, homeBase: 'KOAK',
  },
};

export const imports = {
  data: [
    { id: 'i1', fileName: 'paper-logbook-volume-1.csv', status: 'completed', totalRows: 214, importedRows: 214, skippedRows: 0, errorRows: 0, createdAt: iso('2026-06-02') },
    { id: 'i2', fileName: 'foreflight-export-2026.csv', status: 'partial', totalRows: 88, importedRows: 71, skippedRows: 12, errorRows: 5, createdAt: iso('2026-03-14') },
  ],
  pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
};

export const sessions = {
  sessions: [
    { id: 's1', deviceLabel: 'Chrome on macOS', ipAddress: '203.0.113.7', createdAt: shift(-2), lastUsedAt: shift(0), expiresAt: shift(5), current: true },
    { id: 's2', deviceLabel: 'Safari on iPhone', ipAddress: '198.51.100.24', createdAt: shift(-9), lastUsedAt: shift(-1), expiresAt: shift(4), current: false },
    { id: 's3', deviceLabel: 'Firefox on Windows', ipAddress: '198.51.100.61', createdAt: shift(-20), lastUsedAt: shift(-3), expiresAt: shift(2), current: false },
  ],
  maxSessions: 5,
};

export const webauthnCredentials = [
  { id: 'wk1', label: 'MacBook Touch ID', transports: ['internal'], aaguid: 'adce0002-35bc-c60a-648b-0b25f1f05503', createdAt: iso('2025-10-02'), lastUsedAt: shift(0) },
  { id: 'wk2', label: 'YubiKey 5C', transports: ['usb', 'nfc'], aaguid: 'cb69481e-8ff7-4039-93ec-0a2729a154a8', createdAt: iso('2025-11-20'), lastUsedAt: shift(-6) },
];

export const backupDestinations = [
  { id: 'b1', displayName: 'Ninety-Nines Storage Box', provider: 'webdav', status: 'active', enabled: true, schedule: 'daily', scheduleHourUtc: 3, retentionCount: 30, credentialHint: '…k9al', lastRunAt: shift(-1), lastSuccessAt: shift(-1), createdAt: iso('2025-01-01'), updatedAt: iso('2026-01-01') },
];

export const baseline = {
  id: 'bl1', userId: 'u1',
  baselineDate: '2024-01-01',
  totalFlights: 154, totalMinutes: 43180, picMinutes: 36400, sicMinutes: 0,
  dualMinutes: 2400, dualGivenMinutes: 0, multiPilotMinutes: 1200,
  nightMinutes: 4800, ifrMinutes: 3100, soloMinutes: 12800, crossCountryMinutes: 26800,
  landingsDay: 348, landingsNight: 31,
  notes: 'Closing totals of the paper logbook, carried forward.',
  createdAt: iso('2024-01-01'), updatedAt: iso('2024-01-01'),
};

/**
 * The open Quick Log session, mid-flight: off block and takeoff tapped,
 * landing pending. Times come from the real clock so the block timer runs.
 */
export const flightSession = {
  id: 'fs1', userId: 'u1', status: 'open',
  aircraftReg: 'NC7952', departureIcao: 'KOAK', arrivalIcao: null,
  offBlockAt: minutesAgo(47), takeoffAt: minutesAgo(43), landingAt: null, onBlockAt: null,
  flightId: null, createdAt: minutesAgo(47), updatedAt: minutesAgo(43),
};

const EMPTY_PAGE = { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };

const ROUTES = {
  '/users/me': user,
  '/users/me/statistics': statistics,
  '/users/me/notifications': { emailOnCurrencyExpiry: true, emailOnCredentialExpiry: true, daysBeforeExpiry: 30 },
  '/users/me/notifications/history': EMPTY_PAGE,
  '/users/me/baseline': baseline,
  '/aircraft/stats': aircraftStats,
  '/licenses': licenses,
  '/credentials': credentials,
  '/contacts': contacts,
  '/currency': currency,
  '/custom-currency': customCurrencyRules,
  '/reports/trends': trends,
  '/reports/stats-by-class': statsByClass,
  '/reports/routes': {
    routes: [
      { departureIcao: 'CYYT', arrivalIcao: 'EGAE', flightCount: 3, departureCoords: { lat: 47.619, lng: -52.752 }, arrivalCoords: { lat: 55.043, lng: -7.161 } },
      { departureIcao: 'PHNL', arrivalIcao: 'KOAK', flightCount: 2, departureCoords: { lat: 21.319, lng: -157.922 }, arrivalCoords: { lat: 37.721, lng: -122.221 } },
      { departureIcao: 'MMMX', arrivalIcao: 'KEWR', flightCount: 2, departureCoords: { lat: 19.436, lng: -99.072 }, arrivalCoords: { lat: 40.692, lng: -74.169 } },
      { departureIcao: 'KOAK', arrivalIcao: 'KBUR', flightCount: 14, departureCoords: { lat: 37.721, lng: -122.221 }, arrivalCoords: { lat: 34.201, lng: -118.359 } },
      { departureIcao: 'EGKK', arrivalIcao: 'LOWW', flightCount: 1, departureCoords: { lat: 51.148, lng: -0.190 }, arrivalCoords: { lat: 48.110, lng: 16.570 } },
    ],
  },
  '/reports/airport-stats': [
    { icao: 'KOAK', name: 'Oakland', latitude: 37.721, longitude: -122.221, totalFlights: 120, departures: 62, arrivals: 58 },
    { icao: 'KEWR', name: 'Newark Liberty', latitude: 40.692, longitude: -74.169, totalFlights: 25, departures: 11, arrivals: 14 },
    { icao: 'CYYT', name: "St. John's", latitude: 47.619, longitude: -52.752, totalFlights: 14, departures: 8, arrivals: 6 },
    { icao: 'EGAE', name: 'City of Derry', latitude: 55.043, longitude: -7.161, totalFlights: 8, departures: 3, arrivals: 5 },
    { icao: 'PHNL', name: 'Honolulu', latitude: 21.319, longitude: -157.922, totalFlights: 7, departures: 4, arrivals: 3 },
    { icao: 'MMMX', name: 'Mexico City', latitude: 19.436, longitude: -99.072, totalFlights: 5, departures: 3, arrivals: 2 },
    { icao: 'EGKK', name: 'London Gatwick', latitude: 51.148, longitude: -0.190, totalFlights: 7, departures: 4, arrivals: 3 },
  ],
  '/reports/analytics': analytics,
  '/imports': imports,
  '/imports/templates': importTemplates,
  '/backups/destinations': backupDestinations,
  '/backups/providers': [{ id: 's3', name: 'S3' }, { id: 'sftp', name: 'SFTP' }, { id: 'webdav', name: 'WebDAV' }],
  '/admin/stats': adminStats,
  '/admin/users': adminUsers,
  '/admin/audit-log': EMPTY_PAGE,
  '/admin/email/deliveries': EMPTY_PAGE,
  '/admin/email/suppressions': EMPTY_PAGE,
  '/announcements': { announcements: [], hints: [] },
  '/features': { signatures: true, backups: true, customCurrency: true },
  '/auth/providers': { providers: [] },
  '/auth/webauthn/credentials': webauthnCredentials,
  '/auth/sessions': sessions,
  '/flight-sessions/current': flightSession,
  '/custom-currency/preview': customCurrencyRules[0].evaluation,
};

const flightMatches = (f, q) =>
  [f.aircraftReg, f.aircraftType, f.departureIcao, f.arrivalIcao, f.remarks, f.instructorName]
    .some((v) => v && v.toLowerCase().includes(q));

/**
 * The body for an API path, or null when nothing matches. `search` (a
 * URLSearchParams) filters the flight list so a `?q=` capture shows real
 * results.
 */
export function bodyFor(pathname, search = new URLSearchParams()) {
  const path = pathname.replace(/^.*\/api\/v1/, '');

  if (path === '/flights') {
    const q = (search.get('q') || search.get('search') || '').toLowerCase();
    const data = q ? flights.filter((f) => flightMatches(f, q)) : flights;
    return { data, pagination: { page: 1, pageSize: 25, total: data.length, totalPages: 1 } };
  }
  if (path === '/aircraft') {
    return { data: aircraft, pagination: { page: 1, pageSize: 100, total: aircraft.length, totalPages: 1 } };
  }
  if (path in ROUTES) return ROUTES[path];

  const classRatingsMatch = path.match(/^\/licenses\/([^/]+)\/class-ratings$/);
  if (classRatingsMatch) return classRatings[classRatingsMatch[1]] ?? [];
  if (/^\/licenses\/[^/]+\/currency$/.test(path)) return currency;
  if (/^\/licenses\/[^/]+\/statistics$/.test(path)) return statistics;
  const signaturesMatch = path.match(/^\/flights\/([^/]+)\/signatures$/);
  if (signaturesMatch) return signatures[signaturesMatch[1]] ?? [];
  const flightMatch = path.match(/^\/flights\/([^/]+)$/);
  if (flightMatch) return flights.find((f) => f.id === flightMatch[1]) ?? flights[0];
  if (path.startsWith('/documents')) return EMPTY_PAGE;
  return null;
}
