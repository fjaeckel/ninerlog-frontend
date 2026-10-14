/**
 * P2 — Jonas, student glider pilot (PERSONAS.md). No licence; dual winch
 * circuits in the club ASK 21 with an FI(S), a few aerotows, and his first
 * supervised solos in the ASK 23 this summer.
 */
import {
  makeUser, aircraftRecord, credential, flight, rng, between, pick, weekends, addTime, day, iso
} from './build.mjs';

const user = makeUser({ id: 'u1', email: 'jonas.becker@example.com', name: 'Jonas Becker', createdAt: iso('2025-08-30') });

const aircraft = [
  aircraftRecord('a1', 'D-1234', 'AS21', 'Schleicher', 'ASK 21', 'GLIDER', { defaultDepartureIcao: 'EDLO', defaultArrivalIcao: 'EDLO', notes: 'Club two-seater.' }),
  aircraftRecord('a2', 'D-4523', 'AS23', 'Schleicher', 'ASK 23 B', 'GLIDER', { defaultDepartureIcao: 'EDLO', defaultArrivalIcao: 'EDLO', notes: 'Club single-seater for first solos.' }),
];

const credentials = [credential('c1', 'EASA_LAPL_MEDICAL', 'MED-L-51877', '2025-08-20', '2030-08-20', 'AeMC Bielefeld')];
const contacts = [
  { id: 'p1', userId: 'u1', name: 'Thomas Wagner', email: null, phone: null, notes: 'FI(S)', createdAt: iso('2025-08-30'), updatedAt: iso('2025-08-30') },
  { id: 'p2', userId: 'u1', name: 'Sandra Vogel', email: null, phone: null, notes: 'FI(S)', createdAt: iso('2025-08-30'), updatedAt: iso('2025-08-30') },
];
const INSTRUCTORS = [
  { name: 'Thomas Wagner', role: 'Instructor', contactId: 'p1' },
  { name: 'Sandra Vogel', role: 'Instructor', contactId: 'p2' },
];
const AIRFIELD = 'EDLO';
const FIRST_SOLO = '2026-07-11';

function training() {
  const rand = rng(16);
  const out = [];
  const days = [...weekends('2025-09-06', '2025-10-19'), ...weekends('2026-04-04', day(0))].filter(() => rand() < 0.45);
  for (const date of days) {
    let t = `10:${pick(rand, ['00', '20', '40'])}`;
    const n = between(rand, 3, 5);
    for (let k = 0; k < n; k++) {
      const solo = date >= FIRST_SOLO && k >= n - 2;
      const tow = !solo && rand() < 0.08;
      const minutes = tow ? between(rand, 20, 40) : between(rand, 5, 9);
      const instr = pick(rand, INSTRUCTORS);
      out.push(solo
        ? flight({ date, reg: 'D-4523', type: 'AS23', from: AIRFIELD, to: AIRFIELD, depTime: t, minutes, role: 'solo', launchMethod: 'winch', remarks: 'Supervised solo' })
        : flight({ date, reg: 'D-1234', type: 'AS21', from: AIRFIELD, to: AIRFIELD, depTime: t, minutes, role: 'dual', launchMethod: tow ? 'aerotow' : 'winch', crew: [instr], instructorName: instr.name, remarks: tow ? 'Aerotow training' : null }));
      t = addTime(t, minutes + between(rand, 25, 50));
    }
  }
  return out;
}

const flights = training();

export default {
  id: 'jonas',
  user, aircraft, licenses: [], classRatings: {}, credentials, contacts, flights,
  currency: { ratings: [], passengerCurrency: [] },
  profileSettings: { disciplines: { SAILPLANE: { intent: 'goal' } } },
  expectedDisciplines: { SAILPLANE: 'training' },
  airports: { EDLO: { name: 'Oerlinghausen', country: 'DE', lat: 51.9322, lon: 8.6617 } },
  shotAircraft: ['D-1234', 'D-4523'],
};
