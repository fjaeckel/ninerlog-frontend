/**
 * C2 — Claudia, PPL(A) aircraft owner with SEP, MEP and IR (PERSONAS.md).
 * Her own Mooney M20J out of Mannheim, IFR trips across Germany and to
 * neighbouring countries, some at night; a school PA-44 Seminole for the
 * MEP and multi-engine IR proficiency check.
 */
import {
  makeUser, aircraftRecord, licence, classRating, credential, flight, reminder, rng, between, pick, addDays, addTime, day, daysAgo, iso,
  tally, req, profCheck, easaPax, distanceNm,
} from './build.mjs';

const user = makeUser({ id: 'u1', email: 'claudia.kramer@example.com', name: 'Claudia Kramer', createdAt: iso('2024-01-20') });

const airports = {
  EDFM: { name: 'Mannheim City', country: 'DE', lat: 49.4731, lon: 8.5142 },
  EDDS: { name: 'Stuttgart', country: 'DE', lat: 48.6899, lon: 9.2220 },
  EDDN: { name: 'Nürnberg', country: 'DE', lat: 49.4987, lon: 11.0781 },
  EDDH: { name: 'Hamburg', country: 'DE', lat: 53.6304, lon: 9.9882 },
  LSZH: { name: 'Zürich', country: 'CH', lat: 47.4647, lon: 8.5492 },
  LFSB: { name: 'Basel-Mulhouse', country: 'FR', lat: 47.5896, lon: 7.5299 },
  EHRD: { name: 'Rotterdam', country: 'NL', lat: 51.9569, lon: 4.4372 },
  EDFE: { name: 'Frankfurt-Egelsbach', country: 'DE', lat: 49.9608, lon: 8.6436 },
};

const aircraft = [
  aircraftRecord('a1', 'D-EMCK', 'M20J', 'Mooney', 'M20J 201', 'SEP_LAND', {
    isComplex: true, defaultDepartureIcao: 'EDFM', notes: 'Owned. Hangar 3, Mannheim.',
  }),
  aircraftRecord('a2', 'D-GSEM', 'PA44', 'Piper', 'PA-44-180 Seminole', 'MEP_LAND', {
    isComplex: true, defaultDepartureIcao: 'EDFE', notes: 'Flight school twin, rented for the MEP check.',
  }),
];

const reminders = [
  reminder('r1', 'a1', 'D-EMCK', 'ARC', day(23), { intervalMonths: 12, lastDoneOn: '2025-09-08' }),
  reminder('r2', 'a1', 'D-EMCK', 'ANNUAL_INSPECTION', day(64), { intervalMonths: 12, lastDoneOn: '2025-10-19' }),
  reminder('r3', 'a1', 'D-EMCK', 'ELT_BATTERY', '2027-04-30', { notes: 'Artex ME406' }),
  reminder('r4', 'a1', 'D-EMCK', 'INSURANCE', day(137), { intervalMonths: 12, label: 'Hull + liability' }),
];

const SEP_EXPIRY = '2027-03-31';
const MEP_EXPIRY = '2027-02-28';
const IR_EXPIRY = '2027-02-28';
const licenses = [licence('l1', 'EASA', 'PPL(A)', 'DE.FCL.PPL.A.40912', '2011-07-15', 'LBA')];
const classRatings = {
  l1: [
    classRating('cr1', 'l1', 'SEP_LAND', '2011-07-15', { expiryDate: SEP_EXPIRY }),
    classRating('cr2', 'l1', 'MEP_LAND', '2019-02-11', { expiryDate: MEP_EXPIRY }),
    classRating('cr3', 'l1', 'IR', '2017-05-30', { expiryDate: IR_EXPIRY, notes: 'IR(A) SE/ME' }),
  ],
};
const credentials = [
  credential('c1', 'EASA_CLASS2_MEDICAL', 'MED-2-66120', '2026-04-02', '2027-04-02', 'AeMC Heidelberg'),
  credential('c2', 'LANG_ICAO_LEVEL5', 'ELP-5', '2021-06-01', '2027-06-01', 'LBA'),
  credential('c3', 'RADIO_BZF1', 'BZF-I-8812', '2011-03-01', null, 'BNetzA'),
];

function trips() {
  const rand = rng(202);
  const out = [];
  for (let date = '2025-02-15'; date <= day(0); date = addDays(date, between(rand, 9, 20))) {
    const dest = pick(rand, ['EDDS', 'EDDN', 'EDDH', 'LSZH', 'LFSB', 'EHRD']);
    const late = !['04', '05', '06', '07', '08', '09'].includes(date.slice(5, 7)) && rand() < 0.35;
    let off = late ? '16:40' : '07:10';
    for (const [from, to] of [['EDFM', dest], [dest, 'EDFM']]) {
      const d = distanceNm(airports, from, to);
      const block = Math.round(d / 2.4) + 20;
      const ifr = Math.round(block * (rand() < 0.4 ? 0.9 : 0.6));
      const night = late && to === 'EDFM' ? Math.min(block, 45) : 0;
      out.push(flight({
        date, reg: 'D-EMCK', type: 'M20J', from, to, offBlock: off, onBlock: addTime(off, block), depTime: addTime(off, 10),
        minutes: block, ifr, actualInstrument: Math.round(ifr * 0.3), night, nightLandings: night ? 1 : 0, distance: d,
        approaches: [{ type: pick(rand, ['ILS', 'RNP', 'ILS']), airport: to }],
      }));
      off = addTime(off, block + 120);
    }
  }
  return out;
}

const INSTRUCTOR = { name: 'Frank Ostermann', role: 'Examiner' };
const twin = [
  ['2026-01-24', false], ['2026-02-07', true],
].map(([date, check]) => flight({
  date, reg: 'D-GSEM', type: 'PA44', from: 'EDFE', to: 'EDFE', offBlock: '09:30', onBlock: '11:05', depTime: '09:42', minutes: 95,
  ifr: 70, landings: 3, approaches: [{ type: 'ILS', airport: 'EDDF' }, { type: 'RNP', airport: 'EDFE' }], holds: 1,
  proficiencyCheck: check, crew: [INSTRUCTOR], instructorName: INSTRUCTOR.name,
  remarks: check ? 'MEP and IR(A) ME proficiency check' : 'Refresher before the check',
}));

const flights = [...trips(), ...twin];

const isSEP = (f, ac) => ac?.aircraftClass === 'SEP_LAND';
const isMEP = (f, ac) => ac?.aircraftClass === 'MEP_LAND';

function currency(fl, acByReg) {
  const sep = tally(fl, acByReg, isSEP, daysAgo('2026-03-31'));
  const sepReqs = [
    req('requirement.total_time', sep.minutes, 720, 'minutes'),
    req('requirement.pic_time', sep.pic, 360, 'minutes'),
    req('requirement.landings', sep.landings, 12, 'landings'),
    req('requirement.refresher_training', sep.instructorMinutes, 60, 'minutes'),
  ];
  const sepMet = sepReqs.every((r) => r.met);
  const mep = tally(fl, acByReg, isMEP, daysAgo('2026-02-28'));
  const ir = tally(fl, acByReg, () => true, daysAgo('2026-02-28'));
  return {
    ratings: [
      {
        classRatingId: 'cr3', classType: 'IR', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
        status: 'current', messageKey: 'rating.revalidation_current', expiryDate: IR_EXPIRY, windowOpensAt: '2026-11-28', windowOpen: false,
        ruleDescriptionKey: 'easa_ir', requirements: [req('requirement.ifr_time', ir.ifr, 600, 'minutes'), profCheck('2026-02-07')],
      },
      {
        classRatingId: 'cr2', classType: 'MEP_LAND', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
        status: 'current', messageKey: 'rating.revalidation_current', expiryDate: MEP_EXPIRY, windowOpensAt: '2026-11-28', windowOpen: false,
        ruleDescriptionKey: 'easa_mep_set', requirements: [req('requirement.route_sectors', mep.flights, 10, 'flights'), profCheck('2026-02-07')],
      },
      {
        classRatingId: 'cr1', classType: 'SEP_LAND', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'PPL(A)',
        status: sepMet ? 'current' : 'expiring', messageKey: sepMet ? 'rating.revalidation_current' : 'rating.revalidation_not_met',
        expiryDate: SEP_EXPIRY, windowOpensAt: '2026-03-31', windowOpen: true, ruleDescriptionKey: 'easa_sep_tmg',
        countedClasses: ['SEP_LAND', 'TMG'], creditedUltralightKinds: ['THREE_AXIS', 'THREE_AXIS_MOTORGLIDER'], requirements: sepReqs,
      },
    ],
    passengerCurrency: [
      easaPax('SEP_LAND', fl, acByReg, isSEP, { nightPrivilege: true, irWaiver: true }),
      easaPax('MEP_LAND', fl, acByReg, isMEP, { nightPrivilege: true, irWaiver: true }),
    ],
  };
}

export default {
  id: 'claudia',
  user, aircraft, reminders, licenses, classRatings, credentials, contacts: [], flights, currency, airports,
  profileSettings: { disciplines: Object.fromEntries(['AEROPLANE', 'IFR'].map((d) => [d, { acknowledgedAt: iso('2024-01-20T18:00:00Z') }])) },
  expectedDisciplines: { AEROPLANE: 'active', IFR: 'active' },
  shotAircraft: ['D-EMCK', 'D-GSEM'],
};
