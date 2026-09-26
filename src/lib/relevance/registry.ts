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

/** Every adaptive element in the app. */
export const FEATURES = defineFeatures([]);

export type FeatureId = (typeof FEATURES)[number]['id'];

const BY_ID = new Map<string, FeatureDef>(FEATURES.map((f: FeatureDef) => [f.id, f]));

/** Registry entry for `id`, or undefined. */
export const getFeature = (id: string): FeatureDef | undefined => BY_ID.get(id);
