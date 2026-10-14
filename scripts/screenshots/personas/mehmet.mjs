/**
 * P5 — Mehmet, three-axis ultralight pilot (PERSONAS.md). DULV UL licence
 * (three-axis, passenger authorisation), a share in the C42 D-MXYZ at a UL
 * strip with no ICAO code, and a PPL(A) SEP last flown on rented C172s in 2023.
 */
import {
  makeUser, aircraftRecord, licence, classRating, credential, flight, rng, between, pick, addDays, day, daysAgo, iso,
  tally, req, rollingReq, profCheck, recencyStatus, easaPax, ulPax, distanceNm,
  privilege, privilegeCurrency
} from './build.mjs';

const user = makeUser({ id: 'u1', email: 'mehmet.yilmaz@example.com', name: 'Mehmet Yılmaz', createdAt: iso('2024-04-14') });

const BASE = 'UL-Platz Musterstadt';
const airports = {
  EDKV: { name: 'Dahlemer Binz', country: 'DE', lat: 50.4056, lon: 6.5289 },
  EDLM: { name: 'Marl-Loemühle', country: 'DE', lat: 51.6472, lon: 7.1633 },
  EDKB: { name: 'Bonn-Hangelar', country: 'DE', lat: 50.7689, lon: 7.1633 },
  EDDK: { name: 'Köln/Bonn', country: 'DE', lat: 50.8659, lon: 7.1427 },
  EDLN: { name: 'Mönchengladbach', country: 'DE', lat: 51.2303, lon: 6.5044 },
};

const aircraft = [
  aircraftRecord('a1', 'D-MXYZ', 'C42', 'Comco Ikarus', 'C42 B', 'ULTRALIGHT', {
    ulKind: 'THREE_AXIS', maxTakeoffMassKg: 600, defaultDepartureIcao: BASE, defaultArrivalIcao: BASE,
    notes: 'Shared with three owners. Rescue system repack due 05/2027.',
  }),
  aircraftRecord('a2', 'D-EKLM', 'C172', 'Cessna', '172R Skyhawk', 'SEP_LAND', { isActive: false, notes: 'Flying-school aircraft, rented.' }),
  aircraftRecord('a3', 'D-ENRW', 'C172', 'Cessna', '172S Skyhawk', 'SEP_LAND', { isActive: false, notes: 'Flying-school aircraft, rented.' }),
];

const SEP_EXPIRY = '2026-12-15';
const licenses = [
  licence('l1', 'DULV', 'UL', 'DULV-UL-4711', '2014-06-28', 'DULV'),
  licence('l2', 'EASA', 'PPL(A)', 'DE.FCL.PPL.A.09876', '2010-08-03', 'LBA'),
];
const classRatings = {
  l1: [classRating('cr1', 'l1', 'ULTRALIGHT', '2014-06-28', { ulKind: 'THREE_AXIS' })],
  l2: [classRating('cr2', 'l2', 'SEP_LAND', '2010-08-03', { expiryDate: SEP_EXPIRY })],
};
const privileges = [privilege('pv1', 'l1', 'UL_PASSENGER_AUTH', { issuedOn: '2015-04-18', notes: 'LuftPersV §84a' })];
const credentials = [credential('c1', 'EASA_CLASS2_MEDICAL', 'MED-60318', '2025-03-18', '2027-03-18', 'AeMC Düsseldorf')];
const contacts = [
  { id: 'p1', userId: 'u1', name: 'Ayşe Yılmaz', email: null, phone: null, notes: null, createdAt: iso('2024-05-01'), updatedAt: iso('2024-05-01') },
  { id: 'p2', userId: 'u1', name: 'Jens Hartmann', email: null, phone: null, notes: 'UL instructor', createdAt: iso('2024-05-01'), updatedAt: iso('2024-05-01') },
];

function ulFlights() {
  const rand = rng(42);
  const out = [];
  for (let date = '2024-09-01'; date <= day(0); date = addDays(date, between(rand, 8, 20))) {
    const r = rand();
    if (r < 0.35) {
      out.push(flight({ date, reg: 'D-MXYZ', type: 'C42', from: BASE, to: BASE, depTime: '09:30', minutes: between(rand, 30, 55), landings: between(rand, 3, 6), remarks: 'Circuits' }));
    } else if (r < 0.65) {
      const pax = pick(rand, [{ name: 'Ayşe Yılmaz', role: 'Passenger', contactId: 'p1' }, { name: 'Emre Yılmaz', role: 'Passenger' }]);
      out.push(flight({ date, reg: 'D-MXYZ', type: 'C42', from: BASE, to: BASE, depTime: '15:00', minutes: between(rand, 40, 75), crew: [pax], remarks: 'Sightseeing, Ruhr valley' }));
    } else {
      const dest = pick(rand, ['EDKV', 'EDLM', 'EDKB']);
      const minutes = between(rand, 50, 80);
      out.push(
        flight({ date, reg: 'D-MXYZ', type: 'C42', from: BASE, to: dest, depTime: '10:00', minutes }),
        flight({ date, reg: 'D-MXYZ', type: 'C42', from: dest, to: BASE, depTime: '13:30', minutes: minutes + between(rand, -5, 8) }),
      );
    }
  }
  out.push(flight({
    date: '2025-05-17', reg: 'D-MXYZ', type: 'C42', from: BASE, to: BASE, depTime: '10:00', minutes: 65, role: 'dual', landings: 5,
    crew: [{ name: 'Jens Hartmann', role: 'Instructor', contactId: 'p2' }], instructorName: 'Jens Hartmann', remarks: '§45 training flight',
  }));
  return out;
}

const oldSep = [
  ['2022-06-11', 'EDKB', 'EDLN'], ['2022-06-11', 'EDLN', 'EDKB'], ['2022-09-03', 'EDKB', 'EDKB'],
  ['2023-04-22', 'EDKB', 'EDDK'], ['2023-04-22', 'EDDK', 'EDKB'], ['2023-07-15', 'EDKB', 'EDKB'],
].map(([date, from, to], i) => flight({
  date, reg: i < 3 ? 'D-EKLM' : 'D-ENRW', type: 'C172', from, to, offBlock: '10:00', onBlock: '11:05', depTime: '10:08', minutes: 57,
  distance: distanceNm(airports, from, to), remarks: 'Rented from the flying school',
}));

const flights = [...ulFlights(), ...oldSep];

const isThreeAxis = (f, ac) => ac?.aircraftClass === 'ULTRALIGHT' && ac.ulKind === 'THREE_AXIS';
const isSEP = (f, ac) => ac?.aircraftClass === 'SEP_LAND';

function currency(fl, acByReg) {
  const ul = tally(fl, acByReg, (f, ac) => isThreeAxis(f, ac) || isSEP(f, ac), 730);
  const ulReqs = [
    rollingReq('requirement.total_time', ul, 'minutes', 720, 'minutes'),
    rollingReq('requirement.pic_time', ul, 'pic', 360, 'minutes'),
    rollingReq('requirement.landings', ul, 'landings', 12, 'landings'),
    rollingReq('requirement.training_flight', ul, 'longestTraining', 60, 'minutes'),
    profCheck(),
  ];
  const sep = tally(fl, acByReg, (f, ac) => isThreeAxis(f, ac) || isSEP(f, ac), daysAgo('2025-12-15'));
  const sepNative = tally(fl, acByReg, isSEP, daysAgo('2025-12-15'));
  const sepReqs = [
    req('requirement.total_time', sep.minutes, 720, 'minutes'),
    req('requirement.pic_time', sep.pic, 360, 'minutes'),
    req('requirement.landings', sep.landings, 12, 'landings'),
    req('requirement.refresher_training', sepNative.instructorMinutes, 60, 'minutes'),
  ];
  return {
    ratings: [
      {
        classRatingId: 'cr1', classType: 'ULTRALIGHT', licenseId: 'l1', regulatoryAuthority: 'DULV', licenseType: 'UL',
        ...recencyStatus(ulReqs), windowOpen: false, ruleDescriptionKey: 'ul_luftpersv',
        countedClasses: ['SEP_LAND', 'TMG'], creditedUltralightKinds: ['THREE_AXIS', 'THREE_AXIS_MOTORGLIDER'], requirements: ulReqs,
      },
      {
        classRatingId: 'cr2', classType: 'SEP_LAND', licenseId: 'l2', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
        status: 'expiring', messageKey: 'rating.revalidation_not_met', expiryDate: SEP_EXPIRY, windowOpensAt: '2025-12-15', windowOpen: true,
        ruleDescriptionKey: 'easa_sep_tmg', countedClasses: ['SEP_LAND', 'TMG'], creditedUltralightKinds: ['THREE_AXIS', 'THREE_AXIS_MOTORGLIDER'],
        requirements: sepReqs,
      },
    ],
    passengerCurrency: [
      ulPax('THREE_AXIS', fl, acByReg, 'DULV', { authorised: true }),
      easaPax('SEP_LAND', fl, acByReg, isSEP, { nightPrivilege: true }),
    ],
    privileges: privileges.map((p) => privilegeCurrency(p, 'privilege_expiry')),
  };
}

export default {
  id: 'mehmet',
  user, aircraft, licenses, classRatings, privileges, credentials, contacts, flights, currency, airports,
  profileSettings: { disciplines: { ULTRALIGHT: { acknowledgedAt: iso('2024-04-14T18:00:00Z') } } },
  expectedDisciplines: { ULTRALIGHT: 'active', AEROPLANE: 'dormant' },
  shotAircraft: ['D-MXYZ'],
};
