/**
 * P3 — Karl, TMG touring pilot (PERSONAS.md). SPL with the TMG extension;
 * touring flights in the club SF 25 Falke and a Super Dimona between real
 * airfields, logged with take-off and landing times only; grandchildren as
 * passengers; a glider history that ends in 2019.
 */
import {
  makeUser, aircraftRecord, licence, classRating, credential, flight, rng, between, pick, addDays, day, iso,
  tally, req, profCheck, recencyStatus, easaPax, launchMethodRows, distanceNm
} from './build.mjs';

const user = makeUser({ id: 'u1', email: 'karl.brenner@example.com', name: 'Karl Brenner', createdAt: iso('2024-02-10') });

const airports = {
  EDST: { name: 'Hahnweide', country: 'DE', lat: 48.6303, lon: 9.4308 },
  EDTM: { name: 'Mengen-Hohentengen', country: 'DE', lat: 48.0539, lon: 9.3728 },
  EDNY: { name: 'Friedrichshafen', country: 'DE', lat: 47.6713, lon: 9.5115 },
  EDSB: { name: 'Karlsruhe/Baden-Baden', country: 'DE', lat: 48.7794, lon: 8.0805 },
  EDTF: { name: 'Freiburg', country: 'DE', lat: 48.0228, lon: 7.8325 },
  EDTY: { name: 'Schwäbisch Hall', country: 'DE', lat: 49.1183, lon: 9.7839 },
  EDMA: { name: 'Augsburg', country: 'DE', lat: 48.4253, lon: 10.9317 },
};

const aircraft = [
  aircraftRecord('a1', 'D-KOFA', 'SF25', 'Scheibe', 'SF 25C Falke', 'TMG', { defaultDepartureIcao: 'EDST', notes: 'Club TMG.' }),
  aircraftRecord('a2', 'D-KDIM', 'H36', 'HOAC', 'HK 36 TTC Super Dimona', 'TMG', { defaultDepartureIcao: 'EDST' }),
  aircraftRecord('a3', 'D-3021', 'AS21', 'Schleicher', 'ASK 21', 'GLIDER', { isActive: false, notes: 'Former club glider.' }),
];

const licenses = [licence('l1', 'EASA', 'SPL', 'DE.SFCL.00871', '2013-04-02', 'LBA')];
const classRatings = {
  l1: [
    classRating('cr1', 'l1', 'GLIDER', '1982-06-12'),
    classRating('cr2', 'l1', 'TMG', '2015-05-20', { notes: 'SFCL.150 TMG extension' }),
  ],
};
const credentials = [credential('c1', 'EASA_CLASS2_MEDICAL', 'MED-88410', '2025-11-30', '2026-11-30', 'AeMC Stuttgart')];
const contacts = [
  { id: 'p1', userId: 'u1', name: 'Mia Brenner', email: null, phone: null, notes: 'Granddaughter', createdAt: iso('2024-06-01'), updatedAt: iso('2024-06-01') },
  { id: 'p2', userId: 'u1', name: 'Paul Brenner', email: null, phone: null, notes: 'Grandson', createdAt: iso('2024-06-01'), updatedAt: iso('2024-06-01') },
  { id: 'p3', userId: 'u1', name: 'Heinz Maier', email: null, phone: null, notes: 'FI(S) TMG', createdAt: iso('2024-06-01'), updatedAt: iso('2024-06-01') },
];

const DESTINATIONS = ['EDTM', 'EDNY', 'EDSB', 'EDTF', 'EDTY', 'EDMA'];

function touring() {
  const rand = rng(67);
  const out = [];
  for (let date = '2024-09-07'; date <= day(0); date = addDays(date, between(rand, 9, 16))) {
    const month = Number(date.slice(5, 7));
    if (month === 12 || month === 1 || month === 2) continue;
    const reg = pick(rand, ['D-KOFA', 'D-KOFA', 'D-KDIM']);
    const type = reg === 'D-KOFA' ? 'SF25' : 'H36';
    if (rand() < 0.3) {
      const pax = pick(rand, [{ name: 'Mia Brenner', role: 'Passenger', contactId: 'p1' }, { name: 'Paul Brenner', role: 'Passenger', contactId: 'p2' }]);
      out.push(flight({ date, reg, type, from: 'EDST', to: 'EDST', depTime: '14:10', minutes: between(rand, 35, 60), landings: 3, crew: [pax], remarks: 'Local, Swabian Alb' }));
      continue;
    }
    const dest = pick(rand, DESTINATIONS);
    const leg = (from, to, depTime) => {
      const d = distanceNm(airports, from, to);
      return flight({ date, reg, type, from, to, depTime, minutes: Math.round(d / 1.3) + between(rand, 6, 12), distance: d });
    };
    out.push(leg('EDST', dest, '10:05'), leg(dest, 'EDST', '14:30'));
  }
  out.push(flight({
    date: '2025-04-12', reg: 'D-KOFA', type: 'SF25', from: 'EDST', to: 'EDST', depTime: '10:00', minutes: 65, role: 'dual', landings: 4,
    crew: [{ name: 'Heinz Maier', role: 'Instructor', contactId: 'p3' }], instructorName: 'Heinz Maier', remarks: 'SFCL.160(b) training flight',
  }));
  return out;
}

function gliderHistory() {
  const rand = rng(1982);
  const out = [];
  for (const year of [2017, 2018, 2019]) {
    for (let k = 0; k < 8; k++) {
      const date = addDays(`${year}-05-01`, between(rand, 0, 120));
      const tow = rand() < 0.3;
      out.push(flight({ date, reg: 'D-3021', type: 'AS21', from: 'EDST', to: 'EDST', depTime: '12:00', minutes: tow ? between(rand, 60, 180) : between(rand, 7, 25), launchMethod: tow ? 'aerotow' : 'winch' }));
    }
  }
  return out;
}

const flights = [...touring(), ...gliderHistory()];

const isGlider = (f, ac) => ac?.aircraftClass === 'GLIDER';
const isTMG = (f, ac) => ac?.aircraftClass === 'TMG';
const isSailplaneOrTMG = (f, ac) => isGlider(f, ac) || isTMG(f, ac);

function currency(fl, acByReg) {
  const both = tally(fl, acByReg, isSailplaneOrTMG, 730);
  const glider = tally(fl, acByReg, isGlider, 730);
  const tmg = tally(fl, acByReg, isTMG, 730);
  const spl = [
    req('requirement.flight_time', both.picOrDual, 300, 'minutes'),
    req('requirement.launches', glider.launches, 15, 'launches'),
    req('requirement.training_flights', glider.trainingFlights, 2, 'flights'),
    profCheck(),
  ];
  const splTmg = [
    req('requirement.flight_time', both.picOrDual, 720, 'minutes'),
    req('requirement.tmg_time', tmg.picOrDual, 360, 'minutes'),
    req('requirement.tmg_landings', tmg.landings, 12, 'landings'),
    req('requirement.tmg_training_flight', tmg.longestTraining, 60, 'minutes'),
    profCheck(),
  ];
  return {
    ratings: [
      {
        classRatingId: 'cr1', classType: 'GLIDER', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL',
        ...recencyStatus(spl), windowOpen: false, ruleDescriptionKey: 'easa_spl', countedClasses: ['GLIDER', 'TMG'],
        requirements: spl, launchMethodCurrency: launchMethodRows(fl, acByReg, isGlider, tmg.landings),
      },
      {
        classRatingId: 'cr2', classType: 'TMG', licenseId: 'l1', regulatoryAuthority: 'EASA', licenseType: 'SPL',
        ...recencyStatus(splTmg), windowOpen: false, ruleDescriptionKey: 'easa_spl_tmg', countedClasses: ['GLIDER', 'TMG'],
        creditedUltralightKinds: ['SAILPLANE', 'THREE_AXIS_MOTORGLIDER'], requirements: splTmg,
      },
    ],
    passengerCurrency: [
      easaPax('GLIDER', fl, acByReg, isGlider, { picOnly: true, ruleDescriptionKey: 'easa_spl_pax' }),
      easaPax('TMG', fl, acByReg, isTMG, { picOnly: true, ruleDescriptionKey: 'easa_spl_tmg_pax' }),
    ],
  };
}

export default {
  id: 'karl',
  user, aircraft, licenses, classRatings, credentials, contacts, flights, currency, airports,
  profileSettings: { disciplines: { TMG: { acknowledgedAt: iso('2024-09-07T18:00:00Z') }, SAILPLANE: { acknowledgedAt: iso('2024-02-10T18:00:00Z') } } },
  expectedDisciplines: { TMG: 'active', SAILPLANE: 'dormant' },
  shotAircraft: ['D-KOFA'],
};
