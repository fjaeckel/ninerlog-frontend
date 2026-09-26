import { useTranslation } from 'react-i18next';
import { Circle, ListChecks } from 'lucide-react';
import { useAllCurrencyStatus } from '../../hooks/useCurrency';
import { useSeasonPlan } from '../../hooks/useSeasonPlan';

/** Currency page section listing the remedies for everything lapsed; renders nothing when nothing is. */
export function SeasonStartPlanner() {
  const { t } = useTranslation('currency');
  const { data } = useAllCurrencyStatus();
  const groups = useSeasonPlan(data?.ratings ?? []);

  if (groups.length === 0) return null;

  return (
    <section className="card mb-6" data-testid="season-planner" aria-labelledby="season-planner-title">
      <h2 id="season-planner-title" className="section-title flex items-center gap-2">
        <ListChecks className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        {t('seasonPlanner.title')}
      </h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 mb-3">{t('seasonPlanner.subtitle')}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {groups.map((g) => (
          <div key={g.key} data-testid={`season-plan-${g.key}`}>
            <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100 mb-1.5">{g.title}</h3>
            <ul className="space-y-1.5">
              {g.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <Circle className="w-4 h-4 mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
                  <span>{step}</span>
                </li>
              ))}
            </ul>
            {g.alternative && (
              <p className="mt-1.5 pl-6 text-sm text-slate-500 dark:text-slate-400">
                <span className="font-medium">{t('seasonPlanner.orAlternative')}</span> {g.alternative}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
