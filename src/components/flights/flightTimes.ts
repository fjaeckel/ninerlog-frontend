import { blockMinutes } from '../../lib/duration';

/** The four clock fields of the flight form. */
export type ClockField = 'offBlockTime' | 'onBlockTime' | 'departureTime' | 'arrivalTime';

/** Which pair of clock times leads the form: block times, or take-off and landing. */
export type TimeLead = 'block' | 'airborne';

export type Clocks = Partial<Record<ClockField, string | null | undefined>>;

export const LEAD_PAIR: Record<TimeLead, readonly [ClockField, ClockField]> = {
  block: ['offBlockTime', 'onBlockTime'],
  airborne: ['departureTime', 'arrivalTime'],
};

const PARTNER: Record<ClockField, ClockField> = {
  offBlockTime: 'onBlockTime',
  onBlockTime: 'offBlockTime',
  departureTime: 'arrivalTime',
  arrivalTime: 'departureTime',
};

const CLOCK_FIELDS: readonly ClockField[] = ['offBlockTime', 'onBlockTime', 'departureTime', 'arrivalTime'];

const filled = (v: string | null | undefined) => !!v && v.trim() !== '';

/** i18n key for a clock missing beside its partner. */
export const pairMissingKey = (field: ClockField) => `form.timePairMissing.${field}`;
/** i18n key for a lead clock when no time was entered. */
export const timeRequiredKey = (field: ClockField) => `form.timeRequired.${field}`;

/**
 * Field errors for the flight's clock times, as the API validates them: block times or
 * take-off and landing, one complete pair at least; a lone half without a complete pair
 * beside it names its missing partner; no times at all names the lead pair.
 */
export function timePairIssues(c: Clocks, lead: TimeLead): Array<[ClockField, string]> {
  const complete = (a: ClockField, b: ClockField) => filled(c[a]) && filled(c[b]);
  if (complete(...LEAD_PAIR.block) || complete(...LEAD_PAIR.airborne)) return [];
  const lone = CLOCK_FIELDS.filter((f) => filled(c[f]) && !filled(c[PARTNER[f]]));
  if (lone.length > 0) return lone.map((f) => [PARTNER[f], pairMissingKey(PARTNER[f])]);
  return LEAD_PAIR[lead].map((f) => [f, timeRequiredKey(f)]);
}

/** Total minutes by the API's rule: the block span, else take-off to landing; null without a complete pair. */
export function totalFromClocks(c: Clocks): { minutes: number; source: TimeLead } | null {
  const block = blockMinutes(c.offBlockTime ?? '', c.onBlockTime ?? '');
  if (block !== null) return { minutes: block, source: 'block' };
  const airborne = blockMinutes(c.departureTime ?? '', c.arrivalTime ?? '');
  if (airborne !== null) return { minutes: airborne, source: 'airborne' };
  return null;
}

/** Field errors for an API 400 about the clock times; empty when the message is about something else. */
export function timeErrorsFromApi(message: string, lead: TimeLead): Array<[ClockField, string]> {
  const pair = message.match(/\b(offBlockTime|onBlockTime|departureTime|arrivalTime) requires (offBlockTime|onBlockTime|departureTime|arrivalTime)\b/);
  if (pair) return [[pair[2] as ClockField, pairMissingKey(pair[2] as ClockField)]];
  if (/offBlockTime and onBlockTime, or departureTime and arrivalTime, are required/.test(message)) {
    return LEAD_PAIR[lead].map((f) => [f, timeRequiredKey(f)]);
  }
  if (/^Invalid block times format/.test(message)) return LEAD_PAIR.block.map((f) => [f, 'form.invalidTime']);
  if (/^Invalid take-off\/landing times format/.test(message)) return LEAD_PAIR.airborne.map((f) => [f, 'form.invalidTime']);
  return [];
}
