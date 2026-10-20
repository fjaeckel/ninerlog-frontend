import { useFeatureGroups, type FeatureOption } from './useFeatureGroups';

interface FeatureOptionsProps {
  options: readonly FeatureOption[];
  current?: string | null;
  /** Label of the group holding the folded options. */
  moreLabel: string;
  /** `data-testid` of that group. */
  moreTestId?: string;
}

/** `<option>`s for a `<select>`: relevant options first, the rest in a "More" group. */
export function FeatureOptions({ options, current, moreLabel, moreTestId }: FeatureOptionsProps) {
  const { primary, more } = useFeatureGroups(options, current);
  return (
    <>
      {primary.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
      {more.length > 0 && (
        <optgroup label={moreLabel} data-testid={moreTestId}>
          {more.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </optgroup>
      )}
    </>
  );
}
