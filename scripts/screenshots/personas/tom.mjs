/**
 * C1 — Tom, FAA private pilot with an instrument rating (PERSONAS.md).
 * Owns a Cessna 182T based at Frederick, Maryland; flies IFR to family and
 * business in the Mid-Atlantic, keeps instrument currency with approaches
 * and holds, some night legs. US display preferences throughout.
 */
import {
  makeUser, aircraftRecord, licence, classRating, credential, flight, rng, between, pick, addDays, addTime, day, iso,
  paxLandings, distanceNm,
} from './build.mjs';

const user = makeUser({
  id: 'u1', email: 'tom.brooks@example.com', name: 'Tom Brooks', createdAt: iso('2025-11-02'),
  timeDisplayFormat: 'decimal', dateFormat: 'MM/DD/YYYY', clockFormat: '12h', decimalSeparator: 'dot',
});

const airports = {
  KFDK: { name: 'Frederick Municipal', country: 'US', lat: 39.4176, lon: -77.3743 },
  KHGR: { name: 'Hagerstown Regional', country: 'US', lat: 39.7079, lon: -77.7295 },
  KMRB: { name: 'Eastern WV Regional', country: 'US', lat: 39.4019, lon: -77.9846 },
  KCHO: { name: 'Charlottesville-Albemarle', country: 'US', lat: 38.1386, lon: -78.4529 },
  KACY: { name: 'Atlantic City Intl', country: 'US', lat: 39.4576, lon: -74.5772 },
  KPIT: { name: 'Pittsburgh Intl', country: 'US', lat: 40.4915, lon: -80.2329 },
  KMDT: { name: 'Harrisburg Intl', country: 'US', lat: 40.1935, lon: -76.7634 },
  W29: { name: 'Bay Bridge', country: 'US', lat: 38.9765, lon: -76.3300 },
};

const aircraft = [
  aircraftRecord('a1', 'N734TB', 'C182', 'Cessna', '182T Skylane', 'SEP_LAND', {
    isComplex: false, isHighPerformance: true, defaultDepartureIcao: 'KFDK', notes: 'Owned. G1000 NXi.',
  }),
];

const IR_ISSUED = '2014-10-03';
const licenses = [licence('l1', 'FAA', 'PRIVATE', '3847261', '2009-06-12', 'FAA')];
const classRatings = {
  l1: [
    classRating('cr1', 'l1', 'SEP_LAND', '2009-06-12', { notes: 'Airplane single-engine land' }),
    classRating('cr2', 'l1', 'IR', IR_ISSUED, { notes: 'Instrument airplane' }),
  ],
};
const credentials = [credential('c1', 'FAA_CLASS3_MEDICAL', 'M3-2025-88121', '2025-03-19', '2027-03-31', 'FAA AME, Frederick MD')];

function trips() {
  const rand = rng(6157);
  const out = [];
  for (let date = '2025-09-06'; date <= day(0); date = addDays(date, between(rand, 5, 14))) {
    const dest = pick(rand, ['KHGR', 'KMRB', 'KCHO', 'KACY', 'KPIT', 'KMDT', 'W29']);
    const late = !['04', '05', '06', '07', '08', '09'].includes(date.slice(5, 7)) && rand() < 0.4;
    let off = late ? '22:40' : '13:00';
    for (const [from, to] of [['KFDK', dest], [dest, 'KFDK']]) {
      const d = distanceNm(airports, from, to);
      const block = Math.round(d / 2.35) + 18;
      const ifr = dest === 'W29' ? 0 : Math.round(block * 0.8);
      const night = late && to === 'KFDK' ? Math.min(block, 50) : 0;
      out.push(flight({
        date, reg: 'N734TB', type: 'C182', from, to, offBlock: off, onBlock: addTime(off, block), depTime: addTime(off, 12),
        minutes: block, ifr, actualInstrument: Math.round(ifr * 0.35), night, nightLandings: night ? 1 : 0, distance: d,
        approaches: ifr ? [{ type: pick(rand, ['ILS', 'RNAV/GPS', 'RNAV/GPS', 'LOC']), airport: to }] : [],
        holds: ifr && rand() < 0.2 ? 1 : 0,
      }));
      off = addTime(off, block + 150);
    }
  }
  return out;
}

const REVIEWER = { name: 'Dana Whitfield, CFII', role: 'Instructor' };
const review = flight({
  date: '2025-05-17', reg: 'N734TB', type: 'C182', from: 'KFDK', to: 'KFDK', offBlock: '08:30', onBlock: '10:15', depTime: '08:42', minutes: 105,
  role: 'dual', ifr: 40, landings: 6, approaches: [{ type: 'ILS', airport: 'KFDK' }, { type: 'RNAV/GPS', airport: 'KFDK' }], holds: 1,
  flightReview: true, ipc: true, crew: [REVIEWER], instructorName: REVIEWER.name, remarks: 'Flight review (61.56) and IPC (61.57(d))',
});

const flights = [...trips(), review];

const isSEP = (f, ac) => ac?.aircraftClass === 'SEP_LAND';

function currency(fl, acByReg) {
  const since = (months) => new Date(Date.UTC(2026, 7 - months, 16)).toISOString().slice(0, 10);
  const recent = fl.filter((f) => f.date >= since(6) && !f.isSimulator);
  const approaches = recent.reduce((n, f) => n + f.approachesCount, 0);
  const holds = recent.reduce((n, f) => n + f.holds, 0);
  const irMet = approaches >= 6 && holds >= 1;
  const n = paxLandings(fl, acByReg, isSEP, true);
  const nightFullStop = fl.filter((f) => f.date >= since(3) && isSEP(f, acByReg[f.aircraftReg])).reduce((s, f) => s + f.landingsNight, 0);
  const dayOk = n.day >= 3;
  const nightOk = nightFullStop >= 3;
  const row = (nameKey, current, required, unit) => ({ nameKey, met: current >= required, current, required, unit, messageKey: 'requirement.progress' });
  const paxMsg = !dayOk ? ['rating.pax_not_current', { needed: 3 - n.day }] : !nightOk ? ['rating.pax_day_current_night_not', { needed: 3 - nightFullStop }] : ['rating.pax_current_day_night', null];
  return {
    ratings: [
      {
        classRatingId: 'cr2', classType: 'IR', licenseId: 'l1', regulatoryAuthority: 'FAA', licenseType: 'PRIVATE',
        status: irMet ? 'current' : 'expiring', messageKey: irMet ? 'rating.ir_current' : 'rating.ir_lapsed_safety_pilot',
        ruleDescriptionKey: 'faa_ir',
        requirements: [row('requirement.approaches', approaches, 6, 'approaches'), row('requirement.holds', holds, 1, 'holds')],
      },
      {
        classRatingId: 'cr1', classType: 'SEP_LAND', licenseId: 'l1', regulatoryAuthority: 'FAA', licenseType: 'PRIVATE',
        status: !dayOk ? 'expired' : nightOk ? 'current' : 'expiring', messageKey: paxMsg[0], ...(paxMsg[1] ? { messageParams: paxMsg[1] } : {}),
        ruleDescriptionKey: 'faa_pax_day_night',
        requirements: [row('requirement.day_landings', n.day, 3, 'landings'), row('requirement.night_landings', nightFullStop, 3, 'landings')],
      },
    ],
    flightReview: {
      lastCompleted: '2025-05-17', expiresOn: '2027-05-31', status: 'current',
      messageKey: 'flight_review.current', messageParams: { date: '2025-05-17' },
    },
    passengerCurrency: [{
      classType: 'SEP_LAND', regulatoryAuthority: 'FAA',
      dayStatus: dayOk ? 'current' : 'expired', nightStatus: nightOk ? 'current' : 'expired',
      dayLandings: n.day, nightLandings: nightFullStop, dayRequired: 3, nightRequired: 3, nightPrivilege: true,
      dayExpiresOn: null, nightExpiresOn: null,
      messageKey: dayOk && nightOk ? 'pax.current_day_night' : dayOk ? 'pax.day_current_night_not' : 'pax.not_current',
      ...(dayOk && nightOk ? {} : { messageParams: { needed: dayOk ? 3 - nightFullStop : 3 - n.day } }),
      ruleDescriptionKey: 'faa_pax_day_night',
    }],
  };
}

export default {
  id: 'tom',
  user, aircraft, licenses, classRatings, credentials, contacts: [], flights, currency, airports,
  profileSettings: { disciplines: Object.fromEntries(['AEROPLANE', 'IFR'].map((d) => [d, { acknowledgedAt: iso('2025-11-02T18:00:00Z') }])) },
  expectedDisciplines: { AEROPLANE: 'active', IFR: 'active' },
  shotAircraft: ['N734TB'],
};
