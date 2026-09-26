import type { components } from '../api/schema';

type AircraftReminderKind = components['schemas']['AircraftReminderKind'];

/** Reminder kinds in picker order. */
export const REMINDER_KINDS: readonly AircraftReminderKind[] = [
  'ANNUAL_INSPECTION',
  'INSURANCE',
  'ARC',
  'RESCUE_SYSTEM_REPACK',
  'RESCUE_ROCKET_EXPIRY',
  'ELT_BATTERY',
  'CUSTOM',
];

/** Suggested interval in months per kind; `null` means no suggestion. */
export const SUGGESTED_INTERVAL_MONTHS: Record<AircraftReminderKind, number | null> = {
  ANNUAL_INSPECTION: 12,
  INSURANCE: 12,
  ARC: 12,
  RESCUE_SYSTEM_REPACK: null,
  RESCUE_ROCKET_EXPIRY: null,
  ELT_BATTERY: null,
  CUSTOM: null,
};

/** Kinds whose interval comes from the manufacturer's manual. */
export const MANUFACTURER_INTERVAL_KINDS: ReadonlySet<AircraftReminderKind> = new Set([
  'RESCUE_SYSTEM_REPACK',
  'RESCUE_ROCKET_EXPIRY',
]);

/** Today as `YYYY-MM-DD` in UTC. */
export function todayUtc(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
