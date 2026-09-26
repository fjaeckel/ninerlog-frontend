/**
 * G1 — Mark, airline first officer (guard, PERSONAS.md). ATPL(A) with IR and
 * the A320 type rating; IFR multi-pilot sectors out of Frankfurt as SIC,
 * some at night; OPC/LPC in the full-flight simulator; a club C172 on
 * weekends.
 */
import {
  makeUser, aircraftRecord, licence, classRating, credential, flight, rng, between, pick, addDays, addTime, day, daysAgo, iso,
  tally, req, profCheck, easaPax, distanceNm
} from './build.mjs';

const user = makeUser({ id: 'u1', email: 'mark.weber@example.com', name: 'Mark Weber', recencyPerRegistration: true, createdAt: iso('2023-11-12') });

const airports = {
  EDDF: { name: 'Frankfurt am Main', country: 'DE', lat: 50.0333, lon: 8.5706 },
  LEPA: { name: 'Palma de Mallorca', country: 'ES', lat: 39.5517, lon: 2.7388 },
  LIRF: { name: 'Rome Fiumicino', country: 'IT', lat: 41.8003, lon: 12.2389 },
  EGLL: { name: 'London Heathrow', country: 'GB', lat: 51.47, lon: -0.4543 },
  LPPT: { name: 'Lisbon', country: 'PT', lat: 38.7813, lon: -9.1359 },
  ESSA: { name: 'Stockholm Arlanda', country: 'SE', lat: 59.6519, lon: 17.9186 },
  EDFE: { name: 'Frankfurt-Egelsbach', country: 'DE', lat: 49.9608, lon: 8.6436 },
  EDFZ: { name: 'Mainz-Finthen', country: 'DE', lat: 49.9686, lon: 8.1472 },
};

const a320 = (id, reg) => aircraftRecord(id, reg, 'A320', 'Airbus', 'A320-214', 'MEP_LAND', {
  isComplex: true, isHighPerformance: true, isMultiPilot: true, defaultDepartureIcao: 'EDDF',
});
const aircraft = [
  a320('a1', 'D-AIUA'), a320('a2', 'D-AIUB'), a320('a3', 'D-AIUC'),
  aircraftRecord('a4', 'D-EMKC', 'C172', 'Cessna', '172S Skyhawk', 'SEP_LAND', { defaultDepartureIcao: 'EDFE', notes: 'Club aircraft.' }),
];

const IR_EXPIRY = '2027-04-30';
const SEP_EXPIRY = '2027-06-30';
const licenses = [licence('l1', 'EASA', 'ATPL(A)', 'DE.FCL.ATPL.A.30456', '2016-10-04', 'LBA')];
const classRatings = {
  l1: [
    classRating('cr1', 'l1', 'IR', '2016-10-04', { expiryDate: IR_EXPIRY }),
    classRating('cr2', 'l1', 'OTHER', '2017-02-15', { expiryDate: IR_EXPIRY, notes: 'A320 type rating (MPA)' }),
    classRating('cr3', 'l1', 'SEP_LAND', '2014-05-20', { expiryDate: SEP_EXPIRY }),
  ],
};
const credentials = [
  credential('c1', 'EASA_CLASS1_MEDICAL', 'MED-1-99231', '2026-02-01', '2027-02-01', 'AeMC Frankfurt'),
  credential('c2', 'LANG_ICAO_LEVEL6', 'ELP-6', '2016-10-04', null, 'LBA', 'Lifetime validity.'),
];
const CAPTAINS = ['Capt. Sven Albers', 'Capt. Ines Brandt', 'Capt. Marco Rossi', 'Capt. Julia Hahn'];

function roster() {
  const rand = rng(320);
  const out = [];
  for (let date = '2026-02-02'; date <= day(0); date = addDays(date, between(rand, 2, 5))) {
    const dest = pick(rand, ['LEPA', 'LIRF', 'EGLL', 'LPPT', 'ESSA']);
    const late = rand() < 0.35;
    const captain = pick(rand, CAPTAINS);
    let off = late ? '19:40' : '06:25';
    for (const [from, to] of [['EDDF', dest], [dest, 'EDDF']]) {
      const d = distanceNm(airports, from, to);
      const block = Math.round(d / 7.2) + 28;
      const air = block - 18;
      const night = late ? Math.round(block * (from === 'EDDF' ? 0.4 : 1)) : 0;
      out.push(flight({
        date, reg: pick(rand, ['D-AIUA', 'D-AIUB', 'D-AIUC']), type: 'A320', from, to, role: 'sic',
        offBlock: off, onBlock: addTime(off, block), depTime: addTime(off, 12), minutes: block,
        ifr: block, night, landings: rand() < 0.5 ? 1 : 0, nightLandings: 0, distance: d, picName: captain,
        approaches: [{ type: pick(rand, ['ILS', 'ILS', 'RNP']), airport: to }],
        crew: [{ name: captain, role: 'PIC' }],
      }));
      off = addTime(off, block + 45);
    }
    const last = out[out.length - 1];
    if (last.allLandings === 0) Object.assign(last, { landingsDay: late ? 0 : 1, landingsNight: late ? 1 : 0, allLandings: 1, takeoffsDay: late ? 0 : 1, takeoffsNight: late ? 1 : 0 });
  }
  return out;
}

const sims = ['2025-11-10', '2026-05-12'].map((date, i) => flight({
  date, type: 'A320', minutes: 240, role: 'sic', sim: { fstdType: 'FFS A320' }, proficiencyCheck: i === 1,
  remarks: i === 1 ? 'OPC/LPC incl. IR revalidation' : 'Recurrent training',
}));

const club = [
  ['2026-05-24', 'EDFE', 'EDFZ'], ['2026-05-24', 'EDFZ', 'EDFE'], ['2026-06-21', 'EDFE', 'EDFE'],
  ['2026-07-12', 'EDFE', 'EDFZ'], ['2026-07-12', 'EDFZ', 'EDFE'], ['2026-08-09', 'EDFE', 'EDFE'],
].map(([date, from, to]) => flight({
  date, reg: 'D-EMKC', type: 'C172', from, to, offBlock: '10:00', onBlock: '10:50', depTime: '10:08', minutes: 50,
  landings: from === to ? 4 : 1, distance: distanceNm(airports, from, to),
}));

const flights = [...roster(), ...sims, ...club];

const isSEP = (f, ac) => ac?.aircraftClass === 'SEP_LAND';

function currency(fl, acByReg) {
  const ir = tally(fl, acByReg, () => true, daysAgo('2026-04-30'));
  const irReqs = [req('requirement.ifr_time', ir.ifr, 600, 'minutes'), profCheck('2026-05-12')];
  const sep = tally(fl, acByReg, isSEP, daysAgo('2026-06-30'));
  const sepReqs = [
    req('requirement.total_time', sep.minutes, 720, 'minutes'),
    req('requirement.pic_time', sep.pic, 360, 'minutes'),
    req('requirement.landings', sep.landings, 12, 'landings'),
    req('requirement.refresher_training', sep.instructorMinutes, 60, 'minutes'),
  ];
  const sepMet = sepReqs.every((r) => r.met);
  return {
    ratings: [
      {
        classRatingId: 'cr1', classType: 'IR', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'ATPL(A)',
        status: 'current', messageKey: 'rating.revalidation_current', expiryDate: IR_EXPIRY, windowOpensAt: '2026-04-30', windowOpen: true,
        ruleDescriptionKey: 'easa_ir', requirements: irReqs,
      },
      {
        classRatingId: 'cr2', classType: 'OTHER', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'ATPL(A)',
        status: 'current', messageKey: 'rating.valid_until', expiryDate: IR_EXPIRY,
      },
      {
        classRatingId: 'cr3', classType: 'SEP_LAND', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'ATPL(A)',
        status: sepMet ? 'current' : 'expiring', messageKey: sepMet ? 'rating.revalidation_current' : 'rating.revalidation_not_met',
        expiryDate: SEP_EXPIRY, windowOpensAt: '2026-06-30', windowOpen: true, ruleDescriptionKey: 'easa_sep_tmg',
        countedClasses: ['SEP_LAND', 'TMG'], creditedUltralightKinds: ['THREE_AXIS', 'THREE_AXIS_MOTORGLIDER'], requirements: sepReqs,
      },
    ],
    passengerCurrency: [easaPax('SEP_LAND', fl, acByReg, isSEP, { nightPrivilege: true, irWaiver: true })],
  };
}

export default {
  id: 'mark',
  user, aircraft, licenses, classRatings, credentials, contacts: [], flights, currency, airports,
  profileSettings: { disciplines: Object.fromEntries(['AEROPLANE', 'IFR', 'MULTI_CREW', 'SIMULATOR'].map((d) => [d, { acknowledgedAt: iso('2023-11-12T18:00:00Z') }])) },
  expectedDisciplines: { AEROPLANE: 'active', IFR: 'active', MULTI_CREW: 'active', SIMULATOR: 'active' },
  shotAircraft: ['D-AIUA', 'D-EMKC'],
};
