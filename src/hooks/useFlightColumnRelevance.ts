import { useMemo } from 'react';
import { getFeature, resolveRelevance, type FeatureId } from '../lib/relevance';
import { useDisciplines, type Disciplines } from './usePilotProfile';
import type { ColumnRelevance } from '../components/flights/flightTableColumns';

const featureOf = (key: string): FeatureId | undefined => {
  const id = `column.${key}`;
  return getFeature(id) ? (id as FeatureId) : undefined;
};

/** Column relevance for automatic mode from the registry entries `column.<key>`. */
export function columnRelevanceFor(d: Disciplines): ColumnRelevance {
  return {
    relevant: (key, hasValue) => {
      const id = featureOf(key);
      return !id || resolveRelevance(getFeature(id), d, { record: { hasValue } }).visible;
    },
    boost: (key) => {
      const id = featureOf(key);
      return (id && getFeature(id)?.columnBoost) || 0;
    },
  };
}

/** Column relevance for the signed-in pilot. */
export function useFlightColumnRelevance(): ColumnRelevance {
  const d = useDisciplines();
  return useMemo(() => columnRelevanceFor(d), [d]);
}
