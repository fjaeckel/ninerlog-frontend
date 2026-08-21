/**
 * Fixture data for the screenshot harness, standing in for the API. Shapes
 * follow `src/api/schema.ts`; when an endpoint changes there, change it here
 * too. The clock is pinned: every date derives from TODAY, not `new Date()`.
 */

const TODAY = new Date('2026-08-16T10:00:00Z');
const iso = (d) => new Date(d).toISOString();
const shift = (days) => new Date(TODAY.getTime() + days * 86_400_000).toISOString();
const day = (days) => shift(days).slice(0, 10);

export const user = {
  id: 'u1',
  email: 'pilot@example.com',
  name: 'Alex Fischer',
  isAdmin: true,
  twoFactorEnabled: true,
  timeDisplayFormat: 'hm',
  dateFormat: 'DD.MM.YYYY',
  preferredLocale: 'en',
  recencyPerModel: true,
  recencyPerRegistration: true,
  flightListColumnMode: 'auto',
  createdAt: iso('2024-01-01'),
  updatedAt: iso('2026-01-01'),
};

const flight = (i, dep, arr, reg, type, minutes, offset) => ({
  id: `f${i}`,
  userId: 'u1',
  date: day(offset),
  aircraftReg: reg,
  aircraftType: type,
  departureIcao: dep,
  arrivalIcao: arr,
  departureTime: '09:15',
  arrivalTime: '10:45',
  totalTime: minutes,
  picTime: minutes,
  dualTime: 0,
  sicTime: 0,
  dualGivenTime: 0,
  nightTime: i % 3 === 0 ? 25 : 0,
  ifrTime: i % 4 === 0 ? 40 : 0,
  landingsDay: 1,
  landingsNight: i % 3 === 0 ? 1 : 0,
  allLandings: i % 3 === 0 ? 2 : 1,
  takeoffsDay: 1,
  takeoffsNight: i % 3 === 0 ? 1 : 0,
  simulatedFlightTime: 0,
  groundTrainingTime: 0,
  remarks: i % 2 === 0 ? 'Training flight, crosswind circuits' : null,
  instructorName: null,
  instructorComments: null,
  crewMembers: [],
  createdAt: iso('2026-01-01'),
  updatedAt: iso('2026-01-01'),
});

export const flights = [
  flight(1, 'EDDF', 'EDDH', 'D-EABC', 'C172', 95, -2),
  flight(2, 'EDDH', 'EDDF', 'D-EABC', 'C172', 88, -5),
  flight(3, 'EDMO', 'LOWI', 'D-EFGH', 'PA28', 145, -11),
  flight(4, 'LOWI', 'EDMO', 'D-EFGH', 'PA28', 152, -12),
  flight(5, 'EDDB', 'EDDB', 'D-EABC', 'C172', 60, -20),
];

export const aircraft = [
  {
    id: 'a1', userId: 'u1', registration: 'D-EABC', type: 'C172', make: 'Cessna', model: '172S Skyhawk',
    aircraftClass: 'SEP_LAND', isComplex: false, isHighPerformance: false, isTailwheel: false,
    defaultDepartureIcao: 'EDDF', defaultArrivalIcao: 'EDDF', isActive: true,
    notes: 'Club aircraft — book via the online calendar.',
    createdAt: iso('2024-02-01'), updatedAt: iso('2026-01-01'),
  },
  {
    id: 'a2', userId: 'u1', registration: 'D-EFGH', type: 'PA28', make: 'Piper', model: 'PA-28-181 Archer',
    aircraftClass: 'SEP_LAND', isComplex: true, isHighPerformance: true, isTailwheel: false,
    defaultDepartureIcao: 'EDMO', defaultArrivalIcao: null, isActive: true,
    notes: null, createdAt: iso('2024-02-01'), updatedAt: iso('2026-01-01'),
  },
  {
    id: 'a3', userId: 'u1', registration: 'D-MTOW', type: 'DR40', make: 'Robin', model: 'DR400-180',
    aircraftClass: 'SEP_LAND', isComplex: false, isHighPerformance: false, isTailwheel: true,
    defaultDepartureIcao: null, defaultArrivalIcao: null, isActive: false,
    notes: null, createdAt: iso('2024-02-01'), updatedAt: iso('2026-01-01'),
  },
];

export const aircraftStats = {
  data: [
    { registration: 'D-EABC', aircraftType: 'C172', totalFlights: 42, totalMinutes: 4520, landingsDay: 58, landingsNight: 6, lastFlightDate: day(-2), landingsLast90Days: 12, recencyLapsesOn: day(70) },
    { registration: 'D-EFGH', aircraftType: 'PA28', totalFlights: 18, totalMinutes: 2100, landingsDay: 24, landingsNight: 2, lastFlightDate: day(-11), landingsLast90Days: 2, recencyLapsesOn: null },
    { registration: 'D-MTOW', aircraftType: 'DR40', totalFlights: 6, totalMinutes: 480, landingsDay: 9, landingsNight: 0, lastFlightDate: day(-140), landingsLast90Days: 0, recencyLapsesOn: null },
  ],
  byType: [
    { aircraftType: 'C172', totalFlights: 42, totalMinutes: 4520, landingsDay: 58, landingsNight: 6, lastFlightDate: day(-2), landingsLast90Days: 12 },
    { aircraftType: 'PA28', totalFlights: 18, totalMinutes: 2100, landingsDay: 24, landingsNight: 2, lastFlightDate: day(-11), landingsLast90Days: 2 },
    { aircraftType: 'DR40', totalFlights: 6, totalMinutes: 480, landingsDay: 9, landingsNight: 0, lastFlightDate: day(-140), landingsLast90Days: 0 },
  ],
};

export const licenses = [
  {
    id: 'l1', userId: 'u1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)', licenseNumber: 'DE.FCL.12345',
    issueDate: '2019-06-14', issuingAuthority: 'LBA', requiresSeparateLogbook: false,
    createdAt: iso('2024-01-01'), updatedAt: iso('2026-01-01'),
  },
  {
    id: 'l2', userId: 'u1', regulatoryAuthority: 'FAA', licenseType: 'PPL', licenseNumber: 'US-4459102',
    issueDate: '2021-09-02', issuingAuthority: 'FAA', requiresSeparateLogbook: true,
    createdAt: iso('2024-01-01'), updatedAt: iso('2026-01-01'),
  },
];

export const classRatings = {
  l1: [
    { id: 'cr1', licenseId: 'l1', classType: 'SEP_LAND', issueDate: '2024-06-01', expiryDate: day(45), notes: null, createdAt: iso('2024-06-01'), updatedAt: iso('2026-01-01') },
    { id: 'cr2', licenseId: 'l1', classType: 'TMG', issueDate: '2023-03-01', expiryDate: day(-20), notes: null, createdAt: iso('2023-03-01'), updatedAt: iso('2026-01-01') },
  ],
  l2: [],
};

export const credentials = [
  { id: 'c1', userId: 'u1', credentialType: 'EASA_CLASS2_MEDICAL', credentialNumber: 'MED-88213', issueDate: '2025-11-02', expiryDate: day(18), issuingAuthority: 'AeMC Frankfurt', notes: null, createdAt: iso('2025-11-02'), updatedAt: iso('2026-01-01') },
  { id: 'c2', userId: 'u1', credentialType: 'RADIO_BZF2', credentialNumber: 'BZF-II-9921', issueDate: '2019-05-20', expiryDate: null, issuingAuthority: 'Bundesnetzagentur', notes: 'Lifetime validity.', createdAt: iso('2019-05-20'), updatedAt: iso('2026-01-01') },
  { id: 'c3', userId: 'u1', credentialType: 'LANG_ICAO_LEVEL4', credentialNumber: 'ELP-4', issueDate: '2022-02-11', expiryDate: day(-9), issuingAuthority: 'LBA', notes: null, createdAt: iso('2022-02-11'), updatedAt: iso('2026-01-01') },
];

export const statistics = {
  licenseId: 'l1', totalFlights: 66, totalMinutes: 7100, picMinutes: 5400, dualMinutes: 1700,
  nightMinutes: 320, ifrMinutes: 480, landingsDay: 91, landingsNight: 8,
  soloMinutes: 900, crossCountryMinutes: 3200,
};

export const currency = {
  ratings: [
    {
      classRatingId: 'cr1', classType: 'SEP_LAND', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
      status: 'expiring', expiryDate: day(45), windowOpensAt: day(-320), windowOpen: true,
      message: 'Revalidation window open — 6 h 20 m of 12 h flown.',
      ruleDescription: 'EASA FCL.740.A — 12 h, 12 take-offs and landings, 1 h training flight.',
      requirements: [
        { name: 'Total time', met: false, current: 380, required: 720, unit: 'minutes', message: '6h 20m / 12h 00m' },
        { name: 'PIC time', met: true, current: 380, required: 360, unit: 'minutes', message: '6h 20m / 6h 00m' },
        { name: 'Take-offs & landings', met: false, current: 8, required: 12, unit: 'landings', message: '8 / 12' },
        { name: 'Training flight', met: true, current: 1, required: 1, unit: 'flights', message: '1 / 1' },
      ],
    },
    {
      classRatingId: 'cr2', classType: 'TMG', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
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
      classType: 'SEP_LAND', regulatoryAuthority: 'FAA', dayStatus: 'current', nightStatus: 'expired',
      dayLandings: 5, nightLandings: 1, dayRequired: 3, nightRequired: 3, nightPrivilege: false,
      message: '§61.57(a) — day currency satisfied, night currency lapsed.',
      ruleDescription: '3 take-offs and landings in the preceding 90 days.',
      passengerPrivilege: { eligible: false, message: 'Night passenger carriage not permitted' },
    },
  ],
  flightReview: { lastCompleted: '2025-04-18', expiresOn: '2027-04-30', status: 'current', message: 'Flight review valid until April 2027.' },
};

export const adminStats = {
  totalUsers: 128, totalFlights: 9421, totalAircraft: 312, totalCredentials: 244,
  totalImports: 87, flightsThisMonth: 216, newUsersThisWeek: 6, lockedAccounts: 2, disabledAccounts: 1,
  importsByFormat: { FOREFLIGHT_CSV: 31, LOGTEN_CSV: 18, MYFLIGHTBOOK_CSV: 14,
    VEREINSFLIEGER_EXTENDED_CSV: 9, SKYDEMON_CSV: 7, CSV: 5, VEREINSFLIEGER_CSV: 3 },
  cloudBackupDestinations: { total: 34, byProvider: { s3: 18, webdav: 9, dropbox: 7 } },
};

export const adminConfig = {
  appVersion: 'v1.3.4',
  goVersion: 'go1.26.7',
  serverUptime: '12d 4h 18m',
  migrationVersion: 41,
  airportDatabaseSize: 29331,
  airportDatabaseUpdatedAt: shift(-1),
  registrationPrefixCount: 210,
  registrationPrefixesReviewed: '2026-08-17',
  corsOrigins: ['https://logbook.example.com'],
  rateLimitAuth: '10 req/min',
  rateLimitAdmin: '30 req/min',
  smtpConfigured: true,
  adminEmailConfigured: true,
  cloudBackupsConfigured: true,
  cloudBackupProviders: ['s3', 'sftp', 'webdav'],
  documentFilesEnabled: true,
  authMode: 'local',
  unverifiedCleanupEnabled: true,
  unverifiedReminderAfter: '24h0m0s',
  unverifiedRetention: '720h0m0s',
  emailSuppressedCount: 0,
  updateCheckEnabled: true,
  updateCheckInterval: '24h0m0s',
};

export const adminUpdate = {
  checkEnabled: true,
  updateAvailable: true,
  branch: 'main',
  lastCheckedAt: shift(-0.2),
  components: [
    {
      name: 'api',
      currentVersion: 'v1.3.4',
      currentCommit: '4f2c1ab',
      latestVersion: 'v1.3.5',
      state: 'update_available',
      channel: 'release',
      releaseUrl: 'https://github.com/fjaeckel/ninerlog-api/releases/tag/v1.3.5',
      publishedAt: shift(-2),
    },
    {
      name: 'frontend',
      currentVersion: 'latest',
      currentCommit: 'a1b2c3d',
      latestVersion: 'v1.3.2',
      state: 'update_available',
      channel: 'commit',
      behindBy: 7,
      compareUrl: 'https://github.com/fjaeckel/ninerlog-frontend/compare/a1b2c3d...main',
      releaseUrl: 'https://github.com/fjaeckel/ninerlog-frontend/releases/tag/v1.3.2',
      publishedAt: shift(-3),
    },
  ],
};

export const adminUsers = {
  data: [
    { id: 'u1', email: 'pilot@example.com', name: 'Alex Fischer', isAdmin: true, emailVerified: true, twoFactorEnabled: true, locked: false, disabled: false, flightCount: 66, aircraftCount: 3, createdAt: iso('2024-01-01'), lastLoginAt: iso('2026-08-15') },
    { id: 'u2', email: 'anna.mueller@example.com', name: 'Anna Müller', isAdmin: false, emailVerified: true, twoFactorEnabled: false, locked: false, disabled: false, flightCount: 214, aircraftCount: 5, createdAt: iso('2024-04-11'), lastLoginAt: iso('2026-08-14') },
    { id: 'u3', email: 'tom.becker@example.com', name: 'Tom Becker', isAdmin: false, emailVerified: false, twoFactorEnabled: false, locked: true, disabled: false, flightCount: 3, aircraftCount: 1, createdAt: iso('2026-07-30'), lastLoginAt: null },
  ],
  pagination: { page: 1, pageSize: 20, total: 3, totalPages: 1 },
};

export const contacts = [
  { id: 'p1', userId: 'u1', name: 'Anna Müller', email: 'anna@example.com', phone: '+49 170 1234567', notes: 'Instructor', createdAt: iso('2025-02-01'), updatedAt: iso('2026-01-01') },
  { id: 'p2', userId: 'u1', name: 'Tom Becker', email: null, phone: null, notes: null, createdAt: iso('2025-06-14'), updatedAt: iso('2026-01-01') },
];

export const trends = {
  trends: Array.from({ length: 12 }, (_, i) => ({
    month: `2026-${String(i + 1).padStart(2, '0')}`,
    totalMinutes: [320, 180, 410, 260, 520, 380, 610, 470, 0, 0, 0, 0][i],
    flights: [4, 2, 5, 3, 6, 4, 7, 5, 0, 0, 0, 0][i],
  })),
};

export const statsByClass = {
  byClass: [
    { class: 'SEP_LAND', minutes: 5800, flights: 52, landings: 74 },
    { class: 'TMG', minutes: 900, flights: 9, landings: 15 },
    { class: 'MEP_LAND', minutes: 400, flights: 5, landings: 10 },
  ],
};

const monthPoint = (month, flights, minutes, cumulative) => ({
  month, flights, totalMinutes: minutes,
  picMinutes: Math.round(minutes * 0.78), sicMinutes: 0,
  dualMinutes: Math.round(minutes * 0.22), dualGivenMinutes: 0,
  soloMinutes: Math.round(minutes * 0.12), nightMinutes: Math.round(minutes * 0.08),
  ifrMinutes: Math.round(minutes * 0.07),
  landingsDay: flights + 1, landingsNight: Math.round(flights / 3),
  distanceNm: minutes * 1.8, cumulativeMinutes: cumulative,
});

const bucket = (key, label, flights, minutes) => ({ key, label, flights, totalMinutes: minutes });

export const analytics = {
  range: { months: 0, allTime: true, from: '2019-06-14', to: day(0) },
  totals: {
    totalFlights: 66, totalMinutes: 7100, picMinutes: 5400, sicMinutes: 0, dualMinutes: 1700,
    dualGivenMinutes: 0, soloMinutes: 900, nightMinutes: 320, ifrMinutes: 480,
    actualInstrumentMinutes: 180, simulatedInstrumentMinutes: 300, crossCountryMinutes: 3200,
    multiPilotMinutes: 0, simulatedFlightMinutes: 240, groundTrainingMinutes: 120,
    landingsDay: 91, landingsNight: 8, takeoffsDay: 91, takeoffsNight: 8,
    approaches: 14, holds: 3, distanceNm: 12780, distinctRegistrations: 3, distinctTypes: 3,
    distinctAirports: 12, distinctCountries: 4,
    firstFlightDate: '2019-06-22', lastFlightDate: day(-2),
  },
  monthly: [
    monthPoint('2026-01', 4, 320, 5100), monthPoint('2026-02', 2, 180, 5280),
    monthPoint('2026-03', 5, 410, 5690), monthPoint('2026-04', 3, 260, 5950),
    monthPoint('2026-05', 6, 520, 6470), monthPoint('2026-06', 4, 380, 6850),
    monthPoint('2026-07', 7, 610, 7460), monthPoint('2026-08', 5, 470, 7930),
  ],
  yearly: [
    { year: 2024, flights: 18, totalMinutes: 2100, picMinutes: 1500, dualMinutes: 600, nightMinutes: 90, ifrMinutes: 120, landings: 26, distanceNm: 3600 },
    { year: 2025, flights: 22, totalMinutes: 2600, picMinutes: 2000, dualMinutes: 600, nightMinutes: 120, ifrMinutes: 180, landings: 31, distanceNm: 4700 },
    { year: 2026, flights: 26, totalMinutes: 2400, picMinutes: 1900, dualMinutes: 500, nightMinutes: 110, ifrMinutes: 180, landings: 34, distanceNm: 4480 },
  ],
  byAircraftType: [
    { label: 'C172', subLabel: 'Cessna 172S Skyhawk', flights: 42, totalMinutes: 4520, picMinutes: 3600, dualMinutes: 920, nightMinutes: 200, ifrMinutes: 280, landings: 64, distanceNm: 8100, firstFlightDate: '2024-02-14', lastFlightDate: day(-2) },
    { label: 'PA28', subLabel: 'Piper PA-28-181 Archer', flights: 18, totalMinutes: 2100, picMinutes: 1500, dualMinutes: 600, nightMinutes: 90, ifrMinutes: 160, landings: 26, distanceNm: 3900, firstFlightDate: '2024-08-03', lastFlightDate: day(-11) },
    { label: 'DR40', subLabel: 'Robin DR400-180', flights: 6, totalMinutes: 480, picMinutes: 300, dualMinutes: 180, nightMinutes: 30, ifrMinutes: 40, landings: 9, distanceNm: 780, firstFlightDate: '2025-04-19', lastFlightDate: day(-140) },
  ],
  byRegistration: [
    { label: 'D-EABC', subLabel: 'C172', flights: 42, totalMinutes: 4520, picMinutes: 3600, dualMinutes: 920, nightMinutes: 200, ifrMinutes: 280, landings: 64, distanceNm: 8100, firstFlightDate: '2024-02-14', lastFlightDate: day(-2) },
    { label: 'D-EFGH', subLabel: 'PA28', flights: 18, totalMinutes: 2100, picMinutes: 1500, dualMinutes: 600, nightMinutes: 90, ifrMinutes: 160, landings: 26, distanceNm: 3900, firstFlightDate: '2024-08-03', lastFlightDate: day(-11) },
    { label: 'D-MTOW', subLabel: 'DR40', flights: 6, totalMinutes: 480, picMinutes: 300, dualMinutes: 180, nightMinutes: 30, ifrMinutes: 40, landings: 9, distanceNm: 780, firstFlightDate: '2025-04-19', lastFlightDate: day(-140) },
  ],
  byClass: [
    { label: 'SEP_LAND', flights: 52, totalMinutes: 5800, picMinutes: 4600, dualMinutes: 1200, landings: 74 },
    { label: 'TMG', flights: 9, totalMinutes: 900, picMinutes: 600, dualMinutes: 300, landings: 15 },
    { label: 'MEP_LAND', flights: 5, totalMinutes: 400, picMinutes: 200, dualMinutes: 200, landings: 10 },
  ],
  byCategory: [
    { label: 'complex', flights: 18, totalMinutes: 2100, picMinutes: 1500, dualMinutes: 600, landings: 26 },
    { label: 'tailwheel', flights: 6, totalMinutes: 480, picMinutes: 300, dualMinutes: 180, landings: 9 },
  ],
  byAirport: [
    { icao: 'EDDF', name: 'Frankfurt am Main', country: 'DE', latitude: 50.033, longitude: 8.570, departures: 21, arrivals: 19, flights: 40 },
    { icao: 'EDDH', name: 'Hamburg', country: 'DE', latitude: 53.630, longitude: 9.988, departures: 9, arrivals: 11, flights: 20 },
    { icao: 'EDMO', name: 'Oberpfaffenhofen', country: 'DE', latitude: 48.081, longitude: 11.283, departures: 8, arrivals: 7, flights: 15 },
    { icao: 'LOWI', name: 'Innsbruck', country: 'AT', latitude: 47.260, longitude: 11.344, departures: 5, arrivals: 6, flights: 11 },
  ],
  byCountry: [
    { country: 'DE', airports: 6, flights: 58 },
    { country: 'AT', airports: 2, flights: 8 },
  ],
  byRoute: [
    { departureIcao: 'EDDF', arrivalIcao: 'EDDH', flights: 12, totalMinutes: 1140, distanceNm: 2100 },
    { departureIcao: 'EDMO', arrivalIcao: 'LOWI', flights: 6, totalMinutes: 870, distanceNm: 620 },
  ],
  byInstructor: [
    { name: 'Anna Müller', role: 'Instructor', flights: 14, totalMinutes: 1200, lastFlightDate: day(-30) },
  ],
  byCrew: [
    { name: 'Tom Becker', role: 'Passenger', flights: 8, totalMinutes: 620, lastFlightDate: day(-14) },
  ],
  approachTypes: [
    { type: 'ILS', count: 8 },
    { type: 'RNP', count: 4 },
    { type: 'VOR', count: 2 },
  ],
  dayOfWeek: [
    bucket(1, 'Mon', 6, 520), bucket(2, 'Tue', 9, 780), bucket(3, 'Wed', 8, 690),
    bucket(4, 'Thu', 7, 610), bucket(5, 'Fri', 11, 980), bucket(6, 'Sat', 16, 1900),
    bucket(7, 'Sun', 9, 1620),
  ],
  hourOfDay: Array.from({ length: 24 }, (_, h) =>
    bucket(h, String(h).padStart(2, '0'), h >= 8 && h <= 18 ? (h % 5) + 1 : 0, h >= 8 && h <= 18 ? ((h % 5) + 1) * 90 : 0)
  ),
  monthOfYear: Array.from({ length: 12 }, (_, m) =>
    bucket(m + 1, ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m], [4,2,5,3,6,4,7,5,6,4,3,2][m], [320,180,410,260,520,380,610,470,500,340,260,180][m])
  ),
  durationBuckets: [
    bucket('lt30', 'under 30m', 6, 140), bucket('30to60', '30–60m', 14, 640),
    bucket('1to2', '1–2h', 28, 2600), bucket('2to3', '2–3h', 12, 1800),
    bucket('3to5', '3–5h', 5, 1300), bucket('gt5', 'over 5h', 1, 620),
  ],
  records: {
    longestFlight: { id: 'f4', date: day(-12), aircraftReg: 'D-EFGH', aircraftType: 'PA28', departureIcao: 'LOWI', arrivalIcao: 'EDMO', totalMinutes: 152, distanceNm: 310 },
    longestDistanceFlight: { id: 'f3', date: day(-11), aircraftReg: 'D-EFGH', aircraftType: 'PA28', departureIcao: 'EDMO', arrivalIcao: 'LOWI', totalMinutes: 145, distanceNm: 310 },
    busiestDay: day(-2), busiestDayFlights: 3,
    busiestMonth: '2026-07', busiestMonthMinutes: 610,
    busiestYear: 2025, busiestYearMinutes: 2600,
    longestStreakMonths: 9, currentStreakMonths: 5, activeMonths: 26, daysSinceLastFlight: 2,
    farthestAirport: { icao: 'LOWI', name: 'Innsbruck', country: 'AT', latitude: 47.260, longitude: 11.344, departures: 5, arrivals: 6, flights: 11 },
    farthestAirportNm: 310, homeBase: 'EDDF',
  },
};

export const imports = {
  data: [
    { id: 'i1', fileName: 'foreflight-export-2026.csv', status: 'completed', totalRows: 214, importedRows: 214, skippedRows: 0, errorRows: 0, createdAt: iso('2026-06-02') },
    { id: 'i2', fileName: 'old-logbook.csv', status: 'partial', totalRows: 88, importedRows: 71, skippedRows: 12, errorRows: 5, createdAt: iso('2026-03-14') },
  ],
  pagination: { page: 1, pageSize: 10, total: 2, totalPages: 1 },
};

export const sessions = {
  sessions: [
    {
      id: 's1',
      deviceLabel: 'Chrome on macOS',
      ipAddress: '203.0.113.7',
      createdAt: shift(-2),
      lastUsedAt: shift(0),
      expiresAt: shift(5),
      current: true,
    },
    {
      id: 's2',
      deviceLabel: 'Safari on iPhone',
      ipAddress: '198.51.100.24',
      createdAt: shift(-9),
      lastUsedAt: shift(-1),
      expiresAt: shift(4),
      current: false,
    },
    {
      id: 's3',
      deviceLabel: 'NinerLog app on iOS',
      ipAddress: '198.51.100.24',
      createdAt: shift(-20),
      lastUsedAt: shift(-3),
      expiresAt: shift(2),
      current: false,
    },
  ],
  maxSessions: 5,
};

export const backupDestinations = [
  { id: 'b1', displayName: 'Hetzner Storage Box', provider: 'webdav', status: 'active', enabled: true, schedule: 'daily', lastRunAt: iso('2026-08-15'), createdAt: iso('2025-01-01'), updatedAt: iso('2026-01-01') },
];

export const importTemplates = {
  templates: [
  { id: "FOREFLIGHT_CSV", name: "ForeFlight", vendor: "ForeFlight (Boeing)", website: "https://foreflight.com", description: "ForeFlight Logbook export. Carries a separate Aircraft Table, so your fleet — make, model and class — is created alongside the flights.", confidence: "exact", regions: ["FAA", "EASA"], autoDetected: true, exportSteps: ["Open ForeFlight on iPad or iPhone and go to Logbook.", "Tap the gear icon, then Export Logbook.", "Mail the file to yourself and save the attached .csv.", "Upload that file here — the Aircraft Table is imported too."] },
  { id: "NINERLOG_CSV", name: "NinerLog", vendor: "NinerLog", website: "https://ninerlog.com", description: "A CSV written by NinerLog's own Export screen. Re-importing one round-trips cleanly, including instructor, approach and endorsement columns.", confidence: "exact", regions: ["EASA", "FAA"], autoDetected: true, exportSteps: ["Open Export in another NinerLog account or installation.", "Choose CSV and the Standard column layout.", "Upload the downloaded file here.", "To move an entire account — aircraft, licences and credentials as well as flights — use Restore JSON Backup instead."] },
  { id: "LOGTEN_CSV", name: "LogTen Pro", vendor: "Coradine Aviation", website: "https://logtenpro.com", description: "LogTen Pro flight export — the Dynamic Export column set and the field-key (flight_…) dialect. Times are H:MM or bare four-digit clock times.", confidence: "exact", regions: ["FAA", "EASA"], autoDetected: true, exportSteps: ["Open LogTen Pro on Mac or iPad.", "Go to Reports → Exporters and export your flights (Dynamic Export or Export Flights, tab or CSV).", "Save the file — a .txt from a tab export is fine.", "Upload it here."] },
  { id: "MYFLIGHTBOOK_CSV", name: "MyFlightbook", vendor: "MyFlightbook", website: "https://myflightbook.com", description: "MyFlightbook CSV export. It records the route as a single field rather than separate airports, so departure and arrival are taken from the first and last waypoint — a flight logged with an empty Route cannot be imported.", confidence: "exact", regions: ["FAA"], autoDetected: true, exportSteps: ["Sign in at myflightbook.com.", "Go to Logbook → Import/Export (or Profile → Download your logbook).", "Download the CSV of all flights.", "Upload it here."] },
  { id: "CAPZLOG_CSV", name: "capzlog.aero", vendor: "Aviaso / capzlog.aero", website: "https://capzlog.aero", description: "capzlog.aero flights report. Dates each flight by its off-block timestamp rather than a date column, and carries the Swiss mountain/glacier and rotary external-load columns alongside the standard EASA breakdown.", confidence: "exact", regions: ["EASA"], autoDetected: true, exportSteps: ["Sign in at capzlog.aero and open your Flights list.", "Apply any filter you want the export limited to (or none for everything).", "Choose Export and pick CSV rather than PDF.", "Upload the downloaded file here."] },
  { id: "FLYLOG_CSV", name: "FLYLOG.io", vendor: "FLYLOG.io", website: "https://www.flylog.io", description: "FLYLOG.io CSV export. Carries block and airborne times, the full EASA duration breakdown, and named crew per role.", confidence: "exact", regions: ["EASA"], autoDetected: true, exportSteps: ["Sign in at flylog.io and open your Logbook.", "Choose Export and select the CSV format.", "Upload the downloaded file here.", "If FLYLOG gave you an XLSX, save it as CSV first."] },
  { id: "WADER_CSV", name: "Wader", vendor: "Wader Aviation", website: "https://www.waderaviation.com", description: "Wader Pilot Logbook CSV export. Carries block, takeoff and landing times, the full EASA duration breakdown and up to four named crew. Rows Wader marks as previous experience or simulator sessions are imported as ordinary flights and are worth reviewing afterwards.", confidence: "exact", regions: ["EASA", "FAA"], autoDetected: true, exportSteps: ["Open Wader on your phone, or sign in at logbook.waderaviation.com.", "Open your logbook and choose Export.", "Pick CSV rather than PDF.", "Upload the downloaded file here."] },
  { id: "VEREINSFLIEGER_CSV", name: "Vereinsflieger", vendor: "Vereinsflieger.de", website: "https://vereinsflieger.de", description: "Vereinsflieger club flight list, standard export. Records take-off and landing times but no off-block/on-block pair, so the total is airborne time rather than block time — prefer the extended export if your club offers it. Carries no aircraft type and no night or instrument breakdown.", confidence: "exact", regions: ["EASA"], autoDetected: true, exportSteps: ["Sign in at vereinsflieger.de.", "Open Flugbetrieb → Flüge and filter to your own flights.", "Choose the extended CSV export if your club offers it — it adds off-block and on-block times, which is what a logbook should total. Either export is read here.", "Upload the downloaded file — the German column names are recognised."] },
  { id: "VEREINSFLIEGER_EXTENDED_CSV", name: "Vereinsflieger (extended export)", vendor: "Vereinsflieger.de", website: "https://vereinsflieger.de", description: "Vereinsflieger club flight list, extended export. Adds off-block and on-block times and the block time in minutes, so flights are totalled on block time as EASA FCL.050 expects. This is the export to use if your club offers it.", confidence: "exact", regions: ["EASA"], autoDetected: true, exportSteps: ["Sign in at vereinsflieger.de.", "Open Flugbetrieb → Flüge and filter to your own flights.", "Choose the extended CSV export — the one whose columns include Off-Block and On-Block.", "Upload the downloaded file — the German column names are recognised."] },
  { id: "SKYDEMON_CSV", name: "SkyDemon", vendor: "Divelements / SkyDemon", website: "https://www.skydemon.aero", description: "SkyDemon logbook export. It dates each flight by its departure and arrival timestamps rather than a date column, and records no total time — the total is derived from those two. Durations are whole minutes, and registrations are exported without their hyphen. Approach and hold detail is not exported at all.", confidence: "exact", regions: ["EASA"], autoDetected: true, exportSteps: ["Open SkyDemon on your tablet or PC and go to the Logbook.", "Choose Export and pick the CSV format.", "Upload the downloaded file here.", "Expect to fill in approach and hold detail afterwards — SkyDemon does not record it."] },
  { id: "EASA_CSV", name: "EASA logbook (AMC1 FCL.050)", vendor: "Any EASA-format logbook", website: "", description: "The standard European logbook column layout. Use this for any EU logbook app or spreadsheet whose columns follow AMC1 FCL.050, including NinerLog's own EASA CSV export.", confidence: "exact", regions: ["EASA"], autoDetected: true, exportSteps: ["Export from your current logbook in the EASA / FCL.050 column layout.", "If you keep a spreadsheet, save it as CSV with the EASA headings in row 1.", "Upload the file here."] },
  { id: "FAA_CSV", name: "FAA logbook layout", vendor: "Any FAA-format logbook", website: "", description: "The classic US paper-logbook column layout used by ASA and Jeppesen books and by NinerLog's own FAA CSV export.", confidence: "exact", regions: ["FAA"], autoDetected: true, exportSteps: ["Export from your current logbook in the FAA / ASA column layout.", "If you keep a spreadsheet, save it as CSV with the FAA headings in row 1.", "Upload the file here."] },
  { id: "CSV", name: "Other CSV / spreadsheet", vendor: "", website: "", description: "Any other CSV, tab- or semicolon-separated file. Columns are matched by name where possible and the rest is mapped by hand — nothing is imported until you have seen the preview.", confidence: "best-effort", regions: ["EASA", "FAA"], autoDetected: false, exportSteps: ["Export or save your logbook as CSV, with the column headings in row 1.", "Upload it here.", "Match each column to a NinerLog field on the next screen."] },
  ],
};

const EMPTY_PAGE = { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };

const ROUTES = {
  '/users/me': user,
  '/users/me/statistics': statistics,
  '/users/me/notifications': { emailOnCurrencyExpiry: true, emailOnCredentialExpiry: true, daysBeforeExpiry: 30 },
  '/users/me/notifications/history': EMPTY_PAGE,
  '/users/me/baseline': null,
  '/flights': { data: flights, pagination: { page: 1, pageSize: 25, total: flights.length, totalPages: 1 } },
  '/aircraft': { data: aircraft, pagination: { page: 1, pageSize: 100, total: aircraft.length, totalPages: 1 } },
  '/aircraft/stats': aircraftStats,
  '/licenses': licenses,
  '/credentials': credentials,
  '/contacts': contacts,
  '/currency': currency,
  '/currency/custom': [],
  '/reports/trends': trends,
  '/reports/stats-by-class': statsByClass,
  '/reports/routes': {
    routes: [
      { departureIcao: 'EDDF', arrivalIcao: 'EDDH', flightCount: 12, departureCoords: { lat: 50.033, lng: 8.570 }, arrivalCoords: { lat: 53.630, lng: 9.988 } },
      { departureIcao: 'EDMO', arrivalIcao: 'LOWI', flightCount: 6, departureCoords: { lat: 48.081, lng: 11.283 }, arrivalCoords: { lat: 47.260, lng: 11.344 } },
    ],
  },
  '/reports/airport-stats': [
    { icao: 'EDDF', name: 'Frankfurt am Main', latitude: 50.033, longitude: 8.570, totalFlights: 40, departures: 21, arrivals: 19 },
    { icao: 'EDDH', name: 'Hamburg', latitude: 53.630, longitude: 9.988, totalFlights: 20, departures: 9, arrivals: 11 },
    { icao: 'EDMO', name: 'Oberpfaffenhofen', latitude: 48.081, longitude: 11.283, totalFlights: 15, departures: 8, arrivals: 7 },
    { icao: 'LOWI', name: 'Innsbruck', latitude: 47.260, longitude: 11.344, totalFlights: 11, departures: 5, arrivals: 6 },
  ],
  '/reports/analytics': analytics,
  '/imports': imports,
  '/imports/templates': importTemplates,
  '/backups/destinations': backupDestinations,
  '/backups/providers': [{ id: 'webdav', name: 'WebDAV' }, { id: 's3', name: 'S3' }],
  '/admin/stats': adminStats,
  '/admin/users': adminUsers,
  '/admin/audit-log': EMPTY_PAGE,
  '/admin/config': adminConfig,
  '/admin/update': adminUpdate,
  '/admin/email/deliveries': EMPTY_PAGE,
  '/admin/email/suppressions': EMPTY_PAGE,
  '/announcements': { announcements: [], hints: [] },
  '/features': { signatures: true, backups: true, customCurrency: true },
  '/auth/providers': { providers: [] },
  '/auth/webauthn/credentials': [],
  '/auth/sessions': sessions,
  '/flight-sessions/current': null,
};

/**
 * The body to serve for an API path, or null when nothing matches (still
 * answered 200).
 */
export function bodyFor(pathname) {
  const path = pathname.replace(/^.*\/api\/v1/, '');
  if (path in ROUTES) return ROUTES[path];

  const classRatingsMatch = path.match(/^\/licenses\/([^/]+)\/class-ratings$/);
  if (classRatingsMatch) return classRatings[classRatingsMatch[1]] ?? [];
  if (/^\/licenses\/[^/]+\/currency$/.test(path)) return currency;
  if (/^\/licenses\/[^/]+\/statistics$/.test(path)) return statistics;
  if (/^\/flights\/[^/]+$/.test(path)) return flights[0];
  if (path.startsWith('/documents')) return EMPTY_PAGE;
  return null;
}
