/**
 * G2 — Anna, PPL(A) weekend pilot converting to gliders (guard, PERSONAS.md).
 * SEP flights from Essen/Mülheim in club aircraft, and this summer her first
 * dual winch flights in the club ASK 21.
 */
import {
  makeUser, aircraftRecord, licence, classRating, credential, flight, rng, between, pick, addDays, addTime, day, daysAgo, iso,
  tally, req, easaPax, distanceNm,
} from './build.mjs';

const user = makeUser({ id: 'u1', email: 'anna.schroeder@example.com', name: 'Anna Schröder', createdAt: iso('2024-03-03') });

const airports = {
  EDLE: { name: 'Essen/Mülheim', country: 'DE', lat: 51.4023, lon: 6.9373 },
  EDLW: { name: 'Dortmund', country: 'DE', lat: 51.5183, lon: 7.6122 },
  EDLN: { name: 'Mönchengladbach', country: 'DE', lat: 51.2303, lon: 6.5044 },
  EDKB: { name: 'Bonn-Hangelar', country: 'DE', lat: 50.7689, lon: 7.1633 },
  EDWI: { name: 'Wilhelmshaven', country: 'DE', lat: 53.5047, lon: 8.0514 },
  EDLO: { name: 'Oerlinghausen', country: 'DE', lat: 51.9322, lon: 8.6617 },
};

const aircraft = [
  aircraftRecord('a1', 'D-EAKS', 'C172', 'Cessna', '172S Skyhawk', 'SEP_LAND', { defaultDepartureIcao: 'EDLE', notes: 'Club aircraft.' }),
  aircraftRecord('a2', 'D-EFMA', 'PA28', 'Piper', 'PA-28-161 Warrior II', 'SEP_LAND', { defaultDepartureIcao: 'EDLE' }),
  aircraftRecord('a3', 'D-1234', 'AS21', 'Schleicher', 'ASK 21', 'GLIDER', { defaultDepartureIcao: 'EDLO', defaultArrivalIcao: 'EDLO', createdAt: iso('2026-07-04') }),
];

const SEP_EXPIRY = '2027-05-31';
const licenses = [licence('l1', 'EASA', 'PPL(A)', 'DE.FCL.PPL.A.17733', '2018-06-22', 'LBA')];
const classRatings = { l1: [classRating('cr1', 'l1', 'SEP_LAND', '2018-06-22', { expiryDate: SEP_EXPIRY })] };
const credentials = [credential('c1', 'EASA_CLASS2_MEDICAL', 'MED-51290', '2025-10-14', '2027-10-14', 'AeMC Essen')];

function aeroplane() {
  const rand = rng(41);
  const out = [];
  for (let date = '2025-03-08'; date <= day(0); date = addDays(date, between(rand, 12, 24))) {
    const reg = pick(rand, ['D-EAKS', 'D-EAKS', 'D-EFMA']);
    const type = reg === 'D-EAKS' ? 'C172' : 'PA28';
    if (rand() < 0.3) {
      out.push(flight({ date, reg, type, from: 'EDLE', to: 'EDLE', offBlock: '10:00', onBlock: '10:55', depTime: '10:10', minutes: 55, landings: 5, remarks: 'Circuits' }));
      continue;
    }
    const dest = pick(rand, ['EDLW', 'EDLN', 'EDKB', 'EDWI']);
    let off = '09:30';
    for (const [from, to] of [['EDLE', dest], [dest, 'EDLE']]) {
      const d = distanceNm(airports, from, to);
      const block = Math.round(d / 1.8) + 18;
      out.push(flight({ date, reg, type, from, to, offBlock: off, onBlock: addTime(off, block), depTime: addTime(off, 9), minutes: block, distance: d }));
      off = addTime(off, block + 90);
    }
  }
  return out;
}

const INSTRUCTOR = { name: 'Thomas Wagner', role: 'Instructor' };
const gliding = ['2026-07-04', '2026-07-04', '2026-07-04', '2026-07-18', '2026-07-18', '2026-08-08', '2026-08-08'].map((date, i) =>
  flight({
    date, reg: 'D-1234', type: 'AS21', from: 'EDLO', to: 'EDLO', depTime: addTime('10:30', (i % 3) * 45), minutes: between(rng(i + 7), 6, 11),
    role: 'dual', launchMethod: 'winch', crew: [INSTRUCTOR], instructorName: INSTRUCTOR.name, remarks: i === 0 ? 'First glider flight — SPL training (SFCL.140)' : null,
  }));

const flights = [...aeroplane(), ...gliding];

const isSEP = (f, ac) => ac?.aircraftClass === 'SEP_LAND';

function currency(fl, acByReg) {
  const sep = tally(fl, acByReg, isSEP, daysAgo('2026-05-31'));
  const sepReqs = [
    req('requirement.total_time', sep.minutes, 720, 'minutes'),
    req('requirement.pic_time', sep.pic, 360, 'minutes'),
    req('requirement.landings', sep.landings, 12, 'landings'),
    req('requirement.refresher_training', sep.instructorMinutes, 60, 'minutes'),
  ];
  const met = sepReqs.every((r) => r.met);
  return {
    ratings: [{
      classRatingId: 'cr1', classType: 'SEP_LAND', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
      status: met ? 'current' : 'expiring', messageKey: met ? 'rating.revalidation_current' : 'rating.revalidation_not_met',
      expiryDate: SEP_EXPIRY, windowOpensAt: '2026-05-31', windowOpen: true, ruleDescriptionKey: 'easa_sep_tmg',
      countedClasses: ['SEP_LAND', 'TMG'], creditedUltralightKinds: ['THREE_AXIS', 'THREE_AXIS_MOTORGLIDER'], requirements: sepReqs,
    }],
    passengerCurrency: [easaPax('SEP_LAND', fl, acByReg, isSEP, { nightPrivilege: true })],
  };
}

export default {
  id: 'anna',
  user, aircraft, licenses, classRatings, credentials, contacts: [], flights, currency, airports,
  profileSettings: { disciplines: { AEROPLANE: { acknowledgedAt: iso('2024-03-03T18:00:00Z') } } },
  expectedDisciplines: { AEROPLANE: 'active', SAILPLANE: 'training' },
  shotAircraft: ['D-EAKS', 'D-1234'],
};
