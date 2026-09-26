/**
 * P4 — Petra, cross-country and self-launch glider pilot, FI(S) and tow pilot
 * (PERSONAS.md). Own ASG 29E self-launcher, club DR400 tug, club ASK 21 for
 * instructing, at Bayreuth; long cross-country flights with outlandings.
 */
import {
  makeUser, aircraftRecord, licence, classRating, credential, flight, rng, between, pick, weekends, addTime, day, daysAgo, iso,
  tally, req, profCheck, recencyStatus, easaPax, launchMethodRows, distanceNm,
  privilege, privilegeReq, privilegeCurrency, untracked
} from './build.mjs';

const user = makeUser({ id: 'u1', email: 'petra.lindner@example.com', name: 'Dr. Petra Lindner', createdAt: iso('2024-11-02') });

const airports = {
  EDQD: { name: 'Bayreuth', country: 'DE', lat: 49.985, lon: 11.64 },
  EDQC: { name: 'Coburg-Brandensteinsebene', country: 'DE', lat: 50.2625, lon: 10.9958 },
  EDQM: { name: 'Hof-Plauen', country: 'DE', lat: 50.2886, lon: 11.8564 },
};

const aircraft = [
  aircraftRecord('a1', 'D-KXYZ', 'AS29', 'Schleicher', 'ASG 29E', 'GLIDER', { defaultDepartureIcao: 'EDQD', defaultArrivalIcao: 'EDQD', notes: 'Own. Self-launching, 18 m.' }),
  aircraftRecord('a2', 'D-EPTW', 'DR40', 'Robin', 'DR400/180R Remorqueur', 'SEP_LAND', { defaultDepartureIcao: 'EDQD', defaultArrivalIcao: 'EDQD', notes: 'Club tow plane.' }),
  aircraftRecord('a3', 'D-7021', 'AS21', 'Schleicher', 'ASK 21', 'GLIDER', { defaultDepartureIcao: 'EDQD', defaultArrivalIcao: 'EDQD', notes: 'Club trainer.' }),
];

const SEP_EXPIRY = '2027-03-04';
const licenses = [
  licence('l1', 'EASA', 'SPL', 'DE.SFCL.03318', '2006-07-21', 'LBA'),
  licence('l2', 'EASA', 'PPL(A)', 'DE.FCL.PPL.A.22109', '2012-09-14', 'LBA'),
  licence('l3', 'EASA', 'FI(S)', 'DE.SFCL.FI.0412', '2016-03-19', 'LBA'),
];
const classRatings = {
  l1: [classRating('cr1', 'l1', 'GLIDER', '2006-07-21')],
  l2: [classRating('cr3', 'l2', 'SEP_LAND', '2012-09-14', { expiryDate: SEP_EXPIRY })],
  l3: [],
};
const privileges = [
  privilege('pv1', 'l2', 'SAILPLANE_TOWING', { issuedOn: '2013-06-01', notes: 'Club DR400 D-EPTW' }),
  privilege('pv2', 'l1', 'CLOUD_FLYING', { issuedOn: '2014-05-30' }),
  privilege('pv3', 'l3', 'FI_S', { issuedOn: '2016-03-19' }),
];
const credentials = [credential('c1', 'EASA_CLASS2_MEDICAL', 'MED-77120', '2025-06-02', '2027-06-02', 'AeMC Nürnberg')];
const STUDENTS = ['Felix Roth', 'Lea Schubert', 'Noah Kraus'];
const contacts = STUDENTS.map((name, i) => ({ id: `p${i + 1}`, userId: 'u1', name, email: null, phone: null, notes: 'Student', createdAt: iso('2025-04-01'), updatedAt: iso('2025-04-01') }));

function season(seed, from, to) {
  const rand = rng(seed);
  const out = [];
  weekends(from, to).forEach((date, i) => {
    const r = rand();
    if (r < 0.28) {
      const outland = rand() < 0.12;
      const away = !outland && rand() < 0.12;
      const minutes = between(rand, 190, 440);
      const km = between(rand, 300, 720);
      const to = outland ? 'Außenlandung Wiese bei Pegnitz' : away ? 'EDQC' : 'EDQD';
      out.push(flight({
        date, reg: 'D-KXYZ', type: 'AS29', from: 'EDQD', to, depTime: '11:20', minutes,
        launchMethod: i % 11 === 0 ? 'aerotow' : 'self-launch', distance: distanceNm(airports, 'EDQD', to), xc: minutes,
        remarks: outland ? `Outlanding, field near Pegnitz after ${km} km` : away ? `Final glide short, landed Coburg — ${km} km` : `Out-and-return ${km} km (OLC)`,
      }));
    } else if (r < 0.43) {
      let t = '10:30';
      for (let k = 0, n = between(rand, 5, 8); k < n; k++) {
        const minutes = between(rand, 12, 18);
        out.push({ ...flight({ date, reg: 'D-EPTW', type: 'DR40', from: 'EDQD', to: 'EDQD', offBlock: addTime(t, -4), onBlock: addTime(t, minutes + 3), depTime: t, minutes: minutes + 7, remarks: 'Glider tow' }), isTowFlight: true });
        t = addTime(t, minutes + between(rand, 20, 40));
      }
    } else if (r < 0.58) {
      let t = '10:00';
      for (let k = 0, n = between(rand, 3, 5); k < n; k++) {
        const minutes = between(rand, 6, 11);
        const student = pick(rand, STUDENTS);
        out.push(flight({ date, reg: 'D-7021', type: 'AS21', from: 'EDQD', to: 'EDQD', depTime: t, minutes, role: 'instructor', launchMethod: 'winch', crew: [{ name: student, role: 'Student', contactId: `p${STUDENTS.indexOf(student) + 1}` }] }));
        t = addTime(t, minutes + 30);
      }
    }
  });
  return out;
}

const flights = [
  ...season(2025, '2025-04-05', '2025-10-12'),
  ...season(2026, '2026-04-04', day(0)),
  flight({ date: '2026-03-21', reg: 'D-EPTW', type: 'DR40', from: 'EDQD', to: 'EDQM', offBlock: '09:50', onBlock: '11:15', depTime: '10:00', minutes: 75, role: 'dual', landings: 3, distance: distanceNm(airports, 'EDQD', 'EDQM'), crew: [{ name: 'Rainer Engel', role: 'Instructor' }], instructorName: 'Rainer Engel', remarks: 'FCL.740.A refresher training' }),
];

const isGlider = (f, ac) => ac?.aircraftClass === 'GLIDER';
const isSEP = (f, ac) => ac?.aircraftClass === 'SEP_LAND';

function currency(fl, acByReg) {
  const g = tally(fl, acByReg, isGlider, 730);
  const spl = [
    req('requirement.flight_time', g.picOrDual, 300, 'minutes'),
    req('requirement.launches', g.launches, 15, 'launches'),
    req('requirement.training_flights', g.trainingFlights, 2, 'flights'),
    profCheck('2025-05-10'),
  ];
  const sep = tally(fl, acByReg, isSEP, daysAgo('2026-03-04'));
  const sepReqs = [
    req('requirement.total_time', sep.minutes, 720, 'minutes'),
    req('requirement.pic_time', sep.pic, 360, 'minutes'),
    req('requirement.landings', sep.landings, 12, 'landings'),
    req('requirement.refresher_training', sep.instructorMinutes, 60, 'minutes'),
  ];
  const sepMet = sepReqs.every((r) => r.met);
  const tows = tally(fl, acByReg, (f, ac) => f.isTowFlight && ac?.aircraftClass !== 'ULTRALIGHT', 730);
  const cloud = tally(fl, acByReg, (f, ac) => isGlider(f, ac) && f.picTime > 0 && f.ifrTime > 0, 730);
  const instruction = tally(fl, acByReg, (f, ac) => ['GLIDER', 'TMG'].includes(ac?.aircraftClass) && f.dualGivenTime > 0, 1096);
  const [towing, cloudFlying, fis] = privileges;
  return {
    ratings: [
      {
        classRatingId: 'cr1', classType: 'GLIDER', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL',
        ...recencyStatus(spl), windowOpen: false, ruleDescriptionKey: 'easa_spl', countedClasses: ['GLIDER', 'TMG'],
        requirements: spl, launchMethodCurrency: launchMethodRows(fl, acByReg, isGlider),
      },
      {
        classRatingId: 'cr3', classType: 'SEP_LAND', licenseId: 'l2', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
        status: sepMet ? 'current' : 'expiring', messageKey: sepMet ? 'rating.revalidation_current' : 'rating.revalidation_not_met',
        expiryDate: SEP_EXPIRY, windowOpensAt: '2026-03-04', windowOpen: true, ruleDescriptionKey: 'easa_sep_tmg',
        countedClasses: ['SEP_LAND', 'TMG'], creditedUltralightKinds: ['THREE_AXIS', 'THREE_AXIS_MOTORGLIDER'], requirements: sepReqs,
      },
    ],
    passengerCurrency: [
      easaPax('GLIDER', fl, acByReg, isGlider, { picOnly: true, ruleDescriptionKey: 'easa_spl_pax', spl115IssueDate: '2006-07-21' }),
      easaPax('SEP_LAND', fl, acByReg, isSEP, { nightPrivilege: true }),
    ],
    privileges: [
      privilegeCurrency(cloudFlying, 'sfcl_215_cloud_flying', [
        privilegeReq('requirement.cloud_flying_time', cloud, 'ifr', 60, 'minutes', 24, 'remedy.privilege_with_instructor'),
        privilegeReq('requirement.cloud_flying_flights', cloud, 'flights', 5, 'flights', 24, 'remedy.privilege_with_instructor'),
      ]),
      privilegeCurrency(towing, 'sfcl_205_towing', [
        privilegeReq('requirement.tows', tows, 'launches', 5, 'tows', 24, 'remedy.privilege_with_instructor'),
      ]),
      privilegeCurrency(fis, 'sfcl_360_fi_s', [
        privilegeReq('requirement.instruction_time', instruction, 'dualGiven', 1800, 'minutes', 36),
        privilegeReq('requirement.instruction_launches', instruction, 'launches', 60, 'launches', 36),
        untracked('requirement.fi_refresher', 'training'),
      ]),
    ],
  };
}

export default {
  id: 'petra',
  user, aircraft, licenses, classRatings, privileges, credentials, contacts, flights, currency, airports,
  profileSettings: { disciplines: Object.fromEntries(['SAILPLANE', 'AEROPLANE', 'INSTRUCTOR'].map((d) => [d, { acknowledgedAt: iso('2024-11-02T18:00:00Z') }])) },
  expectedDisciplines: { SAILPLANE: 'active', AEROPLANE: 'active', INSTRUCTOR: 'active' },
  shotAircraft: ['D-KXYZ', 'D-EPTW'],
};
