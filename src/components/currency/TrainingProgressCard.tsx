import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Check, ChevronDown, Circle, GraduationCap, Info, PenLine } from 'lucide-react';
import { useTrainingProgress, type TrainingItem, type TrainingProgramme } from '../../hooks/useTrainingProgress';
import { useFormatPrefs } from '../../hooks/useFormatPrefs';
import { useRelevance } from '../../lib/relevance';
import {
  formatTrainingProgress,
  itemLegalBasis,
  trainingItemCounts,
  trainingItemLabel,
  trainingItemMessage,
  trainingProgrammeTitle,
} from '../../lib/training';
import { cn } from '../../lib/cn';

/** Dashboard card with progress toward each licence the pilot trains for; renders nothing without a programme. */
export function TrainingProgressCard() {
  const { t } = useTranslation('currency');
  const { data } = useTrainingProgress();
  const programmes = data?.programmes ?? [];
  const record = useMemo(() => ({ programmes: programmes.length }), [programmes.length]);
  const relevance = useRelevance('dashboard.trainingProgress', { record });

  if (programmes.length === 0 || !relevance.visible) return null;

  return (
    <section className="card mb-6" data-testid="training-progress" aria-labelledby="training-progress-title">
      <h2 id="training-progress-title" className="section-title mb-4 flex items-center gap-2">
        <GraduationCap className="w-5 h-5 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        {t('trainingCard.title')}
      </h2>
      <div className="space-y-6">
        {programmes.map((p) => (
          <ProgrammeBlock key={p.id} programme={p} />
        ))}
      </div>
    </section>
  );
}

function ProgrammeBlock({ programme }: { programme: TrainingProgramme }) {
  const { t } = useTranslation('currency');
  const { fmtDuration } = useFormatPrefs();
  const [open, setOpen] = useState(false);
  const detailsId = useId();
  const bars = programme.items.filter((i) => !i.informational);
  const notes = programme.items.filter((i) => i.informational);

  return (
    <div data-testid={`training-programme-${programme.id}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <h3 className="font-semibold text-slate-800 dark:text-slate-100">{trainingProgrammeTitle(t, programme)}</h3>
        {programme.allMet && <span className="badge-current">{t('trainingCard.allMet')}</span>}
      </div>

      {programme.signedFlights > 0 && (
        <p className="mb-3 flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300" data-testid="training-signed-flights">
          <PenLine className="w-4 h-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          {t('trainingCard.signedFlights', { count: programme.signedFlights })}
        </p>
      )}

      <div className="grid gap-x-6 gap-y-4 grid-cols-1 sm:grid-cols-2">
        {bars.map((item) => (
          <ItemBar key={item.key} item={item} />
        ))}
      </div>

      {notes.map((item) => (
        <div
          key={item.key}
          className="mt-4 flex gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-sm dark:border-blue-900/60 dark:bg-blue-950/40"
          data-testid={`training-note-${item.key}`}
        >
          <Info className="w-4 h-4 mt-0.5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
          <p className="text-slate-700 dark:text-slate-300">
            <span className="font-medium text-slate-800 dark:text-slate-100">
              {trainingItemLabel(t, item.key)} ({itemLegalBasis(item.key, programme)}):
            </span>{' '}
            {trainingItemMessage(t, item, fmtDuration)}
          </p>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-controls={detailsId}
        className="mt-2 inline-flex items-center gap-1 min-h-[44px] text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
        data-testid={`training-details-toggle-${programme.id}`}
      >
        <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
        {open ? t('trainingCard.hideDetails') : t('trainingCard.showDetails')}
      </button>
      {open && (
        <div id={detailsId} className="mt-1 space-y-2 text-sm" data-testid={`training-details-${programme.id}`}>
          <ul className="space-y-2">
            {programme.items.map((item) => (
              <li key={item.key}>
                <span className="font-medium text-slate-700 dark:text-slate-300">{trainingItemLabel(t, item.key)}</span>
                <span className="text-slate-500 dark:text-slate-400"> · {t('trainingCard.legalBasis', { basis: itemLegalBasis(item.key, programme) })}</span>
                <span className="block text-slate-600 dark:text-slate-400">{trainingItemCounts(t, item.key)}</span>
              </li>
            ))}
          </ul>
          <p className="text-slate-500 dark:text-slate-400">{t('trainingCard.notTracked')}</p>
        </div>
      )}
    </div>
  );
}

function ItemBar({ item }: { item: TrainingItem }) {
  const { t } = useTranslation('currency');
  const { fmtDuration } = useFormatPrefs();
  const pct = item.required > 0 ? Math.min((item.current / item.required) * 100, 100) : 0;
  const unknownDistance = item.messageKey === 'training.cross_country_distance_unknown';
  const message = item.met && !unknownDistance ? '' : trainingItemMessage(t, item, fmtDuration);

  return (
    <div className="space-y-1" data-testid={`training-item-${item.key}`}>
      <div className="flex justify-between items-center gap-2 text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-300 inline-flex items-center gap-1.5">
          {item.met ? (
            <Check className="w-3.5 h-3.5 shrink-0 text-green-600 dark:text-green-400" aria-label={t('trainingCard.metLabel')} data-testid="training-met" />
          ) : (
            <Circle className="w-3.5 h-3.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
          )}
          {trainingItemLabel(t, item.key)}
        </span>
        <span className="text-slate-500 dark:text-slate-400 font-mono tabular-nums whitespace-nowrap" data-testid="training-progress-text">
          {formatTrainingProgress(t, item, fmtDuration)}
        </span>
      </div>
      <div className="h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full', item.met ? 'bg-green-500 dark:bg-green-400' : 'bg-blue-500 dark:bg-blue-400')}
          style={{ width: `${pct}%` }}
        />
      </div>
      {message && (
        <p
          className={cn(
            'text-xs inline-flex items-start gap-1',
            unknownDistance ? 'text-amber-700 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400',
          )}
          data-testid="training-message"
        >
          {unknownDistance && <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" aria-hidden="true" />}
          {message}
        </p>
      )}
    </div>
  );
}
