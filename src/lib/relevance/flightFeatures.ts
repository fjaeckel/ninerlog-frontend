import type { Disciplines } from '../../hooks/usePilotProfile';
import { normalizeAircraftClass } from '../aircraftClass';
import { isSailplane } from '../launchMethod';
import type { Aircraft, FeatureDef, RelevanceCtx } from './registry';

type Rec = Record<string, unknown>;

const rec = (ctx: RelevanceCtx): Rec => ctx.record ?? {};
const positive = (ctx: RelevanceCtx, ...keys: string[]) => keys.some((k) => Number(rec(ctx)[k] ?? 0) > 0);
const present = (ctx: RelevanceCtx, ...keys: string[]) =>
  keys.some((k) => {
    const v = rec(ctx)[k];
    return v !== null && v !== undefined && v !== '' && v !== false;
  });

const on = (d: Disciplines, disc: string) => {
  const s = d.status(disc);
  return s === 'active' || s === 'training';
};

/** Whether take-off and landing lead the flight form for the aircraft: GLIDER, TMG or ULTRALIGHT. */
export function logsAirborneTimes(ac: Pick<Aircraft, 'aircraftClass'> | null | undefined): boolean {
  const cls = normalizeAircraftClass(ac?.aircraftClass);
  return cls === 'GLIDER' || cls === 'TMG' || cls === 'ULTRALIGHT';
}

/** Whether the aircraft can tow a sailplane: SEP/MEP/SET, or a three-axis ultralight. */
export function isPoweredAeroplane(ac: Pick<Aircraft, 'aircraftClass' | 'ulKind'> | null | undefined): boolean {
  const cls = normalizeAircraftClass(ac?.aircraftClass);
  if (/^(SEP|MEP|SET)(_|$)/.test(cls)) return true;
  return cls === 'ULTRALIGHT' && normalizeAircraftClass(ac?.ulKind) === 'THREE_AXIS';
}

const FIELD_OUTLANDING_CLASSES = ['GLIDER', 'TMG', 'ULTRALIGHT'];

/** Whether the aircraft flies with an IGC logger: a sailplane (GLIDER or UL sailplane) or a TMG. */
export function recordsIgc(ac: Pick<Aircraft, 'aircraftClass' | 'ulKind'> | null | undefined): boolean {
  return isSailplane(ac) || normalizeAircraftClass(ac?.aircraftClass) === 'TMG';
}
const TOWED_LAUNCHES = ['winch', 'aerotow'];

/** Flight-form features in the relevance registry. */
export const FLIGHT_FEATURES = [
  {
    id: 'flight.blockTimes',
    kind: 'field',
    serves: ['AEROPLANE', 'HELICOPTER', 'GYROPLANE', 'IFR', 'MULTI_CREW'],
    aircraftMatch: (ac) => !logsAirborneTimes(ac),
    hasData: (ctx) => present(ctx, 'offBlockTime', 'onBlockTime'),
  },
  {
    id: 'flight.launchMethod',
    kind: 'field',
    serves: ['SAILPLANE'],
    aircraftMatch: (ac) => isSailplane(ac),
    hasData: (ctx) => present(ctx, 'launchMethod'),
  },
  {
    id: 'flight.launches',
    kind: 'field',
    serves: ['SAILPLANE'],
    aircraftMatch: (ac) => isSailplane(ac),
    hasData: (ctx) => rec(ctx).launchesOverride === true || present(ctx, 'launches'),
  },
  {
    id: 'flight.releaseHeight',
    kind: 'field',
    serves: ['SAILPLANE'],
    hasData: (ctx) => present(ctx, 'releaseHeightM'),
    relevantWhen: (d, ctx) =>
      (ctx.aircraft ? isSailplane(ctx.aircraft) : on(d, 'SAILPLANE')) &&
      TOWED_LAUNCHES.includes(String(rec(ctx).launchMethod ?? '')),
  },
  {
    id: 'flight.outlanding',
    kind: 'field',
    serves: ['SAILPLANE', 'TMG', 'ULTRALIGHT'],
    aircraftMatch: (ac) => FIELD_OUTLANDING_CLASSES.includes(normalizeAircraftClass(ac.aircraftClass)),
    hasData: (ctx) => rec(ctx).isOutlanding === true,
  },
  {
    id: 'flight.igcImport',
    kind: 'section',
    serves: ['SAILPLANE'],
    aircraftMatch: (ac) => recordsIgc(ac),
  },
  {
    id: 'flight.towFlight',
    kind: 'field',
    serves: ['AEROPLANE', 'SAILPLANE'],
    hasData: (ctx) => rec(ctx).isTowFlight === true,
    relevantWhen: (d, ctx) =>
      ctx.aircraft
        ? isPoweredAeroplane(ctx.aircraft) && on(d, 'SAILPLANE')
        : on(d, 'AEROPLANE') && on(d, 'SAILPLANE'),
  },
  {
    id: 'flight.route',
    kind: 'field',
    serves: ['AEROPLANE', 'TMG', 'IFR'],
    hasData: (ctx) => present(ctx, 'route'),
  },
  {
    id: 'flight.ifrSection',
    kind: 'section',
    serves: ['IFR'],
    hasData: (ctx) =>
      positive(ctx, 'ifrTime', 'actualInstrumentTime', 'simulatedInstrumentTime', 'holds', 'approachesCount') ||
      rec(ctx).isIpc === true ||
      (Array.isArray(rec(ctx).approaches) && (rec(ctx).approaches as unknown[]).length > 0),
  },
  {
    id: 'flight.multiCrew',
    kind: 'field',
    serves: ['MULTI_CREW'],
    aircraftMatch: (ac) => !!ac.isMultiPilot,
    hasData: (ctx) => positive(ctx, 'multiPilotTime', 'picusTime', 'reliefTime', 'sicTime'),
  },
  {
    id: 'flight.spic',
    kind: 'field',
    serves: ['SAILPLANE', 'AEROPLANE', 'TMG', 'ULTRALIGHT', 'GYROPLANE', 'HELICOPTER'],
    hasData: (ctx) => positive(ctx, 'spicTime'),
    relevantWhen: (d) =>
      ['SAILPLANE', 'AEROPLANE', 'TMG', 'ULTRALIGHT', 'GYROPLANE', 'HELICOPTER'].some((disc) => d.status(disc) === 'training'),
  },
  {
    id: 'flight.examiner',
    kind: 'field',
    serves: ['INSTRUCTOR'],
    hasData: (ctx) => positive(ctx, 'examinerTime'),
  },
] as const satisfies readonly FeatureDef[];
