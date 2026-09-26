/**
 * P1 — Lena, club glider pilot (PERSONAS.md). SPL, winch and aerotow, club
 * ASK 21 and LS4 at Oerlinghausen; two seasons of winch circuits, a few
 * aerotowed soaring flights, season-start check flights and passenger flights.
 */
import {
  makeUser, aircraftRecord, licence, classRating, credential, flight, rng, pick, between, weekends,
  addTime, day, iso, tally, rollingReq, profCheck, recencyStatus, easaPax, launchMethodRows,
  privilege, privilegeCurrency
} from './build.mjs';

const user = makeUser({ id: 'u1', email: 'lena.hoffmann@example.com', name: 'Lena Hoffmann', createdAt: iso('2025-03-20') });

const aircraft = [
  aircraftRecord('a1', 'D-1234', 'AS21', 'Schleicher', 'ASK 21', 'GLIDER', { defaultDepartureIcao: 'EDLO', defaultArrivalIcao: 'EDLO', notes: 'Club two-seater.' }),
  aircraftRecord('a2', 'D-5678', 'LS4', 'Rolladen-Schneider', 'LS4-b', 'GLIDER', { defaultDepartureIcao: 'EDLO', defaultArrivalIcao: 'EDLO' }),
];

const licenses = [licence('l1', 'EASA', 'SPL', 'DE.SFCL.10234', '2021-05-15', 'LBA')];
const classRatings = { l1: [classRating('cr1', 'l1', 'GLIDER', '2021-05-15')] };
const privileges = [
  privilege('pv1', 'l1', 'LAUNCH_METHOD_TRAINED', { detail: 'winch', issuedOn: '2020-08-22' }),
  privilege('pv2', 'l1', 'LAUNCH_METHOD_TRAINED', { detail: 'aerotow', issuedOn: '2021-04-10' }),
];
const TRAINED = privileges.map((p) => p.detail);
const credentials = [credential('c1', 'EASA_LAPL_MEDICAL', 'MED-L-44120', '2024-03-11', '2029-03-11', 'AeMC Bielefeld')];
const contacts = [
  { id: 'p1', userId: 'u1', name: 'Thomas Wagner', email: null, phone: null, notes: 'FI(S), club', createdAt: iso('2025-03-20'), updatedAt: iso('2025-03-20') },
  { id: 'p2', userId: 'u1', name: 'Jana Hoffmann', email: null, phone: null, notes: null, createdAt: iso('2025-06-01'), updatedAt: iso('2025-06-01') },
];

const AIRFIELD = 'EDLO';
const INSTRUCTOR = { name: 'Thomas Wagner', role: 'Instructor', contactId: 'p1' };
const PASSENGERS = [{ name: 'Jana Hoffmann', role: 'Passenger', contactId: 'p2' }, { name: 'Moritz Klein', role: 'Passenger' }];

function season(seed, from, to, share) {
  const rand = rng(seed);
  const out = [];
  const days = weekends(from, to).filter(() => rand() < share);
  days.forEach((date, i) => {
    let t = `${String(between(rand, 10, 11)).padStart(2, '0')}:${pick(rand, ['00', '15', '30', '45'])}`;
    if (i === 0) {
      for (let k = 0; k < 2; k++) {
        const minutes = between(rand, 7, 10);
        out.push(flight({ date, reg: 'D-1234', type: 'AS21', from: AIRFIELD, to: AIRFIELD, depTime: t, minutes, role: 'dual', launchMethod: 'winch', crew: [INSTRUCTOR], instructorName: INSTRUCTOR.name, remarks: 'Season check flight' }));
        t = addTime(t, minutes + 25);
      }
      return;
    }
    if (rand() < 0.3) {
      const minutes = between(rand, 90, 300);
      out.push(flight({ date, reg: 'D-5678', type: 'LS4', from: AIRFIELD, to: AIRFIELD, depTime: '11:40', minutes, launchMethod: 'aerotow', remarks: minutes > 180 ? 'Thermal triangle, 180 km' : 'Local soaring' }));
      return;
    }
    const circuits = between(rand, 3, 7);
    for (let k = 0; k < circuits; k++) {
      const withPax = k === circuits - 1 && rand() < 0.35;
      const thermal = !withPax && rand() < 0.2;
      const minutes = thermal ? between(rand, 30, 150) : between(rand, 6, 12);
      out.push(flight({
        date, reg: withPax ? 'D-1234' : 'D-5678', type: withPax ? 'AS21' : 'LS4', from: AIRFIELD, to: AIRFIELD,
        depTime: t, minutes, launchMethod: 'winch', crew: withPax ? [pick(rand, PASSENGERS)] : [],
      }));
      t = addTime(t, minutes + between(rand, 20, 45));
    }
  });
  return out;
}

/** Aerotows beyond the newest three in 24 months are winch launches: aerotow recency is 3/5 (L4). */
function aerotowShortfall(list) {
  const since = day(-730);
  const tows = list.filter((f) => f.launchMethod === 'aerotow' && f.date >= since).sort((a, b) => b.date.localeCompare(a.date));
  const keep = new Set(tows.slice(0, 3));
  return list.map((f) => (f.launchMethod === 'aerotow' && !keep.has(f) ? { ...f, launchMethod: 'winch' } : f));
}

const flights = aerotowShortfall([
  ...season(2025, '2025-04-05', '2025-10-12', 0.3),
  ...season(2026, '2026-04-04', day(0), 0.38),
]);

const isGlider = (f, ac) => ac?.aircraftClass === 'GLIDER';

function currency(fl, acByReg) {
  const g = tally(fl, acByReg, isGlider, 730);
  const requirements = [
    rollingReq('requirement.flight_time', g, 'picOrDual', 300, 'minutes'),
    rollingReq('requirement.launches', g, 'launches', 15, 'launches'),
    rollingReq('requirement.training_flights', g, 'trainingFlights', 2, 'flights'),
    profCheck(),
  ];
  return {
    ratings: [{
      classRatingId: 'cr1', classType: 'GLIDER', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL',
      ...recencyStatus(requirements), windowOpen: false, ruleDescriptionKey: 'easa_spl',
      countedClasses: ['GLIDER', 'TMG'], requirements,
      launchMethodCurrency: launchMethodRows(fl, acByReg, isGlider, 0, TRAINED),
    }],
    passengerCurrency: [easaPax('GLIDER', fl, acByReg, isGlider, { picOnly: true, ruleDescriptionKey: 'easa_spl_pax', spl115IssueDate: '2021-05-15' })],
    privileges: privileges.map((p) => privilegeCurrency(p, 'sfcl_155_launch_method')),
  };
}

export default {
  id: 'lena',
  user, aircraft, licenses, classRatings, privileges, credentials, contacts, flights, currency,
  profileSettings: { disciplines: { SAILPLANE: { acknowledgedAt: iso('2025-04-05T18:00:00Z') } } },
  expectedDisciplines: { SAILPLANE: 'active' },
  airports: { EDLO: { name: 'Oerlinghausen', country: 'DE', lat: 51.9322, lon: 8.6617 } },
  shotAircraft: ['D-1234'],
};
