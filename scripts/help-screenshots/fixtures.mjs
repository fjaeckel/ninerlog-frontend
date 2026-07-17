/**
 * Realistic fixture data for the Help Base screenshot pipeline (see generate.mjs).
 * Dev-tooling only — never imported by the app itself.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
const today = new Date();
const isoDate = (d) => d.toISOString().slice(0, 10);
const plusDays = (n) => isoDate(new Date(today.getTime() + n * DAY_MS));

export const USER_ID = 'usr-1001';

export const user = {
  id: USER_ID,
  email: 'demo.pilot@ninerlog.app',
  name: 'Alex Morgan',
  twoFactorEnabled: true,
  isAdmin: false,
  timeDisplayFormat: 'hm',
  dateFormat: 'YYYY-MM-DD',
  decimalSeparator: 'dot',
  preferredLocale: 'en',
  createdAt: '2024-01-10T08:00:00.000Z',
  updatedAt: '2026-07-01T08:00:00.000Z',
};

export const aircraft = [
  {
    id: 'ac-1', userId: USER_ID, registration: 'D-EABC', type: 'C172', make: 'Cessna', model: '172SP',
    isComplex: false, isHighPerformance: false, isTailwheel: false, aircraftClass: 'SEP_LAND',
    notes: null, isActive: true, createdAt: '2024-02-01T10:00:00Z', updatedAt: '2024-02-01T10:00:00Z',
  },
  {
    id: 'ac-2', userId: USER_ID, registration: 'D-GXYZ', type: 'PA34', make: 'Piper', model: 'Seneca II',
    isComplex: true, isHighPerformance: true, isTailwheel: false, aircraftClass: 'MEP_LAND',
    notes: null, isActive: true, createdAt: '2024-03-15T10:00:00Z', updatedAt: '2024-03-15T10:00:00Z',
  },
  {
    id: 'ac-3', userId: USER_ID, registration: 'N12345', type: 'DA42', make: 'Diamond', model: 'DA42 Twin Star',
    isComplex: true, isHighPerformance: false, isTailwheel: false, aircraftClass: 'MEP_LAND',
    notes: null, isActive: true, createdAt: '2024-05-20T10:00:00Z', updatedAt: '2024-05-20T10:00:00Z',
  },
];

// The real API returns several backend-computed fields that the frontend's
// hand-maintained `Flight` type (src/types/api.ts) doesn't declare but the
// detail page reads directly (soloTime, crossCountryTime, takeoffsDay/Night,
// distance, offBlock/onBlockTime, isPic/isDual, instrument breakdown). This
// derives them for the fixtures so FlightDetailPage renders cleanly instead
// of "NaN"/"undefined".
function enrichFlight(f) {
  const isSolo = !f.crewMembers || f.crewMembers.length === 0;
  return {
    ...f,
    isPic: f.picTime > 0,
    isDual: f.dualTime > 0,
    soloTime: isSolo ? f.totalTime : 0,
    crossCountryTime: f.departureIcao !== f.arrivalIcao ? f.totalTime : 0,
    takeoffsDay: f.landingsDay,
    takeoffsNight: f.landingsNight,
    distance: 95,
    offBlockTime: f.departureTime,
    onBlockTime: f.arrivalTime,
    actualInstrumentTime: f.ifrTime,
    simulatedInstrumentTime: 0,
    multiPilotTime: 0,
  };
}

const rawFlights = [
  {
    id: 'fl-1', userId: USER_ID, date: '2026-07-14', aircraftReg: 'D-EABC', aircraftType: 'C172',
    departureIcao: 'EDDF', arrivalIcao: 'EDDH', departureTime: '09:15', arrivalTime: '10:35',
    totalTime: 80, picTime: 80, dualTime: 0, nightTime: 0, ifrTime: 0,
    landingsDay: 1, landingsNight: 0, remarks: 'Currency flight',
    instructorName: null, instructorComments: null, sicTime: 0, dualGivenTime: 0,
    simulatedFlightTime: 0, groundTrainingTime: 0, crewMembers: [],
    createdAt: '2026-07-14T11:00:00Z', updatedAt: '2026-07-14T11:00:00Z',
  },
  {
    id: 'fl-2', userId: USER_ID, date: '2026-07-12', aircraftReg: 'D-GXYZ', aircraftType: 'PA34',
    departureIcao: 'EDDH', arrivalIcao: 'EDDW', departureTime: '08:00', arrivalTime: '09:35',
    totalTime: 95, picTime: 0, dualTime: 95, nightTime: 0, ifrTime: 25,
    landingsDay: 1, landingsNight: 0, remarks: null,
    instructorName: 'Sarah Klein', instructorComments: 'Good approach discipline.', sicTime: 0, dualGivenTime: 0,
    simulatedFlightTime: 0, groundTrainingTime: 0,
    crewMembers: [{ id: 'cm-1', flightId: 'fl-2', contactId: 'ct-2', name: 'Sarah Klein', role: 'Instructor' }],
    createdAt: '2026-07-12T09:45Z', updatedAt: '2026-07-12T09:45Z',
  },
  {
    id: 'fl-3', userId: USER_ID, date: '2026-07-10', aircraftReg: 'N12345', aircraftType: 'DA42',
    departureIcao: 'EDDM', arrivalIcao: 'EDDF', departureTime: '14:20', arrivalTime: '16:10',
    totalTime: 110, picTime: 110, dualTime: 0, nightTime: 0, ifrTime: 40,
    landingsDay: 1, landingsNight: 0, remarks: null,
    instructorName: null, instructorComments: null, sicTime: 0, dualGivenTime: 0,
    simulatedFlightTime: 0, groundTrainingTime: 0, crewMembers: [],
    createdAt: '2026-07-10T16:30Z', updatedAt: '2026-07-10T16:30Z',
  },
  {
    id: 'fl-4', userId: USER_ID, date: '2026-07-05', aircraftReg: 'D-EABC', aircraftType: 'C172',
    departureIcao: 'EDDF', arrivalIcao: 'EDDK', departureTime: '10:00', arrivalTime: '11:10',
    totalTime: 70, picTime: 70, dualTime: 0, nightTime: 0, ifrTime: 0,
    landingsDay: 1, landingsNight: 0, remarks: null,
    instructorName: null, instructorComments: null, sicTime: 0, dualGivenTime: 0,
    simulatedFlightTime: 0, groundTrainingTime: 0, crewMembers: [],
    createdAt: '2026-07-05T11:15Z', updatedAt: '2026-07-05T11:15Z',
  },
  {
    id: 'fl-5', userId: USER_ID, date: '2026-06-28', aircraftReg: 'D-EABC', aircraftType: 'C172',
    departureIcao: 'EDDK', arrivalIcao: 'EDDF', departureTime: '16:00', arrivalTime: '17:05',
    totalTime: 65, picTime: 65, dualTime: 0, nightTime: 0, ifrTime: 0,
    landingsDay: 1, landingsNight: 0, remarks: null,
    instructorName: null, instructorComments: null, sicTime: 0, dualGivenTime: 0,
    simulatedFlightTime: 0, groundTrainingTime: 0,
    crewMembers: [{ id: 'cm-2', flightId: 'fl-5', contactId: 'ct-1', name: 'John Doe', role: 'SIC' }],
    createdAt: '2026-06-28T17:20Z', updatedAt: '2026-06-28T17:20Z',
  },
  {
    id: 'fl-6', userId: USER_ID, date: '2026-06-20', aircraftReg: 'D-GXYZ', aircraftType: 'PA34',
    departureIcao: 'EDDF', arrivalIcao: 'EDDB', departureTime: '18:30', arrivalTime: '20:30',
    totalTime: 120, picTime: 120, dualTime: 0, nightTime: 30, ifrTime: 0,
    landingsDay: 0, landingsNight: 1, remarks: null,
    instructorName: null, instructorComments: null, sicTime: 0, dualGivenTime: 0,
    simulatedFlightTime: 0, groundTrainingTime: 0, crewMembers: [],
    createdAt: '2026-06-20T20:45Z', updatedAt: '2026-06-20T20:45Z',
  },
];

export const flights = rawFlights.map(enrichFlight);

export const licenses = [
  {
    id: 'lic-1', userId: USER_ID, regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
    licenseNumber: 'DE.FCL.12345', issueDate: '2020-01-15', issuingAuthority: 'LBA',
    requiresSeparateLogbook: false, createdAt: '2020-01-15T00:00:00Z', updatedAt: '2020-01-15T00:00:00Z',
  },
];

export const classRatingsByLicense = {
  'lic-1': [
    { id: 'cr-1', licenseId: 'lic-1', classType: 'SEP_LAND', issueDate: '2024-03-15', expiryDate: '2027-03-15', notes: null, createdAt: '2024-03-15T00:00:00Z', updatedAt: '2024-03-15T00:00:00Z' },
    { id: 'cr-2', licenseId: 'lic-1', classType: 'MEP_LAND', issueDate: '2024-08-27', expiryDate: plusDays(41), notes: null, createdAt: '2024-08-27T00:00:00Z', updatedAt: '2024-08-27T00:00:00Z' },
    { id: 'cr-3', licenseId: 'lic-1', classType: 'IR', issueDate: '2023-09-01', expiryDate: '2026-06-01', notes: null, createdAt: '2023-09-01T00:00:00Z', updatedAt: '2023-09-01T00:00:00Z' },
  ],
};

export const credentials = [
  {
    id: 'cred-1', userId: USER_ID, credentialType: 'EASA_CLASS1_MEDICAL', credentialNumber: 'MED-2026-001',
    issueDate: '2026-01-15', expiryDate: '2027-01-31', issuingAuthority: 'EASA AME', notes: null,
    createdAt: '2026-01-15T00:00:00Z', updatedAt: '2026-01-15T00:00:00Z',
  },
  {
    id: 'cred-2', userId: USER_ID, credentialType: 'LANG_ICAO_LEVEL5', credentialNumber: null,
    issueDate: '2021-05-10', expiryDate: plusDays(63), issuingAuthority: 'LBA', notes: null,
    createdAt: '2021-05-10T00:00:00Z', updatedAt: '2021-05-10T00:00:00Z',
  },
  {
    id: 'cred-3', userId: USER_ID, credentialType: 'SEC_CLEARANCE_ZUP', credentialNumber: 'ZUP-77421',
    issueDate: '2021-05-02', expiryDate: '2026-05-02', issuingAuthority: 'Luftsicherheitsbehörde', notes: null,
    createdAt: '2021-05-02T00:00:00Z', updatedAt: '2021-05-02T00:00:00Z',
  },
];

export const currencyStatus = {
  ratings: [
    {
      classRatingId: 'cr-1', classType: 'SEP_LAND', licenseId: 'lic-1', regulatoryAuthority: 'EASA', licenseType: 'PPL',
      status: 'current', expiryDate: '2027-03-15', message: 'Current — 14:10 PIC logged in the last 24 months.',
      requirements: [
        { name: 'Total time', met: true, current: 850, required: 720, unit: 'minutes', message: '14:10 / 12:00' },
        { name: 'Landings', met: true, current: 12, required: 12, unit: 'count', message: '12 / 12' },
      ],
    },
    {
      classRatingId: 'cr-2', classType: 'MEP_LAND', licenseId: 'lic-1', regulatoryAuthority: 'EASA', licenseType: 'PPL',
      status: 'expiring', expiryDate: plusDays(41), message: 'Revalidation due in 41 days.',
      requirements: [
        { name: 'Route sectors', met: false, current: 6, required: 10, unit: 'count', message: '6 / 10' },
        { name: 'Instructor time', met: false, current: 0, required: 60, unit: 'minutes', message: '0:00 / 1:00' },
      ],
    },
    {
      classRatingId: 'cr-3', classType: 'IR', licenseId: 'lic-1', regulatoryAuthority: 'EASA', licenseType: 'PPL',
      status: 'expired', expiryDate: '2026-06-01', message: '6 approaches needed within the last 6 calendar months.',
      requirements: [
        { name: 'Approaches', met: false, current: 0, required: 6, unit: 'count', message: '0 / 6' },
        { name: 'Holding', met: false, current: 0, required: 1, unit: 'count', message: '0 / 1' },
      ],
    },
  ],
  passengerCurrency: [
    {
      classType: 'SEP_LAND', regulatoryAuthority: 'EASA', dayStatus: 'current', nightStatus: 'expiring',
      dayLandings: 9, nightLandings: 2, dayRequired: 3, nightRequired: 3, nightPrivilege: true,
      message: 'Night passenger currency expiring soon.', ruleDescription: 'FCL.060',
    },
  ],
  flightReview: { lastCompleted: '2025-08-01', expiresOn: '2027-08-01', status: 'current', message: 'Valid until 2027-08-01' },
};

export const statistics = {
  licenseId: 'lic-1',
  totalFlights: 498,
  totalMinutes: 50540,
  picMinutes: 36665,
  dualMinutes: 6120,
  nightMinutes: 3100,
  ifrMinutes: 9200,
  landingsDay: 470,
  landingsNight: 42,
  soloMinutes: 18200,
  crossCountryMinutes: 22100,
};

export const statsByClass = {
  byClass: [
    { class: 'SEP_LAND', flights: 312, minutes: 31200, picMinutes: 28100, dualMinutes: 3100, landings: 340 },
    { class: 'MEP_LAND', flights: 150, minutes: 15600, picMinutes: 7200, dualMinutes: 2300, landings: 140 },
    { class: 'TMG', flights: 36, minutes: 3740, picMinutes: 1365, dualMinutes: 720, landings: 32 },
  ],
  byCategory: [
    { category: 'SEP', flights: 312, picMinutes: 28100, dualMinutes: 3100 },
    { category: 'MEP', flights: 150, picMinutes: 7200, dualMinutes: 2300 },
    { category: 'TMG', flights: 36, picMinutes: 1365, dualMinutes: 720 },
  ],
  byAuthority: [
    { authority: 'EASA', licenseType: 'PPL', flights: 498, minutes: 50540 },
  ],
};

export const trends = {
  monthly: [
    { month: '2026-01', totalFlights: 34, totalMinutes: 3120, picMinutes: 2600, dualMinutes: 300, nightMinutes: 120, ifrMinutes: 600, landingsDay: 30, landingsNight: 4 },
    { month: '2026-02', totalFlights: 30, totalMinutes: 2900, picMinutes: 2450, dualMinutes: 260, nightMinutes: 90, ifrMinutes: 520, landingsDay: 27, landingsNight: 3 },
    { month: '2026-03', totalFlights: 38, totalMinutes: 3450, picMinutes: 2900, dualMinutes: 340, nightMinutes: 140, ifrMinutes: 700, landingsDay: 34, landingsNight: 5 },
    { month: '2026-04', totalFlights: 41, totalMinutes: 3760, picMinutes: 3150, dualMinutes: 360, nightMinutes: 160, ifrMinutes: 760, landingsDay: 37, landingsNight: 5 },
    { month: '2026-05', totalFlights: 45, totalMinutes: 4120, picMinutes: 3480, dualMinutes: 380, nightMinutes: 180, ifrMinutes: 840, landingsDay: 41, landingsNight: 6 },
    { month: '2026-06', totalFlights: 48, totalMinutes: 4380, picMinutes: 3700, dualMinutes: 400, nightMinutes: 200, ifrMinutes: 900, landingsDay: 44, landingsNight: 6 },
    { month: '2026-07', totalFlights: 27, totalMinutes: 2540, picMinutes: 2130, dualMinutes: 230, nightMinutes: 110, ifrMinutes: 520, landingsDay: 25, landingsNight: 3 },
  ],
  byAircraftType: [
    { aircraftType: 'C172', totalFlights: 312, totalMinutes: 31200 },
    { aircraftType: 'PA34', totalFlights: 150, totalMinutes: 15600 },
    { aircraftType: 'DA42', totalFlights: 36, totalMinutes: 3740 },
  ],
};
