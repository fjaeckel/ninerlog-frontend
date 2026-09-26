import type { components } from '../../api/schema';
import type { Discipline } from '../../hooks/usePilotProfile';

export type Aircraft = components['schemas']['Aircraft'];

export type FeatureKind = 'nav' | 'field' | 'section' | 'report' | 'dashboardCard' | 'column' | 'picker';

/** What an adaptive element is judged against: the aircraft in scope and the record in hand. */
export interface RelevanceCtx {
  aircraft?: Aircraft | null;
  record?: Record<string, unknown> | null;
}

/** One adaptive element. */
export interface FeatureDef<Id extends string = string> {
  /** Stable id, e.g. `flight.launchMethod`. */
  id: Id;
  kind: FeatureKind;
  /** Disciplines the element serves; `all` never folds. */
  serves: readonly Discipline[] | 'all';
  /** Decides inside a form when an aircraft is selected. */
  aircraftMatch?: (ac: Aircraft) => boolean;
  /** True when the record already holds data for the element; always shows it. */
  hasData?: (ctx: RelevanceCtx) => boolean;
  /** Column priority added in automatic column mode. */
  columnBoost?: number;
}

/** Declares the registry; throws on a duplicate id. */
export function defineFeatures<const T extends readonly FeatureDef[]>(defs: T): T {
  const seen = new Set<string>();
  for (const d of defs) {
    if (seen.has(d.id)) throw new Error(`duplicate relevance feature id: ${d.id}`);
    seen.add(d.id);
  }
  return defs;
}

/** Disciplines flown in powered aircraft with block times and night privileges. */
const POWERED: readonly Discipline[] = ['AEROPLANE', 'TMG', 'GYROPLANE', 'HELICOPTER', 'IFR', 'MULTI_CREW'];

/** Classes of powered aeroplanes. */
const AEROPLANE_CLASSES = ['SEP_LAND', 'SEP_SEA', 'MEP_LAND', 'MEP_SEA', 'SET_LAND', 'SET_SEA'];

/** Classes the class pickers group by discipline. */
const PICKER_CLASSES = [...AEROPLANE_CLASSES, 'TMG', 'GLIDER', 'ULTRALIGHT', 'GYROPLANE', 'IR'];

const acClass = (ac: Aircraft) => (ac.aircraftClass ?? '').trim().toUpperCase();

/** True for a powered aeroplane class, and for a class the pickers do not know. */
const isAeroplaneOrUnknown = (ac: Aircraft) => {
  const cls = acClass(ac);
  return AEROPLANE_CLASSES.includes(cls) || !PICKER_CLASSES.includes(cls);
};

const positive = (key: string) => (ctx: RelevanceCtx) => Number(ctx.record?.[key] ?? 0) > 0;
const anyTrue = (...keys: string[]) => (ctx: RelevanceCtx) => keys.some((k) => ctx.record?.[k] === true);

/** Every adaptive element in the app. */
export const FEATURES = defineFeatures([
  // Dashboard
  { id: 'dashboard.ifrTile', kind: 'dashboardCard', serves: ['IFR'], hasData: positive('ifrMinutes') },
  { id: 'dashboard.nightTile', kind: 'dashboardCard', serves: POWERED, hasData: positive('nightMinutes') },
  { id: 'dashboard.blockTimeLabel', kind: 'field', serves: POWERED },

  // Currency
  {
    id: 'currency.aircraftRecency',
    kind: 'section',
    serves: ['AEROPLANE', 'TMG', 'GYROPLANE', 'HELICOPTER'],
    hasData: anyTrue('explicit'),
  },

  // Reports
  {
    id: 'reports.instrument',
    kind: 'report',
    serves: ['IFR'],
    hasData: (ctx) => ['ifrMinutes', 'approaches', 'actualInstrumentMinutes'].some((k) => positive(k)(ctx)),
  },

  // Aircraft form
  {
    id: 'aircraft.complexFlags',
    kind: 'field',
    serves: ['AEROPLANE'],
    aircraftMatch: isAeroplaneOrUnknown,
    hasData: anyTrue('isComplex', 'isHighPerformance', 'isTailwheel'),
  },
  { id: 'aircraft.multiPilot', kind: 'field', serves: ['MULTI_CREW'], hasData: anyTrue('isMultiPilot') },

  // Class pickers
  { id: 'classPicker.aeroplane', kind: 'picker', serves: ['AEROPLANE'] },
  { id: 'classPicker.tmg', kind: 'picker', serves: ['TMG'] },
  { id: 'classPicker.glider', kind: 'picker', serves: ['SAILPLANE'] },
  { id: 'classPicker.ultralight', kind: 'picker', serves: ['ULTRALIGHT'] },
  { id: 'classPicker.gyroplane', kind: 'picker', serves: ['GYROPLANE'] },
  { id: 'classPicker.ir', kind: 'picker', serves: ['IFR'] },

  // Flights table, automatic column mode
  { id: 'column.offOnBlock', kind: 'column', serves: POWERED, hasData: anyTrue('hasValue') },
  { id: 'column.nightTime', kind: 'column', serves: POWERED },
  { id: 'column.ifrTime', kind: 'column', serves: ['IFR'] },
  { id: 'column.sicTime', kind: 'column', serves: ['MULTI_CREW'] },
  { id: 'column.picusTime', kind: 'column', serves: ['MULTI_CREW'] },
  { id: 'column.spicTime', kind: 'column', serves: ['MULTI_CREW'] },
  { id: 'column.reliefTime', kind: 'column', serves: ['MULTI_CREW'] },
  { id: 'column.multiPilotTime', kind: 'column', serves: ['MULTI_CREW'] },
  { id: 'column.dualGivenTime', kind: 'column', serves: ['INSTRUCTOR'], columnBoost: 1 },
  { id: 'column.examinerTime', kind: 'column', serves: ['INSTRUCTOR'], columnBoost: 1 },
  { id: 'column.simulatedFlightTime', kind: 'column', serves: ['SIMULATOR'] },
  { id: 'column.launch', kind: 'column', serves: ['SAILPLANE'], hasData: anyTrue('hasValue') },
]);

export type FeatureId = (typeof FEATURES)[number]['id'];

const BY_ID = new Map<string, FeatureDef>(FEATURES.map((f: FeatureDef) => [f.id, f]));

/** Registry entry for `id`, or undefined. */
export const getFeature = (id: string): FeatureDef | undefined => BY_ID.get(id);
