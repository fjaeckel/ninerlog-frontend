import { blockMinutes } from './duration';
import { isCanonicalTime } from './timeOfDay';

/** One circuit row: take-off and landing as canonical `HH:MM`, `''`, or unparsed text. */
export interface CircuitLeg {
  takeoff: string;
  landing: string;
}

/** Minutes between take-off and next take-off offered by "Add circuit". */
export const CIRCUIT_TURNAROUND_MIN = 5;

/** Most legs `POST /flights/batch` accepts. */
export const MAX_CIRCUITS = 50;

export const emptyLeg = (): CircuitLeg => ({ takeoff: '', landing: '' });

/** `HH:MM` shifted by `minutes`, wrapping at midnight; `''` for a non-canonical time. */
export function addMinutes(time: string, minutes: number): string {
  if (!isCanonicalTime(time)) return '';
  const total = (Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) + minutes + 24 * 60) % (24 * 60);
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

/** Take-off to landing in minutes; null unless both times are canonical. */
export function legMinutes(leg: CircuitLeg): number | null {
  if (!isCanonicalTime(leg.takeoff) || !isCanonicalTime(leg.landing)) return null;
  return blockMinutes(leg.takeoff, leg.landing);
}

/** Sum of the legs' minutes, counting only complete legs. */
export function totalMinutes(legs: readonly CircuitLeg[]): number {
  return legs.reduce((sum, leg) => sum + (legMinutes(leg) ?? 0), 0);
}

/** The row "Add circuit" appends: take-off a few minutes after the last landing. */
export function nextLeg(legs: readonly CircuitLeg[]): CircuitLeg {
  const last = legs[legs.length - 1];
  const anchor = last && (isCanonicalTime(last.landing) ? last.landing : last.takeoff);
  return { takeoff: anchor ? addMinutes(anchor, CIRCUIT_TURNAROUND_MIN) : '', landing: '' };
}

/** Per-row problem found before sending. */
export type LegProblem = 'missing' | 'invalid' | 'zero';

/** Problem with `leg`, or null when it can be sent. */
export function legProblem(leg: CircuitLeg): LegProblem | null {
  if (!leg.takeoff || !leg.landing) return 'missing';
  if (!isCanonicalTime(leg.takeoff) || !isCanonicalTime(leg.landing)) return 'invalid';
  return legMinutes(leg) === 0 ? 'zero' : null;
}

/** Zero-based leg index and message of a batch 400 `Leg <i>: …`; null for any other error. */
export function parseLegError(message: string): { index: number; message: string } | null {
  const m = message.match(/^Leg (\d+):\s*(.*)$/s);
  return m ? { index: Number(m[1]), message: m[2] } : null;
}

/** `HH:MM` as the API's `HH:MM:SS`. */
export const toApiTime = (time: string): string => `${time}:00`;
