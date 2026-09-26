import { useTranslation } from 'react-i18next';
import { useClassGroups, type ClassOption } from './useClassGroups';

interface ClassOptionsProps {
  options: readonly ClassOption[];
  /** The selected value; stays in the relevant group. */
  current?: string | null;
}

/** `<option>`s for a class `<select>`: relevant classes first, the rest in a "More classes" group. */
export function ClassOptions({ options, current }: ClassOptionsProps) {
  const { t } = useTranslation('relevance');
  const { primary, more } = useClassGroups(options, current);
  return (
    <>
      {primary.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
      {more.length > 0 && (
        <optgroup label={t('moreClasses')} data-testid="more-classes">
          {more.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </optgroup>
      )}
    </>
  );
}
