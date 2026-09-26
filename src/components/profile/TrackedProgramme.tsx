import { useTranslation } from 'react-i18next';
import { GraduationCap } from 'lucide-react';
import type { DisciplineState } from '../../hooks/usePilotProfile';
import { useTrainingProgress } from '../../hooks/useTrainingProgress';
import { trainingProgrammeTitle } from '../../lib/training';

/** Read-only line naming the training programme tracked for a toolkit set to, or derived as, training. */
export function TrackedProgramme({ state }: { state: DisciplineState }) {
  const { t } = useTranslation('currency');
  const inTraining = state.intent === 'goal' || state.status === 'training';
  const { data } = useTrainingProgress();
  if (!inTraining || !data) return null;
  const tracked = (data.programmes ?? []).filter((p) => p.discipline === state.discipline);

  return (
    <p className="mt-1 inline-flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400" data-testid={`tracked-programme-${state.discipline}`}>
      <GraduationCap className="w-4 h-4 shrink-0" aria-hidden="true" />
      {tracked.length > 0
        ? t('trainingCard.tracked', { names: tracked.map((p) => trainingProgrammeTitle(t, p)).join(', ') })
        : t('trainingCard.trackedNone')}
    </p>
  );
}
