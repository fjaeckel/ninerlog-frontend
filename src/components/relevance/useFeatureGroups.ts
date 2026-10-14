import { useRelevanceResolver, type FeatureId } from '../../lib/relevance';

export interface FeatureOption {
  value: string;
  label: string;
  /** Registry entry deciding the option; options without one are always relevant. */
  feature?: FeatureId;
}

/** Splits options into relevant ones and the rest; `current` always counts as relevant. */
export function useFeatureGroups<T extends FeatureOption>(options: readonly T[], current?: string | null) {
  const resolve = useRelevanceResolver();
  const primary: T[] = [];
  const more: T[] = [];
  for (const o of options) {
    const relevant = o.value === current || !o.feature || resolve(o.feature).visible;
    (relevant ? primary : more).push(o);
  }
  return { primary, more };
}
