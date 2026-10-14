/**
 * P6 — Sabine, trike and powered-paraglider pilot (PERSONAS.md). DULV
 * licence with the weight-shift and powered-paraglider kinds; the trike
 * D-MTRK and an unregistered paramotor, both flown from a farm strip.
 */
import {
  makeUser, aircraftRecord, licence, classRating, credential, flight, rng, between, pick, addDays, day, iso,
  tally, req, recencyStatus, ulPax
} from './build.mjs';

const user = makeUser({ id: 'u1', email: 'sabine.koch@example.com', name: 'Sabine Koch', createdAt: iso('2024-07-01') });

const STRIP = 'Hofwiese Kleinbach';
// Unregistered paramotor, listed under its wing's name.
const PPG = 'PPG-VIPER';

const aircraft = [
  aircraftRecord('a1', 'D-MTRK', 'TANA', 'Air Creation', 'Tanarg 912 iS', 'ULTRALIGHT', {
    ulKind: 'WEIGHT_SHIFT', maxTakeoffMassKg: 472.5, defaultDepartureIcao: STRIP, defaultArrivalIcao: STRIP,
  }),
  aircraftRecord('a2', PPG, 'PPG', 'Ozone / Scout', 'Viper 5 on Scout Carbon', 'ULTRALIGHT', {
    ulKind: 'POWERED_PARAGLIDER', defaultDepartureIcao: STRIP, defaultArrivalIcao: STRIP, notes: 'Powered paraglider — no registration.',
  }),
];

const licenses = [licence('l1', 'DULV', 'UL', 'DULV-UL-8820', '2019-05-11', 'DULV')];
const classRatings = {
  l1: [
    classRating('cr1', 'l1', 'ULTRALIGHT', '2019-05-11', { ulKind: 'WEIGHT_SHIFT' }),
    classRating('cr2', 'l1', 'ULTRALIGHT', '2021-08-21', { ulKind: 'POWERED_PARAGLIDER' }),
  ],
};
const credentials = [credential('c1', 'EASA_LAPL_MEDICAL', 'MED-L-30921', '2023-04-02', '2028-04-02', 'AeMC Kassel')];

function season() {
  const rand = rng(38);
  const out = [];
  for (let date = '2024-09-05'; date <= day(0); date = addDays(date, between(rand, 4, 11))) {
    const month = Number(date.slice(5, 7));
    if (month === 12 || month === 1) continue;
    if (rand() < 0.5) {
      out.push(flight({
        date, reg: 'D-MTRK', type: 'TANA', from: STRIP, to: STRIP, depTime: pick(rand, ['08:10', '18:20']), minutes: between(rand, 40, 95),
        landings: between(rand, 1, 3), crew: rand() < 0.3 ? [{ name: 'Nico Koch', role: 'Passenger' }] : [], remarks: rand() < 0.3 ? 'Evening flight over the Edersee' : null,
      }));
    } else {
      out.push(flight({ date, reg: PPG, type: 'PPG', from: STRIP, to: STRIP, depTime: pick(rand, ['07:30', '19:00']), minutes: between(rand, 20, 45), landings: between(rand, 1, 4) }));
    }
  }
  return out;
}

const flights = season();

const kind = (k) => (f, ac) => ac?.aircraftClass === 'ULTRALIGHT' && ac.ulKind === k;

function currency(fl, acByReg) {
  const trike = tally(fl, acByReg, kind('WEIGHT_SHIFT'), 730);
  const ppg = tally(fl, acByReg, kind('POWERED_PARAGLIDER'), 730);
  const trikeReqs = [req('requirement.pic_time', trike.pic, 720, 'minutes')];
  const ppgReqs = [req('requirement.landings', ppg.landings, 30, 'landings')];
  return {
    ratings: [
      {
        classRatingId: 'cr1', classType: 'ULTRALIGHT', licenseId: 'l1', regulatoryAuthority: 'DULV', licenseType: 'UL',
        ...recencyStatus(trikeReqs), windowOpen: false, ruleDescriptionKey: 'ul_trike_dulv', creditedUltralightKinds: ['WEIGHT_SHIFT'], requirements: trikeReqs,
      },
      {
        classRatingId: 'cr2', classType: 'ULTRALIGHT', licenseId: 'l1', regulatoryAuthority: 'DULV', licenseType: 'UL',
        ...recencyStatus(ppgReqs), windowOpen: false, ruleDescriptionKey: 'ul_powered_paraglider', creditedUltralightKinds: ['POWERED_PARAGLIDER'], requirements: ppgReqs,
      },
    ],
    passengerCurrency: [ulPax('WEIGHT_SHIFT', fl, acByReg), ulPax('POWERED_PARAGLIDER', fl, acByReg)],
  };
}

export default {
  id: 'sabine',
  user, aircraft, licenses, classRatings, credentials, contacts: [], flights, currency, airports: {},
  profileSettings: { disciplines: { ULTRALIGHT: { acknowledgedAt: iso('2024-07-01T18:00:00Z') } } },
  expectedDisciplines: { ULTRALIGHT: 'active' },
  shotAircraft: ['D-MTRK', PPG],
};
