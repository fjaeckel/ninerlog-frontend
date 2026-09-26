import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import enCurrency from '../../i18n/locales/en/currency.json';
import deCurrency from '../../i18n/locales/de/currency.json';
import enCommon from '../../i18n/locales/en/common.json';
import deCommon from '../../i18n/locales/de/common.json';
import { PRIVILEGE_KINDS } from '../../lib/privileges';

/** Message, remedy and readiness keys the API emits (ninerlog-api internal/service/currency/messages.go). */
const MESSAGE_KEYS = [
  'rating.no_expiry_date', 'rating.no_expiry_date_manual', 'rating.evaluation_failed', 'rating.expired',
  'rating.expiring', 'rating.valid_until', 'rating.window_not_open', 'rating.revalidation_not_met',
  'rating.revalidation_not_met_prof_check', 'rating.revalidation_expiring_met', 'rating.revalidation_current',
  'rating.recency_not_met', 'rating.recency_current', 'rating.sfcl_tmg_exempt', 'rating.ul_kind_required',
  'rating.ir_hours_and_check_not_met', 'rating.ir_hours_not_met', 'rating.ir_check_not_met', 'rating.ir_current',
  'rating.ir_lapsed_safety_pilot', 'rating.ir_expired_ipc', 'rating.ir_not_applicable', 'rating.pax_not_current',
  'rating.pax_day_current_night_not', 'rating.pax_current_day_night', 'rating.flight_review_glider_alternative',
  'pax.evaluation_failed', 'pax.not_current', 'pax.current_day_no_night_privilege', 'pax.current_day_night_ir_waived',
  'pax.current_day_night', 'pax.day_current_night_not', 'pax.current_day_privilege_separate',
  'pax.gpl_experience_not_met', 'pax.ul_authorisation_missing',
  'privilege.valid', 'privilege.expired', 'privilege.recency_current', 'privilege.recency_not_met',
  'privilege.evaluation_failed',
  'flight_review.evaluation_failed', 'flight_review.none_on_record', 'flight_review.expired',
  'flight_review.expiring', 'flight_review.current',
  'requirement.progress', 'requirement.prof_check_completed', 'requirement.prof_check_missing', 'requirement.untracked',
  'launch_method.progress',
  'remedy.fly_more', 'remedy.training_flight', 'remedy.proficiency_check', 'remedy.launch_method_dual',
  'remedy.privilege_with_instructor',
  'readiness.launch_method_current', 'readiness.credential_valid', 'readiness.credential_expired',
];

/** Requirement name keys (`CurrencyRequirement.nameKey`). */
const NAME_KEYS = [
  'requirement.total_time', 'requirement.pic_time', 'requirement.ifr_time', 'requirement.landings',
  'requirement.day_landings', 'requirement.night_landings', 'requirement.refresher_training',
  'requirement.training_flight', 'requirement.proficiency_check', 'requirement.approaches', 'requirement.holds',
  'requirement.route_sectors', 'requirement.launches', 'requirement.sep_land_time', 'requirement.sep_land_landings',
  'requirement.sep_sea_time', 'requirement.sep_sea_landings', 'requirement.flight_time', 'requirement.training_flights',
  'requirement.tmg_time', 'requirement.tmg_landings', 'requirement.tmg_training_flight', 'requirement.flight_review',
  'requirement.tows', 'requirement.towed_glider_flights', 'requirement.cloud_flying_time',
  'requirement.cloud_flying_flights', 'requirement.instruction_time', 'requirement.instruction_launches',
  'requirement.fi_refresher', 'requirement.pax_prerequisite_time', 'requirement.pax_prerequisite_launches',
  'requirement.pax_competence_flight', 'requirement.ul_xc_flights', 'requirement.ul_xc_landing_flights',
  'requirement.ul_xc_distance',
];

/** `ruleDescriptionKey` values of ratings, passenger currency and privileges. */
const RULE_KEYS = [
  'easa_sep_tmg', 'easa_mep_set', 'easa_ir', 'easa_lapl', 'easa_spl', 'easa_spl_tmg', 'easa_gpl',
  'easa_pax', 'easa_spl_pax', 'easa_spl_tmg_pax', 'faa_ir', 'faa_pax_day_night', 'faa_glider', 'faa_flight_review',
  'ul_luftpersv', 'ul_luftpersv_helicopter', 'ul_gyroplane', 'ul_trike_dulv', 'ul_trike_daec',
  'ul_powered_paraglider', 'ul_sailplane', 'ul_pax',
  'privilege_expiry', 'sfcl_205_towing', 'sfcl_205_banner_towing', 'faa_61_69_towing', 'sfcl_215_cloud_flying',
  'sfcl_360_fi_s', 'dulv_ul_towing', 'sfcl_155_launch_method',
];

/** `CurrencyRequirement.unit` values of regulatory rules. */
const UNITS = [
  'minutes', 'hours', 'landings', 'launches', 'flights', 'approaches', 'holds', 'check', 'review',
  'tows', 'km', 'training', 'flight',
];

type Catalogue = Record<string, unknown>;

/** Whether `path` resolves to a string, directly or as an i18next plural (`_one`/`_other`). */
function has(cat: Catalogue, path: string): boolean {
  const parts = path.split('.');
  const leaf = parts.pop()!;
  let node: unknown = cat;
  for (const p of parts) {
    node = (node as Catalogue | undefined)?.[p];
    if (typeof node !== 'object' || node === null) return false;
  }
  const obj = node as Catalogue;
  const text = (k: string) => typeof obj[k] === 'string' && (obj[k] as string).trim() !== '';
  return text(leaf) || (text(`${leaf}_one`) && text(`${leaf}_other`));
}

const LOCALES = { en: enCurrency, de: deCurrency } as const;

describe('currency key completeness', () => {
  for (const [lang, cat] of Object.entries(LOCALES)) {
    it(`${lang}: every message, remedy and readiness key has text`, () => {
      expect(MESSAGE_KEYS.filter((k) => !has(cat, `messages.${k}`))).toEqual([]);
    });
    it(`${lang}: every requirement name key has text`, () => {
      expect(NAME_KEYS.filter((k) => !has(cat, k))).toEqual([]);
    });
    it(`${lang}: every rule key has a description`, () => {
      expect(RULE_KEYS.filter((k) => !has(cat, `ruleDescriptions.${k}`))).toEqual([]);
    });
    it(`${lang}: every unit has text`, () => {
      expect(UNITS.filter((u) => !has(cat, `units.${u}`))).toEqual([]);
    });
  }

  it('every privilege kind has a label in en and de', () => {
    for (const cat of [enCommon, deCommon]) {
      expect(PRIVILEGE_KINDS.filter((k) => !has(cat, `privilegeKinds.${k}`))).toEqual([]);
    }
  });

  // Runs when the API checkout is next to this repo, or NINERLOG_API_DIR points at it.
  const apiDir = process.env.NINERLOG_API_DIR ?? resolve(process.cwd(), '../ninerlog-api');
  const currencyDir = resolve(apiDir, 'internal/service/currency');
  it.skipIf(!existsSync(resolve(currencyDir, 'messages.go')))('the lists match the API source', () => {
    const messages = readFileSync(resolve(currencyDir, 'messages.go'), 'utf8');
    const literals = [...messages.matchAll(/=\s*"([a-z_]+\.[a-z_]+)"/g)].map((m) => m[1]);
    const apiNames = literals.filter((k) => k.startsWith('requirement.') && !['requirement.progress', 'requirement.prof_check_completed', 'requirement.prof_check_missing', 'requirement.untracked'].includes(k));
    const apiMessages = literals.filter((k) => !apiNames.includes(k));
    expect([...apiMessages].sort()).toEqual([...MESSAGE_KEYS].sort());
    expect([...apiNames].sort()).toEqual([...NAME_KEYS].sort());

    const privileges = readFileSync(resolve(currencyDir, 'privileges.go'), 'utf8');
    const privilegeRules = [...privileges.matchAll(/Rule[A-Za-z0-9]+\s*=\s*"([a-z0-9_]+)"/g)].map((m) => m[1]);
    expect(privilegeRules.length).toBeGreaterThan(0);
    expect(privilegeRules.filter((k) => !RULE_KEYS.includes(k))).toEqual([]);
  });
});
