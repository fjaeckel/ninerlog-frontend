/**
 * C3 — Ines, full-time flight instructor FI(A) (PERSONAS.md). CPL(A) with
 * SEP and night; teaches PPL(A) and LAPL(A) students at an approved
 * training organisation in Egelsbach, three to five lessons a day, and
 * flies the occasional revalidation refresher for club pilots.
 */
import {
  makeUser, aircraftRecord, licence, classRating, credential, flight, rng, between, pick, addDays, addTime, day, daysAgo, iso,
  tally, req, easaPax, distanceNm,
} from './build.mjs';

const user = makeUser({ id: 'u1', email: 'ines.hartmann@example.com', name: 'Ines Hartmann', createdAt: iso('2025-01-11') });

const airports = {
  EDFE: { name: 'Frankfurt-Egelsbach', country: 'DE', lat: 49.9608, lon: 8.6436 },
  EDFZ: { name: 'Mainz-Finthen', country: 'DE', lat: 49.9686, lon: 8.1472 },
  EDFM: { name: 'Mannheim City', country: 'DE', lat: 49.4731, lon: 8.5142 },
  EDFH: { name: 'Frankfurt-Hahn', country: 'DE', lat: 49.9487, lon: 7.2639 },
  EDFV: { name: 'Worms', country: 'DE', lat: 49.6064, lon: 8.3683 },
};

const aircraft = [
  aircraftRecord('a1', 'D-EFSA', 'C172', 'Cessna', '172S Skyhawk', 'SEP_LAND', { defaultDepartureIcao: 'EDFE', notes: 'ATO fleet.' }),
  aircraftRecord('a2', 'D-EFSB', 'C172', 'Cessna', '172S Skyhawk', 'SEP_LAND', { defaultDepartureIcao: 'EDFE', notes: 'ATO fleet.' }),
  aircraftRecord('a3', 'D-EDAF', 'DA40', 'Diamond', 'DA40 NG', 'SEP_LAND', { defaultDepartureIcao: 'EDFE', notes: 'ATO fleet, night and navigation training.' }),
];

const STUDENTS = ['Jan Richter', 'Aylin Demir', 'Moritz Scholz', 'Katharina Weiß', 'Luca Romano', 'Sophie Brandt', 'Tobias Kern', 'Hanna Albrecht'];
const contacts = STUDENTS.map((name, i) => ({
  id: `p${i + 1}`, userId: 'u1', name, email: null, phone: null, notes: i < 6 ? 'PPL(A) student' : 'LAPL(A) student',
  createdAt: iso('2025-09-01'), updatedAt: iso('2025-09-01'),
}));

const FI_EXPIRY = '2028-03-31';
const SEP_EXPIRY = '2027-04-30';
const licenses = [licence('l1', 'EASA', 'CPL(A)', 'DE.FCL.CPL.A.51177', '2018-09-14', 'LBA')];
const classRatings = {
  l1: [
    classRating('cr1', 'l1', 'SEP_LAND', '2016-04-02', { expiryDate: SEP_EXPIRY }),
    classRating('cr2', 'l1', 'OTHER', '2019-03-20', { expiryDate: FI_EXPIRY, notes: 'FI(A) — PPL, LAPL, night' }),
  ],
};
const credentials = [
  credential('c1', 'EASA_CLASS1_MEDICAL', 'MED-1-44810', '2026-05-06', '2027-05-06', 'AeMC Frankfurt'),
  credential('c2', 'LANG_ICAO_LEVEL6', 'ELP-6', '2018-09-14', null, 'LBA'),
];

const LESSONS = ['Circuits', 'Stalls and slow flight', 'Steep turns', 'Forced landings', 'Navigation', 'Radio navigation', 'Pre-solo check', 'Night circuits'];

function teaching() {
  const rand = rng(940);
  const out = [];
  for (let date = '2025-09-01'; date <= day(0); date = addDays(date, between(rand, 1, 2))) {
    if (new Date(`${date}T12:00:00Z`).getUTCDay() === 1) continue;
    let off = '08:30';
    for (let n = between(rand, 3, 5); n > 0; n--) {
      const student = pick(rand, STUDENTS);
      const winter = !['04', '05', '06', '07', '08', '09'].includes(date.slice(5, 7));
      const drawn = pick(rand, LESSONS);
      const lesson = drawn === 'Night circuits' && !winter ? 'Circuits' : drawn;
      const reg = lesson === 'Night circuits' || lesson === 'Navigation' ? 'D-EDAF' : pick(rand, ['D-EFSA', 'D-EFSB']);
      const nav = lesson === 'Navigation' || lesson === 'Radio navigation';
      const to = nav ? pick(rand, ['EDFZ', 'EDFM', 'EDFH', 'EDFV']) : 'EDFE';
      const minutes = nav ? between(rand, 80, 110) : between(rand, 45, 70);
      const night = lesson === 'Night circuits' ? minutes : 0;
      const landings = nav ? 2 : between(rand, 4, 8);
      const start = night ? '17:45' : off;
      out.push(flight({
        date, reg, type: reg === 'D-EDAF' ? 'DA40' : 'C172', from: 'EDFE', to: nav ? 'EDFE' : to,
        offBlock: start, onBlock: addTime(start, minutes), depTime: addTime(start, 10), minutes, role: 'instructor',
        landings, nightLandings: night ? landings : 0, night,
        xc: nav ? minutes : 0, distance: nav ? 2 * distanceNm(airports, 'EDFE', to) : 0,
        crew: [{ name: student, role: 'Student', contactId: `p${STUDENTS.indexOf(student) + 1}` }], remarks: lesson,
      }));
      off = addTime(off, minutes + 45);
    }
  }
  return out;
}

const own = ['2026-04-18', '2026-07-05'].map((date) => flight({
  date, reg: 'D-EDAF', type: 'DA40', from: 'EDFE', to: 'EDFM', offBlock: '17:00', onBlock: '17:40', depTime: '17:08', minutes: 40,
  distance: distanceNm(airports, 'EDFE', 'EDFM'), remarks: 'Aircraft ferry',
}));

const refresher = flight({
  date: '2026-05-10', reg: 'D-EDAF', type: 'DA40', from: 'EDFE', to: 'EDFE', offBlock: '16:00', onBlock: '17:05', depTime: '16:10',
  minutes: 65, landings: 4, role: 'dual', instructorName: 'Frank Ostermann', crew: [{ name: 'Frank Ostermann', role: 'Instructor' }],
  remarks: 'SEP refresher training FCL.740.A(b)(1)(ii)',
});

const flights = [...teaching(), ...own, refresher];

const isSEP = (f, ac) => ac?.aircraftClass === 'SEP_LAND';

function currency(fl, acByReg) {
  const sep = tally(fl, acByReg, isSEP, daysAgo('2026-04-30'));
  const sepReqs = [
    req('requirement.total_time', sep.minutes, 720, 'minutes'),
    req('requirement.pic_time', sep.pic, 360, 'minutes'),
    req('requirement.landings', sep.landings, 12, 'landings'),
    req('requirement.refresher_training', sep.instructorMinutes, 60, 'minutes'),
  ];
  const met = sepReqs.every((r) => r.met);
  return {
    ratings: [
      {
        classRatingId: 'cr1', classType: 'SEP_LAND', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'CPL(A)',
        status: met ? 'current' : 'expiring', messageKey: met ? 'rating.revalidation_current' : 'rating.revalidation_not_met',
        expiryDate: SEP_EXPIRY, windowOpensAt: '2026-04-30', windowOpen: true, ruleDescriptionKey: 'easa_sep_tmg',
        countedClasses: ['SEP_LAND', 'TMG'], creditedUltralightKinds: ['THREE_AXIS', 'THREE_AXIS_MOTORGLIDER'], requirements: sepReqs,
      },
      {
        classRatingId: 'cr2', classType: 'OTHER', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'CPL(A)',
        status: 'current', messageKey: 'rating.valid_until', expiryDate: FI_EXPIRY,
      },
    ],
    passengerCurrency: [easaPax('SEP_LAND', fl, acByReg, isSEP, { nightPrivilege: true })],
  };
}

export default {
  id: 'ines',
  user, aircraft, licenses, classRatings, credentials, contacts, flights, currency, airports,
  profileSettings: { disciplines: Object.fromEntries(['AEROPLANE', 'INSTRUCTOR'].map((d) => [d, { acknowledgedAt: iso('2025-01-11T18:00:00Z') }])) },
  expectedDisciplines: { AEROPLANE: 'active', INSTRUCTOR: 'active' },
  shotAircraft: ['D-EFSA', 'D-EDAF'],
};
