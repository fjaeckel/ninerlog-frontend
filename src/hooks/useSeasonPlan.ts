import { useTranslation } from 'react-i18next';
import { useCurrencyMessages } from '../lib/currencyMessages';
import type { ClassRatingCurrency } from '../types/api';

export interface PlanGroup {
  key: string;
  title: string;
  steps: string[];
  alternative: string | null;
}

const PROF_CHECK = 'requirement.proficiency_check';

/**
 * What restores each lapsed rating and launch method, from the remedies on
 * their unmet rows. A rating's proficiency check is listed as the alternative.
 */
export function useSeasonPlan(ratings: ClassRatingCurrency[]): PlanGroup[] {
  const { t } = useTranslation(['currency', 'common']);
  const messages = useCurrencyMessages();
  const groups: PlanGroup[] = [];

  for (const r of ratings) {
    const label = t(`classTypes.${r.classType}`, { defaultValue: r.classType });
    const heading = [label, r.licenseType].filter(Boolean).join(' · ');
    if (r.status === 'lapsed') {
      const rows = (r.requirements ?? []).filter((q) => !q.met && q.remedyKey);
      const steps = rows
        .filter((q) => q.nameKey !== PROF_CHECK)
        .map((q) => (q.remedyKey === 'remedy.fly_more' ? `${messages.requirementName(q)}: ${messages.remedy(q)}` : messages.remedy(q)));
      const check = rows.find((q) => q.nameKey === PROF_CHECK);
      const alternative = check ? messages.remedy(check) : null;
      if (steps.length > 0 || alternative) {
        groups.push({
          key: `rating-${r.classRatingId}`,
          title: heading,
          steps: steps.length > 0 ? steps : [alternative as string],
          alternative: steps.length > 0 ? alternative : null,
        });
      }
    }
    for (const m of r.launchMethodCurrency ?? []) {
      if (m.met || !m.remedyKey) continue;
      groups.push({
        key: `launch-${r.classRatingId}-${m.method}`,
        title: `${heading} · ${messages.launchMethod(m.method)}`,
        steps: [messages.remedy(m)],
        alternative: null,
      });
    }
  }
  return groups;
}
