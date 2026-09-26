import { classPickerFeature, useRelevanceResolver } from '../../lib/relevance';

export interface ClassOption {
  value: string;
  label: string;
}

/** Splits class options into the pilot's relevant classes and the rest; `current` always counts as relevant. */
export function useClassGroups<T extends ClassOption>(options: readonly T[], current?: string | null) {
  const resolve = useRelevanceResolver();
  const primary: T[] = [];
  const more: T[] = [];
  for (const o of options) {
    const feature = classPickerFeature(o.value);
    const relevant = o.value === current || !feature || resolve(feature).visible;
    (relevant ? primary : more).push(o);
  }
  if (primary.length === 0) return { primary: more, more: [] as T[] };
  return { primary, more };
}
