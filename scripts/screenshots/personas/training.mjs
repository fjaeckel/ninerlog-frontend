// ── Training progress (GET /training/progress) ───────────────────────────────
// Port of ninerlog-api internal/service/training (service.go, templates.go),
// run over the persona's own records.
import { classifyLicence } from './build.mjs';

const KM_PER_NM = 1.852;
const OTHER_CATEGORY_KINDS = ['PPL_A', 'LAPL_A', 'CPL_A', 'ATPL_A', 'MPL', 'FAA_SPORT', 'FAA_RECREATIONAL', 'FAA_PRIVATE', 'FAA_COMMERCIAL', 'FAA_ATP', 'GPL', 'HELICOPTER'];
const ORDER = ['SPL', 'SPL_TMG_EXTENSION', 'UL_THREE_AXIS', 'UL_WEIGHT_SHIFT'];

const META = {
  SPL: { discipline: 'SAILPLANE', titleKey: 'training.programme.spl', legalBasis: 'SFCL.130', match: (ac) => ac?.aircraftClass === 'GLIDER' },
  SPL_TMG_EXTENSION: { discipline: 'TMG', titleKey: 'training.programme.spl_tmg_extension', legalBasis: 'SFCL.150(b)', match: (ac) => ac?.aircraftClass === 'TMG' },
  UL_THREE_AXIS: {
    discipline: 'ULTRALIGHT', titleKey: 'training.programme.ul_three_axis', legalBasis: 'LuftPersV §42',
    match: (ac) => ac?.aircraftClass === 'ULTRALIGHT' && ['THREE_AXIS', 'THREE_AXIS_MOTORGLIDER'].includes(ac.ulKind),
  },
  UL_WEIGHT_SHIFT: {
    discipline: 'ULTRALIGHT', titleKey: 'training.programme.ul_weight_shift', legalBasis: 'LuftPersV §42',
    match: (ac) => ac?.aircraftClass === 'ULTRALIGHT' && ac.ulKind === 'WEIGHT_SHIFT',
  },
};

/** Programmes for the disciplines in `training`, as `ProgrammesInTraining`. */
function programmesInTraining(profile) {
  const out = new Set();
  for (const st of profile?.disciplines ?? []) {
    if (st.status !== 'training') continue;
    if (st.discipline === 'SAILPLANE') out.add('SPL');
    if (st.discipline === 'TMG') out.add('SPL_TMG_EXTENSION');
    if (st.discipline === 'ULTRALIGHT') {
      if (st.ulKinds.some((k) => k === 'THREE_AXIS' || k === 'THREE_AXIS_MOTORGLIDER')) out.add('UL_THREE_AXIS');
      if (st.ulKinds.includes('WEIGHT_SHIFT')) out.add('UL_WEIGHT_SHIFT');
    }
  }
  return out;
}

const item = (key, required, current, unit) => {
  const met = current >= required;
  return { key, required, current, unit, met, informational: false, messageKey: met ? 'training.met' : 'training.not_met' };
};

const consider = (r, f, minKm) => {
  if ((f.crossCountryTime ?? 0) <= 0) return;
  if ((f.distance ?? 0) <= 0) r.found = true;
  else if (f.distance * KM_PER_NM >= minKm) { r.found = true; r.verified = true; }
};

const crossCountryItem = (key, ...results) => {
  const found = results.some((r) => r.found);
  const verified = results.some((r) => r.verified);
  if (!found) return { key, required: 1, current: 0, unit: 'flights', met: false, informational: false, messageKey: 'training.not_met' };
  return { key, required: 1, current: 1, unit: 'flights', met: true, informational: false, messageKey: verified ? 'training.met' : 'training.cross_country_distance_unknown' };
};

function sum(flights, aircraftByReg, match, soloKm, dualKm) {
  const t = { dual: 0, pic: 0, spic: 0, launches: 0, signed: 0, soloXC: {}, dualXC: {} };
  for (const f of flights) {
    if (f.isSimulator || f.isPassenger || !match(aircraftByReg[f.aircraftReg])) continue;
    t.dual += f.dualTime ?? 0;
    t.pic += f.picTime ?? 0;
    t.spic += f.spicTime ?? 0;
    if ((f.dualTime ?? 0) > 0 || (f.spicTime ?? 0) > 0) t.launches += f.launches ?? 0;
    if (f.signatureId) t.signed++;
    const solo = (f.dualTime ?? 0) === 0 && (f.picTime ?? 0) + (f.spicTime ?? 0) > 0;
    if (soloKm > 0 && solo) consider(t.soloXC, f, soloKm);
    if (dualKm > 0 && (f.dualTime ?? 0) > 0) consider(t.dualXC, f, dualKm);
  }
  return t;
}

/** SFCL.130(b) credit minutes, or null without a licence of another category. */
function creditMinutes(licenses, flights, aircraftByReg) {
  const held = licenses.some((l) => OTHER_CATEGORY_KINDS.includes(classifyLicence(l.licenseType, l.regulatoryAuthority)));
  if (!held) return null;
  const pic = flights
    .filter((f) => !f.isSimulator && !['GLIDER', 'TMG', 'ULTRALIGHT'].includes(aircraftByReg[f.aircraftReg]?.aircraftClass))
    .reduce((a, f) => a + (f.picTime ?? 0), 0);
  return Math.min(Math.floor(pic / 10), 420);
}

function evaluate(id, flights, aircraftByReg, credit) {
  const meta = META[id];
  const p = { id, discipline: meta.discipline, titleKey: meta.titleKey, legalBasis: meta.legalBasis, items: [], allMet: true, signedFlights: 0 };
  if (id === 'SPL') {
    const t = sum(flights, aircraftByReg, meta.match, 50, 100);
    p.signedFlights = t.signed;
    p.items = [
      item('training.spl.instruction_time', 900, t.dual + t.spic, 'minutes'),
      item('training.spl.dual_time', 600, t.dual, 'minutes'),
      item('training.spl.supervised_solo_time', 120, t.spic, 'minutes'),
      item('training.spl.launches', 45, t.launches, 'launches'),
      crossCountryItem('training.spl.cross_country', t.soloXC, t.dualXC),
    ];
    if (credit != null) {
      p.items.push({
        key: 'training.spl.credit_sfcl130b', required: 420, current: credit, unit: 'minutes', met: credit > 0,
        informational: true, messageKey: credit > 0 ? 'training.credit_available' : 'training.credit_none',
      });
    }
  } else if (id === 'SPL_TMG_EXTENSION') {
    const t = sum(flights, aircraftByReg, meta.match, 150, 0);
    p.signedFlights = t.signed;
    p.items = [
      item('training.tmg.instruction_time', 360, t.dual + t.spic, 'minutes'),
      item('training.tmg.dual_time', 240, t.dual, 'minutes'),
      crossCountryItem('training.tmg.solo_cross_country', t.soloXC),
    ];
  } else {
    const t = sum(flights, aircraftByReg, meta.match, 0, 0);
    p.signedFlights = t.signed;
    p.items = id === 'UL_THREE_AXIS'
      ? [item('training.ul.total_time', 1800, t.dual + t.pic + t.spic, 'minutes'), item('training.ul.solo_time', 300, t.pic + t.spic, 'minutes')]
      : [
        item('training.ul.total_time', 1500, t.dual + t.pic + t.spic, 'minutes'),
        item('training.ul.dual_time', 600, t.dual, 'minutes'),
        item('training.ul.solo_time', 300, t.pic + t.spic, 'minutes'),
      ];
  }
  p.allMet = p.items.every((it) => it.informational || it.met);
  return p;
}

/** `TrainingProgress` for the persona's profile, plus the programmes named in `?programme=`. */
export function deriveTrainingProgress({ pilotProfile, licenses = [], flights = [], aircraftByReg = {}, search = new URLSearchParams() }) {
  const wanted = programmesInTraining(pilotProfile);
  for (const id of search.getAll('programme')) if (ORDER.includes(id)) wanted.add(id);
  const credit = wanted.has('SPL') ? creditMinutes(licenses, flights, aircraftByReg) : null;
  return { programmes: ORDER.filter((id) => wanted.has(id)).map((id) => evaluate(id, flights, aircraftByReg, credit)) };
}
