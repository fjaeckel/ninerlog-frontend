/**
 * C4 — Heinz, 40 years of flying, migrating in (PERSONAS.md). Paper
 * logbooks 1986–2011 carried in as an initial-hours snapshot; 2011 onward
 * imported flight by flight from his previous logbook app. SEP club and
 * syndicate aircraft out of Aachen, with a night rating.
 */
import {
  makeUser, aircraftRecord, licence, classRating, credential, flight, rng, between, pick, addDays, addTime, day, daysAgo, iso,
  tally, req, easaPax, distanceNm,
} from './build.mjs';

const user = makeUser({ id: 'u1', email: 'heinz.vogt@example.com', name: 'Heinz Vogt', createdAt: iso('2026-06-02') });

const airports = {
  EDKA: { name: 'Aachen-Merzbrück', country: 'DE', lat: 50.8231, lon: 6.1861 },
  EDLN: { name: 'Mönchengladbach', country: 'DE', lat: 51.2303, lon: 6.5044 },
  EDKB: { name: 'Bonn-Hangelar', country: 'DE', lat: 50.7689, lon: 7.1633 },
  EBSP: { name: 'Spa-La Sauvenière', country: 'BE', lat: 50.4825, lon: 5.9103 },
  EHBK: { name: 'Maastricht Aachen', country: 'NL', lat: 50.9117, lon: 5.7701 },
  EDRT: { name: 'Trier-Föhren', country: 'DE', lat: 49.8639, lon: 6.7875 },
  EDFE: { name: 'Frankfurt-Egelsbach', country: 'DE', lat: 49.9608, lon: 8.6436 },
};

const aircraft = [
  aircraftRecord('a1', 'D-EHVG', 'PA28', 'Piper', 'PA-28-181 Archer II', 'SEP_LAND', { defaultDepartureIcao: 'EDKA', notes: 'Syndicate aircraft, 1/4 share.' }),
  aircraftRecord('a2', 'D-EAAC', 'C172', 'Cessna', '172N Skyhawk', 'SEP_LAND', { defaultDepartureIcao: 'EDKA', notes: 'Club aircraft.' }),
  aircraftRecord('a3', 'D-EMUL', 'DR40', 'Robin', 'DR400/180 Régent', 'SEP_LAND', { defaultDepartureIcao: 'EDKA', isActive: false, notes: 'Sold by the club in 2019.' }),
  aircraftRecord('a4', 'D-EFKW', 'C150', 'Cessna', '150M', 'SEP_LAND', { isActive: false, notes: 'Imported from the old app.' }),
];

const baseline = {
  baselineDate: '2011-03-31',
  totalFlights: 2914, totalMinutes: 127_320, picMinutes: 118_050, sicMinutes: 0, dualMinutes: 9_270, dualGivenMinutes: 0,
  multiPilotMinutes: 0, nightMinutes: 4_380, ifrMinutes: 0, soloMinutes: 1_410, crossCountryMinutes: 61_200,
  picusMinutes: 0, spicMinutes: 0, examinerMinutes: 0, reliefMinutes: 0, landingsDay: 4_870, landingsNight: 212,
  notes: 'Paper logbooks 1–4, 1986-05-17 to 2011-03-31, totals checked against the last page of book 4.',
  createdAt: iso('2026-06-02T19:10:00Z'), updatedAt: iso('2026-06-02T19:10:00Z'),
};

const SEP_EXPIRY = '2027-05-31';
const licenses = [licence('l1', 'EASA', 'PPL(A)', 'DE.FCL.PPL.A.00731', '1986-05-17', 'LBA', { notes: 'Converted from the national PPL-A in 2012.' })];
const classRatings = { l1: [classRating('cr1', 'l1', 'SEP_LAND', '1986-05-17', { expiryDate: SEP_EXPIRY })] };
const credentials = [
  credential('c1', 'EASA_CLASS2_MEDICAL', 'MED-2-00731', '2026-03-12', '2027-03-12', 'AeMC Aachen'),
  credential('c2', 'LANG_ICAO_LEVEL6', 'ELP-6', '2012-04-01', null, 'LBA'),
  credential('c3', 'RADIO_BZF1', 'BZF-I-0099', '1986-02-01', null, 'BNetzA'),
];

const REGS = {
  '2011-04-01': ['D-EFKW', 'D-EMUL', 'D-EAAC'],
  '2019-06-01': ['D-EAAC', 'D-EHVG', 'D-EHVG'],
};
const TYPE = { 'D-EHVG': 'PA28', 'D-EAAC': 'C172', 'D-EMUL': 'DR40', 'D-EFKW': 'C150' };
const SPEED = { 'D-EHVG': 2.0, 'D-EAAC': 1.8, 'D-EMUL': 2.1, 'D-EFKW': 1.5 };

function history() {
  const rand = rng(1986);
  const out = [];
  for (let date = '2011-04-02'; date <= day(0); date = addDays(date, between(rand, 3, 9))) {
    const fleet = date >= '2019-06-01' ? REGS['2019-06-01'] : REGS['2011-04-01'];
    const reg = pick(rand, fleet);
    if (rand() < 0.35) {
      out.push(flight({ date, reg, type: TYPE[reg], from: 'EDKA', to: 'EDKA', offBlock: '10:00', onBlock: '10:45', depTime: '10:08', minutes: 45, landings: between(rand, 3, 6), remarks: 'Platzrunden' }));
      continue;
    }
    const dest = pick(rand, ['EDLN', 'EDKB', 'EBSP', 'EHBK', 'EDRT', 'EDFE']);
    const late = !['04', '05', '06', '07', '08', '09'].includes(date.slice(5, 7)) && rand() < 0.12;
    let off = late ? '16:30' : '08:45';
    for (const [from, to] of [['EDKA', dest], [dest, 'EDKA']]) {
      const d = distanceNm(airports, from, to);
      const block = Math.round(d / SPEED[reg]) + 15;
      const night = late && to === 'EDKA' ? Math.min(block, 30) : 0;
      out.push(flight({
        date, reg, type: TYPE[reg], from, to, offBlock: off, onBlock: addTime(off, block), depTime: addTime(off, 8),
        minutes: block, night, nightLandings: night ? 1 : 0, distance: d,
      }));
      off = addTime(off, block + 75);
    }
  }
  return out;
}

const refresher = flight({
  date: '2026-06-20', reg: 'D-EAAC', type: 'C172', from: 'EDKA', to: 'EDKA', offBlock: '14:00', onBlock: '15:10', depTime: '14:08',
  minutes: 70, landings: 5, role: 'dual', instructorName: 'Ines Hartmann', crew: [{ name: 'Ines Hartmann', role: 'Instructor' }],
  remarks: 'SEP refresher training FCL.740.A(b)(1)(ii)',
});

const flights = [...history(), refresher];

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
  id: 'heinz',
  user, aircraft, baseline, licenses, classRatings, credentials, contacts: [], flights, currency, airports,
  profileSettings: { disciplines: { AEROPLANE: { acknowledgedAt: iso('2026-06-02T18:00:00Z') } } },
  expectedDisciplines: { AEROPLANE: 'active' },
  shotAircraft: ['D-EHVG', 'D-EAAC'],
};
