/**
 * Shared builders for the per-persona fixture sets. A persona module holds
 * data only — profile, licences, ratings, aircraft, flights, currency,
 * pilot profile — and `buildFixtureSet` turns it into the `{ user, bodyFor }`
 * pair `capture.mjs` routes API calls through. Everything derived from
 * flights (statistics, trends, per-aircraft recency, analytics, map) is
 * computed here from the persona's own flights.
 *
 * Shapes follow `src/api/schema.ts`. The clock is pinned to TODAY, the same
 * date the default fixtures use.
 */

import { importTemplates } from '../fixtures.mjs';

export const TODAY = new Date('2026-08-16T10:00:00Z');
const DAY_MS = 86_400_000;
export const iso = (d) => new Date(d).toISOString();
export const shift = (days) => new Date(TODAY.getTime() + days * DAY_MS).toISOString();
/** YYYY-MM-DD `days` from TODAY. */
export const day = (days) => shift(days).slice(0, 10);
/** Days from `date` (YYYY-MM-DD) to TODAY. */
export const daysAgo = (date) => Math.round((TODAY.getTime() - Date.parse(`${date}T10:00:00Z`)) / DAY_MS);
/** YYYY-MM-DD plus `n` days. */
export const addDays = (date, n) => new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);

/** Seeded PRNG (mulberry32). */
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const pick = (rand, list) => list[Math.floor(rand() * list.length)];
export const between = (rand, lo, hi) => lo + Math.floor(rand() * (hi - lo + 1));

/** Saturdays and Sundays from `from` to `to` inclusive (YYYY-MM-DD). */
export function weekends(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const wd = new Date(`${d}T12:00:00Z`).getUTCDay();
    if (wd === 0 || wd === 6) out.push(d);
  }
  return out;
}

/** Great-circle distance in NM between two entries of an airports map, 0 when either has no coordinates. */
export function distanceNm(airports, from, to) {
  const a = airports[from];
  const b = airports[to];
  if (!a || !b || from === to) return 0;
  const rad = Math.PI / 180;
  const h = Math.sin(((b.lat - a.lat) * rad) / 2) ** 2 +
    Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(((b.lon - a.lon) * rad) / 2) ** 2;
  return Math.round(2 * 3440.065 * Math.asin(Math.sqrt(h)) * 10) / 10;
}

// ── Time ─────────────────────────────────────────────────────────────────────
const toMin = (hhmm) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
const fromMin = (m) => {
  const w = ((m % 1440) + 1440) % 1440;
  return `${String(Math.floor(w / 60)).padStart(2, '0')}:${String(w % 60).padStart(2, '0')}`;
};
export const addTime = (hhmm, minutes) => fromMin(toMin(hhmm) + minutes);

// ── Records ──────────────────────────────────────────────────────────────────
export function makeUser(fields) {
  return {
    id: 'u1',
    isAdmin: false,
    twoFactorEnabled: false,
    timeDisplayFormat: 'hm',
    dateFormat: 'DD.MM.YYYY',
    clockFormat: '24h',
    preferredLocale: 'en',
    recencyPerModel: true,
    recencyPerRegistration: false,
    flightListColumnMode: 'auto',
    createdAt: iso('2025-03-01'),
    updatedAt: iso('2026-08-01'),
    ...fields,
  };
}

export function aircraftRecord(id, registration, type, make, model, aircraftClass, extra = {}) {
  return {
    id, userId: 'u1', registration, type, make, model, aircraftClass,
    ulKind: null, maxTakeoffMassKg: null,
    isComplex: false, isHighPerformance: false, isTailwheel: false, isMultiPilot: false,
    defaultDepartureIcao: null, defaultArrivalIcao: null, isActive: true, notes: null,
    createdAt: iso('2025-03-01'), updatedAt: iso('2026-03-01'),
    ...extra,
  };
}

export function licence(id, regulatoryAuthority, licenseType, licenseNumber, issueDate, issuingAuthority, extra = {}) {
  return {
    id, userId: 'u1', regulatoryAuthority, licenseType, licenseNumber, issueDate, issuingAuthority,
    requiresSeparateLogbook: false,
    createdAt: iso('2025-03-01'), updatedAt: iso('2026-03-01'),
    ...extra,
  };
}

export function classRating(id, licenseId, classType, issueDate, extra = {}) {
  return {
    id, licenseId, classType, ulKind: null, issueDate, expiryDate: null, notes: null,
    createdAt: iso(issueDate), updatedAt: iso('2026-03-01'),
    ...extra,
  };
}

export function credential(id, credentialType, credentialNumber, issueDate, expiryDate, issuingAuthority, notes = null) {
  return {
    id, userId: 'u1', credentialType, credentialNumber, issueDate, expiryDate, issuingAuthority, notes,
    createdAt: iso(issueDate), updatedAt: iso('2026-03-01'),
  };
}

/**
 * One flight. `role` sets the time columns:
 *   pic         PIC                      dual        dual received
 *   solo        supervised solo (PIC)    instructor  PIC + dual given
 *   sic         co-pilot (multi-pilot)   pic-mp      PIC on a multi-pilot aircraft
 *   passenger   not crew
 * Glider-style flights log take-off/landing only (`dep`/`arr` times); pass
 * `offBlock`/`onBlock` for block times.
 */
export function flight(spec) {
  const {
    date, reg, type, from, to, depTime = null, minutes, role = 'pic',
    offBlock = null, onBlock = null, launchMethod = null, landings = 1, nightLandings = 0,
    night = 0, ifr = 0, actualInstrument = 0, approaches = [], xc = null, distance = 0,
    remarks = null, instructorName = null, crew = [], sim = null, picName = null,
  } = spec;
  const pic = ['pic', 'solo', 'instructor', 'pic-mp'].includes(role);
  const multiPilot = role === 'sic' || role === 'pic-mp';
  const flightMinutes = sim ? 0 : minutes;
  const crossCountry = xc ?? (from && to && from !== to ? flightMinutes : 0);
  return {
    id: '',
    userId: 'u1',
    date,
    aircraftReg: sim ? '' : reg,
    aircraftType: type,
    departureIcao: sim ? null : from,
    arrivalIcao: sim ? null : to,
    offBlockTime: offBlock,
    onBlockTime: onBlock,
    departureTime: depTime,
    arrivalTime: depTime && !sim ? addTime(depTime, minutes) : null,
    totalTime: flightMinutes,
    isPic: pic && !sim,
    isDual: role === 'dual',
    picTime: pic && !sim ? flightMinutes : 0,
    dualTime: role === 'dual' ? minutes : 0,
    sicTime: role === 'sic' ? flightMinutes : 0,
    dualGivenTime: role === 'instructor' ? flightMinutes : 0,
    soloTime: role === 'solo' ? flightMinutes : 0,
    multiPilotTime: multiPilot ? flightMinutes : 0,
    picusTime: 0,
    spicTime: 0,
    examinerTime: 0,
    reliefTime: 0,
    nightTime: night,
    ifrTime: ifr,
    actualInstrumentTime: actualInstrument,
    simulatedInstrumentTime: 0,
    approaches: approaches.map((a, i) => ({ id: `ap${i}`, type: a.type, airport: a.airport, runway: a.runway ?? null, count: 1 })),
    approachesCount: approaches.length,
    holds: 0,
    landingsDay: sim || role === 'passenger' ? 0 : landings - nightLandings,
    landingsNight: sim || role === 'passenger' ? 0 : nightLandings,
    allLandings: sim || role === 'passenger' ? 0 : landings,
    takeoffsDay: sim || role === 'passenger' ? 0 : landings - nightLandings,
    takeoffsNight: sim || role === 'passenger' ? 0 : nightLandings,
    crossCountryTime: crossCountry,
    distance,
    launchMethod,
    launches: spec.launches ?? (sim || role === 'passenger' ? 0 : landings),
    launchesOverride: spec.launches != null,
    isOutlanding: !!spec.outlanding,
    isTowFlight: !!spec.towFlight,
    releaseHeightM: spec.releaseHeightM ?? null,
    route: null,
    picName,
    simulatedFlightTime: sim ? minutes : 0,
    groundTrainingTime: 0,
    isSimulator: !!sim,
    isPassenger: role === 'passenger',
    fstdType: sim ? sim.fstdType : null,
    isIpc: false,
    isFlightReview: false,
    isProficiencyCheck: !!spec.proficiencyCheck,
    remarks,
    instructorName,
    instructorComments: null,
    endorsements: null,
    crewMembers: crew.map((c, i) => ({ id: `cm${i}`, flightId: '', contactId: c.contactId ?? null, name: c.name, role: c.role })),
    nightTimeOverride: false,
    crossCountryTimeOverride: false,
    takeoffsDayOverride: false,
    takeoffsNightOverride: false,
    landingsDayOverride: false,
    landingsNightOverride: false,
    sicTimeOverride: false,
    multiPilotTimeOverride: false,
    signatureId: spec.signatureId ?? null,
    createdAt: iso(`${date}T18:00:00Z`),
    updatedAt: iso(`${date}T18:00:00Z`),
  };
}

/** Sorts newest first and numbers ids f1… (f1 = most recent). */
export function finalizeFlights(list) {
  const sorted = [...list].sort((a, b) =>
    a.date === b.date
      ? (b.departureTime || b.offBlockTime || '').localeCompare(a.departureTime || a.offBlockTime || '')
      : b.date.localeCompare(a.date)
  );
  return sorted.map((f, i) => {
    const id = `f${i + 1}`;
    return { ...f, id, crewMembers: f.crewMembers.map((c) => ({ ...c, flightId: id })) };
  });
}

// ── Currency helpers ─────────────────────────────────────────────────────────
/** YYYY-MM-DD plus `n` calendar months. */
export const addMonths = (date, n) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + n);
  return d.toISOString().slice(0, 10);
};
/** Remedy of an unmet row (CURRENCY_MESSAGES.md "Remedies"). */
const remedyFor = (nameKey, current, required, unit) => {
  if (nameKey === 'requirement.training_flight' || nameKey === 'requirement.tmg_training_flight') {
    return { remedyKey: 'remedy.training_flight' };
  }
  return { remedyKey: 'remedy.fly_more', remedyParams: { missing: Math.max(0, required - current), unit } };
};
/** A `CurrencyRequirement` with `requirement.progress`; an unmet row carries its remedy. */
export const req = (nameKey, current, required, unit) => ({
  nameKey, met: current >= required, current, required, unit, messageKey: 'requirement.progress',
  ...(current >= required ? {} : remedyFor(nameKey, current, required, unit)),
});
/**
 * Last day `field` summed over the newest flights of a tally stays at or above
 * `required`, with no further flying, for a window of `months`.
 */
export function projectUntil(t, field, required, months = 24) {
  const newestFirst = [...t.perFlight].sort((a, b) => b.date.localeCompare(a.date));
  if (field === 'longestTraining') {
    const f = newestFirst.find((c) => c.dual >= required);
    return f ? addDays(addMonths(f.date, months), -1) : null;
  }
  let sum = 0;
  for (const c of newestFirst) {
    sum += c[field];
    if (sum >= required) return addDays(addMonths(c.date, months), -1);
  }
  return null;
}
/** A rolling-window `req` over `t[field]`, with `validUntil` when met. */
export const rollingReq = (nameKey, t, field, required, unit, months = 24) => {
  const row = req(nameKey, t[field], required, unit);
  return row.met ? { ...row, validUntil: projectUntil(t, field, required, months) } : row;
};
/** The proficiency-check row: completed on `date`, or missing. `months` sets its rolling `validUntil`. */
export const profCheck = (date = null, nameKey = 'requirement.proficiency_check', months = null) =>
  date
    ? {
      nameKey, met: true, current: 1, required: 1, unit: 'check', messageKey: 'requirement.prof_check_completed', messageParams: { date },
      ...(months ? { validUntil: addDays(addMonths(date, months), -1) } : {}),
    }
    : { nameKey, met: false, current: 0, required: 1, unit: 'check', messageKey: 'requirement.prof_check_missing', remedyKey: 'remedy.proficiency_check' };
/** A `LaunchMethodCurrency` row (SFCL.155(c)). */
export const launchRow = (method, launches, validUntil = null) => {
  const required = method === 'bungee' ? 2 : 5;
  const met = launches >= required;
  return {
    method, launches, required, met, messageKey: 'launch_method.progress',
    ...(met
      ? (validUntil ? { validUntil } : {})
      : { remedyKey: 'remedy.launch_method_dual', remedyParams: { method, missing: required - launches } }),
  };
};
/**
 * Rolling-recency status: every experience row met, or a proficiency check in
 * the window. A current result carries the latest date either alternative holds.
 */
export const recencyStatus = (requirements) => {
  const check = requirements.find((r) => r.nameKey === 'requirement.proficiency_check');
  const rows = requirements.filter((r) => r !== check);
  const rowsOk = rows.every((r) => r.met);
  const ok = rowsOk || !!check?.met;
  if (!ok) return { status: 'lapsed', messageKey: 'rating.recency_not_met' };
  const rowsUntil = rowsOk && rows.every((r) => r.validUntil) ? rows.map((r) => r.validUntil).sort()[0] : null;
  const until = [rowsUntil, check?.met ? check.validUntil : null].filter(Boolean).sort().pop();
  return { status: 'current', messageKey: 'rating.recency_current', ...(until ? { validUntil: until } : {}) };
};

/**
 * Sums a persona's flights for a currency window. `match(flight, aircraft)`
 * selects flights; `sinceDays` bounds the window back from TODAY.
 */
export function tally(flights, aircraftByReg, match, sinceDays) {
  const since = day(-sinceDays);
  const out = {
    flights: 0, minutes: 0, pic: 0, picOrDual: 0, dual: 0, landings: 0, launches: 0,
    trainingFlights: 0, longestTraining: 0, instructorMinutes: 0, ifr: 0, byMethod: {}, perFlight: [],
  };
  for (const f of flights) {
    if (f.isSimulator || f.isPassenger || f.date < since) continue;
    if (!match(f, aircraftByReg[f.aircraftReg])) continue;
    out.flights++;
    out.minutes += f.totalTime;
    out.pic += f.picTime;
    out.dual += f.dualTime;
    out.picOrDual += f.picTime + f.dualTime;
    out.landings += f.allLandings;
    out.ifr += f.ifrTime;
    out.launches += f.allLandings;
    if (f.launchMethod) out.byMethod[f.launchMethod] = (out.byMethod[f.launchMethod] ?? 0) + f.allLandings;
    out.perFlight.push({
      date: f.date, flights: 1, minutes: f.totalTime, pic: f.picTime, dual: f.dualTime, picOrDual: f.picTime + f.dualTime,
      landings: f.allLandings, launches: f.allLandings, trainingFlights: f.dualTime > 0 ? 1 : 0, instructorMinutes: f.dualTime,
      method: f.launchMethod ?? null,
    });
    if (f.dualTime > 0) {
      out.trainingFlights++;
      out.instructorMinutes += f.dualTime;
      out.longestTraining = Math.max(out.longestTraining, f.dualTime);
    }
  }
  return out;
}

/** Take-offs and landings in the preceding 90 days, as passenger currency counts them. */
export function paxLandings(flights, aircraftByReg, match, picOnly = true) {
  const since = day(-90);
  return flights
    .filter((f) => !f.isSimulator && !f.isPassenger && f.date >= since && (!picOnly || f.picTime > 0))
    .filter((f) => match(f, aircraftByReg[f.aircraftReg]))
    .reduce((a, f) => ({ day: a.day + f.landingsDay, night: a.night + f.landingsNight }), { day: 0, night: 0 });
}

/** The date passenger currency lapses: 90 days after the `required`th most recent landing. */
export function paxExpiresOn(flights, aircraftByReg, match, required = 3, picOnly = true) {
  const since = day(-90);
  const events = [];
  for (const f of flights) {
    if (f.isSimulator || f.isPassenger || f.date < since || (picOnly && f.picTime === 0)) continue;
    if (!match(f, aircraftByReg[f.aircraftReg])) continue;
    for (let i = 0; i < f.landingsDay; i++) events.push(f.date);
  }
  events.sort((a, b) => b.localeCompare(a));
  return events.length >= required ? addDays(events[required - 1], 90) : null;
}

/**
 * EASA FCL.060(b) / SFCL.160(e) passenger currency for `classType`, counted
 * from the persona's flights.
 */
export function easaPax(classType, flights, aircraftByReg, match, opts = {}) {
  const { authority = 'EASA', nightPrivilege = false, irWaiver = false, ruleDescriptionKey = 'easa_pax', picOnly = false } = opts;
  const n = paxLandings(flights, aircraftByReg, match, picOnly);
  const dayOk = n.day >= 3;
  const nightOk = irWaiver || n.night >= 1;
  let messageKey;
  let messageParams;
  if (!dayOk) [messageKey, messageParams] = ['pax.not_current', { needed: 3 - n.day }];
  else if (!nightPrivilege) messageKey = 'pax.current_day_no_night_privilege';
  else if (irWaiver) messageKey = 'pax.current_day_night_ir_waived';
  else if (nightOk) messageKey = 'pax.current_day_night';
  else [messageKey, messageParams] = ['pax.day_current_night_not', { needed: 1 }];
  return {
    classType, regulatoryAuthority: authority,
    dayStatus: dayOk ? 'current' : 'expired',
    nightStatus: !nightPrivilege ? 'unknown' : nightOk ? 'current' : 'expired',
    dayLandings: n.day, nightLandings: n.night, dayRequired: 3, nightRequired: irWaiver ? 0 : 1,
    nightPrivilege,
    dayExpiresOn: paxExpiresOn(flights, aircraftByReg, match, 3, picOnly),
    nightExpiresOn: null,
    messageKey, ...(messageParams ? { messageParams } : {}), ruleDescriptionKey,
  };
}

/** German UL §45a passenger currency for one kind. */
export function ulPax(ulKind, flights, aircraftByReg, authority = 'DULV') {
  const match = (f, ac) => ac?.aircraftClass === 'ULTRALIGHT' && ac.ulKind === ulKind;
  const n = paxLandings(flights, aircraftByReg, match, false);
  const ok = n.day >= 3;
  return {
    classType: 'ULTRALIGHT', ulKind, regulatoryAuthority: authority,
    dayStatus: ok ? 'current' : 'expired', nightStatus: 'unknown',
    dayLandings: n.day, nightLandings: 0, dayRequired: 3, nightRequired: 0, nightPrivilege: false,
    dayExpiresOn: paxExpiresOn(flights, aircraftByReg, match, 3, false), nightExpiresOn: null,
    messageKey: ok ? 'pax.current_day_privilege_separate' : 'pax.not_current',
    ...(ok ? {} : { messageParams: { needed: 3 - n.day } }),
    ruleDescriptionKey: 'ul_pax',
  };
}

/** A sailplane launch-method row set: every method ever logged on the class, counted over 24 months. */
export function launchMethodRows(flights, aircraftByReg, match, extraSelfLaunch = 0) {
  const ever = tally(flights, aircraftByReg, match, 100 * 365).byMethod;
  const window = tally(flights, aircraftByReg, match, 730);
  const recent = window.byMethod;
  return ['winch', 'car', 'aerotow', 'self-launch', 'bungee']
    .filter((m) => ever[m])
    .map((m) => {
      const launches = (recent[m] ?? 0) + (m === 'self-launch' ? extraSelfLaunch : 0);
      const required = m === 'bungee' ? 2 : 5;
      const own = { perFlight: window.perFlight.filter((c) => c.method === m) };
      return launchRow(m, launches, launches >= required ? projectUntil(own, 'launches', required) : null);
    });
}

// ── Pilot profile (GET /users/me/pilot-profile) ──────────────────────────────
// Port of ninerlog-api internal/service/pilotprofile/derive.go and
// models.ClassifyLicence, run over the persona's own records.
export const DISCIPLINES = [
  'AEROPLANE', 'TMG', 'SAILPLANE', 'ULTRALIGHT', 'GYROPLANE',
  'HELICOPTER', 'IFR', 'MULTI_CREW', 'INSTRUCTOR', 'SIMULATOR',
];
const UL_KINDS = ['THREE_AXIS', 'THREE_AXIS_MOTORGLIDER', 'WEIGHT_SHIFT', 'GYROPLANE', 'HELICOPTER', 'POWERED_PARAGLIDER', 'SAILPLANE'];
const TOWED = ['winch', 'aerotow', 'car', 'bungee'];
const AEROPLANE_CLASSES = ['SEP_LAND', 'SEP_SEA', 'MEP_LAND', 'MEP_SEA', 'SET_LAND', 'SET_SEA'];
const AIRCRAFT_DISCIPLINES = ['AEROPLANE', 'TMG', 'SAILPLANE', 'ULTRALIGHT', 'GYROPLANE', 'HELICOPTER'];
const UL_KIND_DISCIPLINE = { THREE_AXIS: 'AEROPLANE', THREE_AXIS_MOTORGLIDER: 'TMG', SAILPLANE: 'SAILPLANE', GYROPLANE: 'GYROPLANE', HELICOPTER: 'HELICOPTER' };
const EXACT_LICENCE_KINDS = {
  PPL: 'PPL_A', 'PPL(A)': 'PPL_A', LAPL: 'LAPL_A', 'LAPL(A)': 'LAPL_A', CPL: 'CPL_A', 'CPL(A)': 'CPL_A',
  ATPL: 'ATPL_A', 'ATPL(A)': 'ATPL_A', MPL: 'MPL', 'MPL(A)': 'MPL', SPL: 'SPL', 'LAPL(S)': 'LAPL_S', GPL: 'GPL',
  SPORT: 'FAA_SPORT', RECREATIONAL: 'FAA_RECREATIONAL', PRIVATE: 'FAA_PRIVATE', COMMERCIAL: 'FAA_COMMERCIAL',
  ATP: 'FAA_ATP', GLIDER: 'FAA_GLIDER', IR: 'IR', 'IR(A)': 'IR', 'IR(H)': 'IR',
  EXAMINER: 'INSTRUCTOR', CFI: 'INSTRUCTOR', CFII: 'INSTRUCTOR', MEI: 'INSTRUCTOR',
};
const INSTRUCTOR_CODES = ['FI', 'CRI', 'IRI', 'TRI', 'SFI', 'MCCI', 'FE', 'CRE', 'IRE', 'TRE'];

export function classifyLicence(licenceType, authority = '') {
  const lt = (licenceType ?? '').trim().toUpperCase();
  const auth = (authority ?? '').trim().toUpperCase();
  if (auth === 'DULV' || auth === 'DAEC' || lt === 'UL' || lt.startsWith('UL ') || lt.startsWith('UL-') ||
    lt.includes('ULTRALIGHT') || lt.includes('ULTRALEICHT')) return 'UL';
  if (EXACT_LICENCE_KINDS[lt]) return EXACT_LICENCE_KINDS[lt];
  if (INSTRUCTOR_CODES.some((c) => lt === c || lt.startsWith(`${c}(`))) return 'INSTRUCTOR';
  if (lt.endsWith('(H)')) return 'HELICOPTER';
  return '';
}

function licenceDisciplines(kind) {
  const out = [];
  if (['PPL_A', 'LAPL_A', 'CPL_A', 'ATPL_A', 'MPL', 'FAA_SPORT', 'FAA_RECREATIONAL', 'FAA_PRIVATE', 'FAA_COMMERCIAL', 'FAA_ATP'].includes(kind)) out.push('AEROPLANE');
  if (['SPL', 'LAPL_S', 'FAA_GLIDER'].includes(kind)) out.push('SAILPLANE');
  if (kind === 'ATPL_A' || kind === 'MPL') out.push('MULTI_CREW');
  const extra = { UL: 'ULTRALIGHT', GPL: 'GYROPLANE', HELICOPTER: 'HELICOPTER', IR: 'IFR', INSTRUCTOR: 'INSTRUCTOR' }[kind];
  if (extra) out.push(extra);
  return out;
}

function ratingDiscipline(r) {
  if (AEROPLANE_CLASSES.includes(r.classType)) return 'AEROPLANE';
  const d = { TMG: 'TMG', GLIDER: 'SAILPLANE', ULTRALIGHT: 'ULTRALIGHT', GYROPLANE: 'GYROPLANE', IR: 'IFR' }[r.classType];
  if (d) return d;
  if (r.classType === 'OTHER' && r.notes && classifyLicence(r.notes) === 'INSTRUCTOR') return 'INSTRUCTOR';
  return null;
}

function classDisciplines(cls, kind, ulCredit) {
  const c = (cls ?? '').trim().toUpperCase();
  if (AEROPLANE_CLASSES.includes(c)) return ['AEROPLANE'];
  if (c === 'TMG') return ['TMG'];
  if (c === 'GLIDER') return ['SAILPLANE'];
  if (c === 'GYROPLANE') return ['GYROPLANE'];
  if (c === 'ULTRALIGHT') return kind && ulCredit && UL_KIND_DISCIPLINE[kind] ? ['ULTRALIGHT', UL_KIND_DISCIPLINE[kind]] : ['ULTRALIGHT'];
  return [];
}

const byteCompare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const SOURCE_RANK = { LICENCE: 0, RATING: 1, AIRCRAFT: 2, FLIGHTS: 3, FLIGHTS_DUAL: 3, FLIGHTS_INSTRUCTING: 3 };

/**
 * Derives the `PilotProfile` for a persona's licences, ratings, fleet and
 * flights at TODAY. `settings` holds the stored part: `{ mode, disciplines:
 * { SAILPLANE: { intent, acknowledgedAt } } }`.
 */
export function derivePilotProfile({ licenses = [], classRatings = {}, aircraft = [], flights = [], settings = {} }) {
  const cutoff = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth() - 24, TODAY.getUTCDate())).toISOString().slice(0, 10);
  const ev = Object.fromEntries(DISCIPLINES.map((d) => [d, []]));
  const ulKinds = new Set();
  const tallies = {};
  const extra = { IFR: { flights: 0, dual: 0, last: null }, MULTI_CREW: { flights: 0, dual: 0, last: null }, INSTRUCTOR: { flights: 0, dual: 0, last: null }, SIMULATOR: { flights: 0, dual: 0, last: null } };
  const add = (t, n, dual, last) => {
    if (!n) return;
    t.flights += n;
    t.dual += dual;
    if (last && (!t.last || last > t.last)) t.last = last;
  };
  const tally = (d) => (tallies[d] ??= { flights: 0, dual: 0, last: null });
  const licenceRef = (l) => `${l.licenseType.trim()} ${l.licenseNumber.trim()}`.trim();

  for (const l of licenses) {
    for (const d of licenceDisciplines(classifyLicence(l.licenseType, l.regulatoryAuthority))) {
      ev[d].push({ source: 'LICENCE', strength: 'strong', ref: licenceRef(l), refId: l.id, lastSeen: null });
    }
  }
  const licenceById = Object.fromEntries(licenses.map((l) => [l.id, l]));
  for (const r of Object.values(classRatings).flat()) {
    const d = ratingDiscipline(r);
    if (!d) continue;
    let ref = r.classType;
    if (r.ulKind) {
      ref += ` ${r.ulKind}`;
      ulKinds.add(r.ulKind);
    }
    if (licenceById[r.licenseId]) ref += ` on ${licenceRef(licenceById[r.licenseId])}`;
    ev[d].push({ source: 'RATING', strength: 'strong', ref, refId: r.id, lastSeen: null });
  }
  const ulCredit = () => !ev.ULTRALIGHT.some((e) => e.strength === 'strong');
  for (const a of aircraft) {
    if (!a.isActive) continue;
    const e = { source: 'AIRCRAFT', strength: 'recent', ref: a.registration, refId: a.id, lastSeen: null };
    for (const d of classDisciplines(a.aircraftClass, a.ulKind, ulCredit())) ev[d].push(e);
    if (a.aircraftClass === 'ULTRALIGHT' && a.ulKind) ulKinds.add(a.ulKind);
    if (a.isMultiPilot) ev.MULTI_CREW.push(e);
  }
  const acByReg = Object.fromEntries(aircraft.map((a) => [a.registration, a]));
  for (const f of flights) {
    const a = acByReg[f.aircraftReg];
    const cls = (a?.aircraftClass ?? '').trim().toUpperCase();
    const kind = cls === 'ULTRALIGHT' ? a.ulKind : null;
    const crew = !f.isSimulator && !f.isPassenger;
    const dual = f.dualTime > 0 ? 1 : 0;
    if (crew) {
      const discs = classDisciplines(cls, kind, ulCredit());
      if (TOWED.includes(f.launchMethod ?? '')) {
        add(tally('SAILPLANE'), 1, dual, f.date);
        if (discs.includes('ULTRALIGHT')) add(tally('ULTRALIGHT'), 1, dual, f.date);
      } else {
        for (const d of discs) add(tally(d), 1, dual, f.date);
      }
      if (kind) ulKinds.add(kind);
      if ((f.dualGivenTime ?? 0) > 0 || (f.examinerTime ?? 0) > 0) add(extra.INSTRUCTOR, 1, 0, f.date);
      if ((f.ifrTime ?? 0) > 0 || (f.approachesCount ?? 0) > 0) add(extra.IFR, 1, 0, f.date);
      if ((f.multiPilotTime ?? 0) > 0 || (f.sicTime ?? 0) > 0 || (f.reliefTime ?? 0) > 0) add(extra.MULTI_CREW, 1, 0, f.date);
    }
    if (f.isSimulator && !f.isPassenger) add(extra.SIMULATOR, 1, 0, f.date);
  }
  const flightEvidence = (t, source, noun, nouns) => ({
    source,
    strength: t.last && t.last >= cutoff ? 'recent' : 'dormant',
    ref: `${t.flights} ${t.flights === 1 ? noun : nouns}${t.last ? `, last ${t.last}` : ''}`,
    refId: null,
    lastSeen: t.last,
  });

  const stored = settings.disciplines ?? {};
  const disciplines = DISCIPLINES.map((discipline) => {
    const evidence = [...ev[discipline]].sort((a, b) =>
      SOURCE_RANK[a.source] !== SOURCE_RANK[b.source] ? SOURCE_RANK[a.source] - SOURCE_RANK[b.source] : byteCompare(a.ref, b.ref));
    let trainingSignal = false;
    const tail = { IFR: ['FLIGHTS', 'flight', 'flights'], MULTI_CREW: ['FLIGHTS', 'flight', 'flights'], INSTRUCTOR: ['FLIGHTS_INSTRUCTING', 'flight', 'flights'], SIMULATOR: ['FLIGHTS', 'session', 'sessions'] }[discipline];
    if (tail) {
      if (extra[discipline].flights) evidence.push(flightEvidence(extra[discipline], ...tail));
    } else if (tallies[discipline]?.flights) {
      const t = tallies[discipline];
      const e = t.dual === t.flights
        ? flightEvidence(t, 'FLIGHTS_DUAL', 'dual flight', 'dual flights')
        : flightEvidence(t, 'FLIGHTS', 'flight', 'flights');
      evidence.push(e);
      trainingSignal = AIRCRAFT_DISCIPLINES.includes(discipline) && t.dual > 0 && e.strength === 'recent';
    }
    const strong = evidence.some((e) => e.strength === 'strong');
    const recent = evidence.some((e) => e.strength === 'recent');
    const dormant = evidence.some((e) => e.strength === 'dormant');
    if (strong) trainingSignal = false;
    const intent = stored[discipline]?.intent || 'auto';
    let status = 'off';
    if (intent === 'off') status = 'off';
    else if (intent === 'on' || (strong && !dormant)) status = 'active';
    else if (intent === 'goal') status = 'training';
    else if (recent && !trainingSignal) status = 'active';
    else if (trainingSignal) status = 'training';
    else if (dormant) status = 'dormant';
    return {
      discipline, status, intent, evidence,
      ulKinds: discipline === 'ULTRALIGHT' ? UL_KINDS.filter((k) => ulKinds.has(k)) : [],
      acknowledgedAt: stored[discipline]?.acknowledgedAt ?? null,
    };
  });
  return {
    mode: settings.mode ?? 'adaptive',
    disciplines,
    pendingAcknowledgement: disciplines
      .filter((d) => d.intent === 'auto' && !d.acknowledgedAt && (d.status === 'active' || d.status === 'training'))
      .map((d) => d.discipline),
  };
}

/** Disciplines whose derived status differs from `expected` (unlisted ones expect `off`). */
export function profileMismatches(profile, expected = {}) {
  return profile.disciplines
    .filter((d) => d.status !== (expected[d.discipline] ?? 'off'))
    .map((d) => `${d.discipline}: derived ${d.status}, persona expects ${expected[d.discipline] ?? 'off'}`);
}

// ── Derived views ────────────────────────────────────────────────────────────
const sum = (list, key) => list.reduce((a, f) => a + (f[key] ?? 0), 0);
const realFlights = (flights) => flights.filter((f) => !f.isSimulator);
const loggedFlights = (flights) => flights.filter((f) => !f.isSimulator && !f.isPassenger);

export function deriveStatistics(flights) {
  const fl = realFlights(flights);
  return {
    totalFlights: flights.length,
    totalMinutes: sum(fl, 'totalTime'),
    picMinutes: sum(fl, 'picTime'),
    dualMinutes: sum(fl, 'dualTime'),
    nightMinutes: sum(fl, 'nightTime'),
    ifrMinutes: sum(fl, 'ifrTime'),
    landingsDay: sum(fl, 'landingsDay'),
    landingsNight: sum(fl, 'landingsNight'),
    soloMinutes: sum(fl, 'soloTime'),
    sicMinutes: sum(fl, 'sicTime'),
    dualGivenMinutes: sum(fl, 'dualGivenTime'),
    picusMinutes: 0,
    spicMinutes: 0,
    examinerMinutes: 0,
    reliefMinutes: 0,
    crossCountryMinutes: sum(fl, 'crossCountryTime'),
  };
}

const lastMonths = (n) => {
  const out = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(TODAY.getUTCFullYear(), TODAY.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 7));
  }
  return out;
};

export function deriveTrends(flights) {
  return {
    trends: lastMonths(12).map((month) => {
      const inMonth = realFlights(flights).filter((f) => f.date.startsWith(month));
      return { month, totalMinutes: sum(inMonth, 'totalTime'), flights: inMonth.length };
    }),
  };
}

const classOf = (f, aircraftByReg) => {
  if (f.isSimulator) return null;
  const ac = aircraftByReg[f.aircraftReg];
  return ac?.aircraftClass ?? 'OTHER';
};

export function deriveStatsByClass(flights, aircraftByReg) {
  const groups = new Map();
  for (const f of realFlights(flights)) {
    const cls = classOf(f, aircraftByReg);
    const g = groups.get(cls) ?? { class: cls, minutes: 0, flights: 0, landings: 0 };
    g.minutes += f.totalTime;
    g.flights++;
    g.landings += f.allLandings;
    groups.set(cls, g);
  }
  return { byClass: [...groups.values()].sort((a, b) => b.minutes - a.minutes) };
}

function recencyRow(list) {
  const since90 = day(-90);
  const landingDates = [];
  for (const f of list) for (let i = 0; i < f.allLandings; i++) landingDates.push(f.date);
  landingDates.sort((a, b) => b.localeCompare(a));
  const last90 = landingDates.filter((d) => d >= since90).length;
  const dates = list.map((f) => f.date).sort();
  return {
    totalFlights: list.length,
    totalMinutes: sum(list, 'totalTime'),
    landingsDay: sum(list, 'landingsDay'),
    landingsNight: sum(list, 'landingsNight'),
    firstFlightDate: dates[0] ?? null,
    lastFlightDate: dates[dates.length - 1] ?? null,
    landingsLast90Days: last90,
    recencyLapsesOn: last90 >= 3 ? addDays(landingDates[2], 90) : null,
  };
}

export function deriveAircraftStats(flights) {
  const byReg = new Map();
  const byType = new Map();
  for (const f of loggedFlights(flights)) {
    if (f.aircraftReg) byReg.set(f.aircraftReg, [...(byReg.get(f.aircraftReg) ?? []), f]);
    byType.set(f.aircraftType, [...(byType.get(f.aircraftType) ?? []), f]);
  }
  return {
    data: [...byReg].map(([registration, list]) => ({ registration, aircraftType: list[0].aircraftType, ...recencyRow(list) }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes),
    byType: [...byType].map(([aircraftType, list]) => ({ aircraftType, ...recencyRow(list) }))
      .sort((a, b) => b.totalMinutes - a.totalMinutes),
  };
}

const bucket = (key, label, list) => ({ key, label, flights: list.length, totalMinutes: sum(list, 'totalTime') });

function aircraftRow(label, subLabel, list) {
  const dates = list.map((f) => f.date).sort();
  return {
    label, subLabel, flights: list.length, totalMinutes: sum(list, 'totalTime'),
    picMinutes: sum(list, 'picTime'), dualMinutes: sum(list, 'dualTime'),
    nightMinutes: sum(list, 'nightTime'), ifrMinutes: sum(list, 'ifrTime'),
    landings: sum(list, 'allLandings'), distanceNm: Math.round(sum(list, 'distance')),
    firstFlightDate: dates[0] ?? null, lastFlightDate: dates[dates.length - 1] ?? null,
  };
}

const groupBy = (list, keyFn) => {
  const m = new Map();
  for (const f of list) {
    const k = keyFn(f);
    if (k == null || k === '') continue;
    m.set(k, [...(m.get(k) ?? []), f]);
  }
  return m;
};

const flightRef = (f) => f && ({
  id: f.id, date: f.date, aircraftReg: f.aircraftReg, aircraftType: f.aircraftType,
  departureIcao: f.departureIcao, arrivalIcao: f.arrivalIcao, totalMinutes: f.totalTime, distanceNm: f.distance,
});

function airportRows(flights, airports) {
  const rows = new Map();
  for (const f of realFlights(flights)) {
    for (const [code, dir] of [[f.departureIcao, 'departures'], [f.arrivalIcao, 'arrivals']]) {
      if (!code) continue;
      const a = airports[code];
      const r = rows.get(code) ?? {
        icao: code, name: a?.name ?? null, country: a?.country ?? null,
        latitude: a?.lat ?? null, longitude: a?.lon ?? null, departures: 0, arrivals: 0, flights: 0,
      };
      r[dir]++;
      r.flights++;
      rows.set(code, r);
    }
  }
  return [...rows.values()].sort((a, b) => b.flights - a.flights);
}

export function deriveAnalytics(flights, aircraftByReg, airports) {
  const fl = realFlights(flights);
  const sorted = [...fl].sort((a, b) => a.date.localeCompare(b.date));
  const months = [...new Set(fl.map((f) => f.date.slice(0, 7)))].sort();
  let cumulative = 0;
  const monthly = months.map((month) => {
    const list = fl.filter((f) => f.date.startsWith(month));
    cumulative += sum(list, 'totalTime');
    return {
      month, flights: list.length, totalMinutes: sum(list, 'totalTime'),
      picMinutes: sum(list, 'picTime'), sicMinutes: sum(list, 'sicTime'),
      dualMinutes: sum(list, 'dualTime'), dualGivenMinutes: sum(list, 'dualGivenTime'),
      soloMinutes: sum(list, 'soloTime'), nightMinutes: sum(list, 'nightTime'), ifrMinutes: sum(list, 'ifrTime'),
      landingsDay: sum(list, 'landingsDay'), landingsNight: sum(list, 'landingsNight'),
      distanceNm: Math.round(sum(list, 'distance')), cumulativeMinutes: cumulative,
    };
  });
  const years = groupBy(fl, (f) => Number(f.date.slice(0, 4)));
  const yearly = [...years].sort((a, b) => a[0] - b[0]).map(([year, list]) => ({
    year, flights: list.length, totalMinutes: sum(list, 'totalTime'), picMinutes: sum(list, 'picTime'),
    dualMinutes: sum(list, 'dualTime'), nightMinutes: sum(list, 'nightTime'), ifrMinutes: sum(list, 'ifrTime'),
    landings: sum(list, 'allLandings'), distanceNm: Math.round(sum(list, 'distance')),
  }));
  const byType = groupBy(fl, (f) => f.aircraftType);
  const byReg = groupBy(fl, (f) => f.aircraftReg);
  const byClass = groupBy(fl, (f) => classOf(f, aircraftByReg));
  const airportList = airportRows(flights, airports);
  const countries = groupBy(airportList, (a) => a.country);
  const routes = groupBy(fl.filter((f) => f.departureIcao && f.arrivalIcao && f.departureIcao !== f.arrivalIcao),
    (f) => `${f.departureIcao}→${f.arrivalIcao}`);
  const people = (roles) => {
    const m = new Map();
    for (const f of fl) {
      for (const c of f.crewMembers) {
        if (!roles.includes(c.role)) continue;
        const r = m.get(c.name) ?? { name: c.name, role: c.role, contactId: c.contactId, flights: 0, totalMinutes: 0, lastFlightDate: null };
        r.flights++;
        r.totalMinutes += f.totalTime;
        if (!r.lastFlightDate || f.date > r.lastFlightDate) r.lastFlightDate = f.date;
        m.set(c.name, r);
      }
    }
    return [...m.values()].sort((a, b) => b.flights - a.flights);
  };
  const approachTypes = groupBy(fl.flatMap((f) => f.approaches ?? []), (a) => a.type);
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const weekday = (f) => ((new Date(`${f.date}T12:00:00Z`).getUTCDay() + 6) % 7) + 1;
  const hourOf = (f) => Number((f.departureTime || f.offBlockTime || '12:00').slice(0, 2));
  const dur = [
    ['lt30', 'under 30m', 0, 30], ['30to60', '30–60m', 30, 60], ['1to2', '1–2h', 60, 120],
    ['2to3', '2–3h', 120, 180], ['3to5', '3–5h', 180, 300], ['gt5', 'over 5h', 300, Infinity],
  ];
  const days = groupBy(fl, (f) => f.date);
  const busiestDay = [...days].sort((a, b) => b[1].length - a[1].length)[0];
  const busiestMonth = [...monthly].sort((a, b) => b.totalMinutes - a.totalMinutes)[0];
  const busiestYear = [...yearly].sort((a, b) => b.totalMinutes - a.totalMinutes)[0];
  const home = [...groupBy(fl, (f) => f.departureIcao)].sort((a, b) => b[1].length - a[1].length)[0];
  const monthSet = new Set(months);
  let streak = 0;
  let longest = 0;
  let run = 0;
  if (months.length) {
    for (let d = new Date(`${months[0]}-01T00:00:00Z`); d <= TODAY; d.setUTCMonth(d.getUTCMonth() + 1)) {
      run = monthSet.has(d.toISOString().slice(0, 7)) ? run + 1 : 0;
      longest = Math.max(longest, run);
    }
    streak = run;
  }
  const last = sorted[sorted.length - 1];
  return {
    range: { months: 0, allTime: true, from: sorted[0]?.date ?? null, to: day(0) },
    totals: {
      totalFlights: fl.length, totalMinutes: sum(fl, 'totalTime'), picMinutes: sum(fl, 'picTime'),
      sicMinutes: sum(fl, 'sicTime'), dualMinutes: sum(fl, 'dualTime'), dualGivenMinutes: sum(fl, 'dualGivenTime'),
      picusMinutes: 0, spicMinutes: 0, examinerMinutes: 0, reliefMinutes: 0,
      soloMinutes: sum(fl, 'soloTime'), nightMinutes: sum(fl, 'nightTime'), ifrMinutes: sum(fl, 'ifrTime'),
      actualInstrumentMinutes: sum(fl, 'actualInstrumentTime'), simulatedInstrumentMinutes: 0,
      crossCountryMinutes: sum(fl, 'crossCountryTime'),
      crossCountryPicMinutes: fl.filter((f) => f.picTime > 0).reduce((a, f) => a + f.crossCountryTime, 0),
      multiPilotMinutes: sum(fl, 'multiPilotTime'),
      simulatedFlightMinutes: sum(flights, 'simulatedFlightTime'), groundTrainingMinutes: 0,
      landingsDay: sum(fl, 'landingsDay'), landingsNight: sum(fl, 'landingsNight'),
      takeoffsDay: sum(fl, 'takeoffsDay'), takeoffsNight: sum(fl, 'takeoffsNight'),
      approaches: sum(fl, 'approachesCount'), holds: 0, distanceNm: Math.round(sum(fl, 'distance')),
      distinctRegistrations: byReg.size, distinctTypes: byType.size,
      distinctAirports: airportList.length, distinctCountries: countries.size,
      firstFlightDate: sorted[0]?.date ?? null, lastFlightDate: last?.date ?? null,
    },
    monthly: monthly.slice(-12),
    yearly,
    byAircraftType: [...byType].map(([t, list]) => {
      const ac = aircraftByReg[list[0].aircraftReg];
      return aircraftRow(t, ac ? `${ac.make} ${ac.model}` : null, list);
    }).sort((a, b) => b.totalMinutes - a.totalMinutes),
    byRegistration: [...byReg].map(([r, list]) => aircraftRow(r, list[0].aircraftType, list)).sort((a, b) => b.totalMinutes - a.totalMinutes),
    byClass: [...byClass].map(([label, list]) => ({
      label, flights: list.length, totalMinutes: sum(list, 'totalTime'),
      picMinutes: sum(list, 'picTime'), dualMinutes: sum(list, 'dualTime'), landings: sum(list, 'allLandings'),
    })).sort((a, b) => b.totalMinutes - a.totalMinutes),
    byCategory: [],
    byAirport: airportList,
    byCountry: [...countries].map(([country, list]) => ({ country, airports: list.length, flights: sum(list, 'flights') })),
    byRoute: [...routes].map(([, list]) => ({
      departureIcao: list[0].departureIcao, arrivalIcao: list[0].arrivalIcao, flights: list.length,
      totalMinutes: sum(list, 'totalTime'), distanceNm: Math.round(sum(list, 'distance')),
    })).sort((a, b) => b.flights - a.flights).slice(0, 10),
    byInstructor: people(['Instructor']),
    byCrew: people(['Passenger', 'PIC', 'SIC', 'Student', 'SafetyPilot', 'Examiner']),
    approachTypes: [...approachTypes].map(([type, list]) => ({ type, count: list.length })),
    dayOfWeek: dayNames.map((label, i) => bucket(i + 1, label, fl.filter((f) => weekday(f) === i + 1))),
    hourOfDay: Array.from({ length: 24 }, (_, h) => bucket(h, String(h).padStart(2, '0'), fl.filter((f) => hourOf(f) === h))),
    monthOfYear: monthNames.map((label, m) => bucket(m + 1, label, fl.filter((f) => Number(f.date.slice(5, 7)) === m + 1))),
    durationBuckets: dur.map(([key, label, lo, hi]) => bucket(key, label, fl.filter((f) => f.totalTime >= lo && f.totalTime < hi))),
    records: {
      longestFlight: flightRef([...fl].sort((a, b) => b.totalTime - a.totalTime)[0]),
      longestDistanceFlight: flightRef([...fl].sort((a, b) => b.distance - a.distance)[0]),
      busiestDay: busiestDay?.[0] ?? null, busiestDayFlights: busiestDay?.[1].length ?? 0,
      busiestMonth: busiestMonth?.month ?? null, busiestMonthMinutes: busiestMonth?.totalMinutes ?? 0,
      busiestYear: busiestYear?.year ?? null, busiestYearMinutes: busiestYear?.totalMinutes ?? 0,
      longestStreakMonths: longest, currentStreakMonths: streak, activeMonths: months.length,
      daysSinceLastFlight: last ? daysAgo(last.date) : null,
      farthestAirport: airportList.find((a) => a.icao !== home?.[0] && a.latitude != null),
      farthestAirportNm: Math.round(Math.max(0, ...fl.map((f) => f.distance))),
      homeBase: home?.[0] ?? null,
    },
  };
}

function deriveRoutes(flights, airports) {
  const routes = groupBy(realFlights(flights).filter((f) => f.departureIcao !== f.arrivalIcao && airports[f.departureIcao] && airports[f.arrivalIcao]),
    (f) => `${f.departureIcao}→${f.arrivalIcao}`);
  const used = new Set(realFlights(flights).flatMap((f) => [f.departureIcao, f.arrivalIcao]).filter((c) => airports[c]));
  return {
    routes: [...routes].map(([, list]) => {
      const d = airports[list[0].departureIcao];
      const a = airports[list[0].arrivalIcao];
      return {
        departureIcao: list[0].departureIcao, arrivalIcao: list[0].arrivalIcao, flightCount: list.length,
        departureCoords: { lat: d.lat, lng: d.lon }, arrivalCoords: { lat: a.lat, lng: a.lon },
      };
    }),
    airports: [...used].map((icao) => ({ icao, name: airports[icao].name, latitude: airports[icao].lat, longitude: airports[icao].lon, country: airports[icao].country })),
  };
}

function deriveAirportStats(flights, airports) {
  return airportRows(flights, airports)
    .filter((a) => a.latitude != null)
    .map((a) => ({ icao: a.icao, name: a.name, latitude: a.latitude, longitude: a.longitude, totalFlights: a.flights, departures: a.departures, arrivals: a.arrivals }));
}

// ── Readiness (GET /currency/readiness) ──────────────────────────────────────
const MEDICALS = ['EASA_CLASS1_MEDICAL', 'EASA_CLASS2_MEDICAL', 'EASA_LAPL_MEDICAL', 'FAA_CLASS1_MEDICAL', 'FAA_CLASS2_MEDICAL', 'FAA_CLASS3_MEDICAL'];

/** Whether a rating or passenger entry of `classType`/kinds covers `ac`, as the API's native match does. */
const coversAircraft = (classType, ulKinds, ac) => {
  if (!ac) return classType !== undefined;
  if (classType !== ac.aircraftClass) return false;
  if (classType !== 'ULTRALIGHT') return true;
  return !ulKinds?.length || !ac.ulKind || ulKinds.includes(ac.ulKind);
};

/**
 * `ReadinessReport` built from a persona's own currency result, per
 * DOMAIN.md "Readiness". Rating, launch-method and passenger statuses are
 * fixture TODAY's, not projected to `date`; medicals are compared to `date`.
 */
export function deriveReadiness(currency, aircraft, credentials, search) {
  const date = search.get('date') || day(0);
  const reg = search.get('aircraftReg');
  const ac = reg ? aircraft.find((a) => a.registration.toUpperCase() === reg.toUpperCase()) : null;
  const passengers = search.get('passengers') === 'true';
  const ratings = (currency.ratings ?? []).filter((r) => (ac ? r.classType !== 'IR' && coversAircraft(r.classType, r.creditedUltralightKinds, ac) : true));
  const items = [];
  for (const r of ratings) {
    const ready = r.status === 'current' || r.status === 'expiring';
    let reason = { reasonKey: r.messageKey, ...(r.messageParams ? { params: r.messageParams } : {}) };
    if (r.status === 'lapsed') {
      const rows = r.requirements ?? [];
      const first = rows.find((q) => !q.met && q.remedyKey && q.remedyKey !== 'remedy.proficiency_check');
      reason = first
        ? { reasonKey: first.remedyKey, ...(first.remedyParams ? { params: first.remedyParams } : {}) }
        : { reasonKey: 'remedy.proficiency_check' };
    }
    items.push({ kind: 'rating', classRatingId: r.classRatingId, licenseId: r.licenseId, classType: r.classType, ready, status: r.status, ...reason });
  }
  const seen = new Set();
  for (const r of ratings) {
    for (const m of r.launchMethodCurrency ?? []) {
      if (seen.has(m.method)) continue;
      seen.add(m.method);
      items.push({
        kind: 'launch_method', classRatingId: r.classRatingId, licenseId: r.licenseId, classType: r.classType, launchMethod: m.method,
        ready: m.met, status: m.met ? 'current' : 'lapsed',
        ...(m.met
          ? { reasonKey: 'readiness.launch_method_current', ...(m.validUntil ? { params: { date: m.validUntil } } : {}) }
          : { reasonKey: m.remedyKey, params: m.remedyParams }),
      });
    }
  }
  if (passengers) {
    for (const p of currency.passengerCurrency ?? []) {
      if (ac ? !coversAircraft(p.classType, p.ulKind ? [p.ulKind] : null, ac) : !ratings.some((r) => r.classType === p.classType)) continue;
      items.push({
        kind: 'passengers', classType: p.classType, ...(p.ulKind ? { ulKind: p.ulKind } : {}),
        ready: p.dayStatus === 'current', status: p.dayStatus,
        reasonKey: p.messageKey, ...(p.messageParams ? { params: p.messageParams } : {}),
      });
    }
  }
  const latest = new Map();
  for (const c of credentials.filter((x) => MEDICALS.includes(x.credentialType))) {
    const prev = latest.get(c.credentialType);
    if (!prev || (c.expiryDate ?? '9999') > (prev.expiryDate ?? '9999')) latest.set(c.credentialType, c);
  }
  for (const c of latest.values()) {
    const expired = !!c.expiryDate && c.expiryDate <= date;
    items.push({
      kind: 'credential', credentialId: c.id, ready: !expired, status: expired ? 'expired' : 'valid',
      reasonKey: expired ? 'readiness.credential_expired' : 'readiness.credential_valid',
      ...(c.expiryDate ? { params: { date: c.expiryDate } } : {}),
    });
  }
  return { date, ...(ac ? { aircraftReg: ac.registration } : {}), items };
}

// ── Fixture set ──────────────────────────────────────────────────────────────
const EMPTY_PAGE = { data: [], pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 } };
const page = (list, search, fallbackSize) => {
  const pageSize = Number(search.get('pageSize')) || fallbackSize;
  const p = Number(search.get('page')) || 1;
  return {
    data: list.slice((p - 1) * pageSize, p * pageSize),
    pagination: { page: p, pageSize, total: list.length, totalPages: Math.max(1, Math.ceil(list.length / pageSize)) },
  };
};

/**
 * Turns persona data into the fixture set the capture harness routes
 * through. Every path the default fixtures answer is answered here; the ones
 * a persona does not specialise fall back to empty collections.
 */
export function buildFixtureSet(persona) {
  const flights = finalizeFlights(persona.flights ?? []);
  const aircraft = persona.aircraft ?? [];
  const aircraftByReg = Object.fromEntries(aircraft.map((a) => [a.registration, a]));
  const airports = persona.airports ?? {};
  const statistics = deriveStatistics(flights);
  const currency = typeof persona.currency === 'function'
    ? persona.currency(flights, aircraftByReg)
    : persona.currency ?? { ratings: [], passengerCurrency: [] };
  const classRatings = persona.classRatings ?? {};
  const licenses = persona.licenses ?? [];
  const pilotProfile = persona.pilotProfile ?? derivePilotProfile({
    licenses, classRatings, aircraft, flights, settings: persona.profileSettings,
  });

  const routes = {
    '/users/me': persona.user,
    '/users/me/statistics': statistics,
    '/users/me/notifications': { emailOnCurrencyExpiry: true, emailOnCredentialExpiry: true, daysBeforeExpiry: 30 },
    '/users/me/notifications/history': EMPTY_PAGE,
    '/users/me/baseline': null,
    '/users/me/pilot-profile': pilotProfile,
    '/aircraft/stats': deriveAircraftStats(flights),
    '/licenses': licenses,
    '/credentials': persona.credentials ?? [],
    '/contacts': persona.contacts ?? [],
    '/currency': currency,
    '/custom-currency': [],
    '/reports/trends': deriveTrends(flights),
    '/reports/stats-by-class': deriveStatsByClass(flights, aircraftByReg),
    '/reports/routes': deriveRoutes(flights, airports),
    '/reports/airport-stats': deriveAirportStats(flights, airports),
    '/reports/analytics': deriveAnalytics(flights, aircraftByReg, airports),
    '/reports/custom': [],
    '/imports': EMPTY_PAGE,
    '/imports/templates': importTemplates,
    '/backups/destinations': [],
    '/backups/providers': [{ id: 'webdav', name: 'WebDAV' }, { id: 's3', name: 'S3' }],
    '/admin/stats': null,
    '/admin/users': EMPTY_PAGE,
    '/admin/audit-log': EMPTY_PAGE,
    '/admin/email/deliveries': EMPTY_PAGE,
    '/admin/email/suppressions': EMPTY_PAGE,
    '/announcements': { announcements: [], hints: [] },
    '/features': { signatures: true, backups: true, customCurrency: true },
    '/auth/providers': { providers: [] },
    '/auth/webauthn/credentials': [],
    '/auth/sessions': { sessions: [{ id: 's1', deviceLabel: 'Firefox on Linux', ipAddress: '203.0.113.7', createdAt: shift(-2), lastUsedAt: shift(0), expiresAt: shift(5), current: true }], maxSessions: 5 },
    '/flight-sessions/current': null,
  };

  function bodyFor(pathname, search = new URLSearchParams()) {
    const path = pathname.replace(/^.*\/api\/v1/, '');
    if (path === '/flights') return page(flights, search, 25);
    if (path === '/aircraft') return page(aircraft, search, 100);
    if (path in routes) return routes[path];
    if (path === '/currency/readiness') return deriveReadiness(currency, aircraft, persona.credentials ?? [], search);
    const ratingsMatch = path.match(/^\/licenses\/([^/]+)\/(?:class-)?ratings$/);
    if (ratingsMatch) return classRatings[ratingsMatch[1]] ?? [];
    if (/^\/licenses\/[^/]+\/currency$/.test(path)) return currency;
    if (/^\/licenses\/[^/]+\/statistics$/.test(path)) return statistics;
    if (/^\/flights\/[^/]+\/signatures$/.test(path)) return [];
    const flightMatch = path.match(/^\/flights\/([^/]+)$/);
    if (flightMatch) return flights.find((f) => f.id === flightMatch[1]) ?? flights[0] ?? null;
    if (path.startsWith('/documents')) return EMPTY_PAGE;
    return null;
  }

  return {
    user: persona.user, bodyFor, flights, aircraft, currency, pilotProfile,
    profileMismatches: profileMismatches(pilotProfile, persona.expectedDisciplines),
    shotAircraft: persona.shotAircraft ?? [],
  };
}
