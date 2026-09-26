import type { ComponentType } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check,
  CloudFog,
  Fan,
  Feather,
  GraduationCap,
  Helicopter,
  Monitor,
  Plane,
  PlaneTakeoff,
  Users,
  Wind,
} from 'lucide-react';
import { DISCIPLINES, type Discipline } from '../../hooks/usePilotProfile';
import type { Pick, Picks } from './disciplinePicks';
import { toolkitName } from '../../lib/relevance';
import { cn } from '../../lib/cn';

const ICONS: Record<Discipline, ComponentType<{ className?: string }>> = {
  AEROPLANE: Plane,
  TMG: PlaneTakeoff,
  SAILPLANE: Wind,
  ULTRALIGHT: Feather,
  GYROPLANE: Fan,
  HELICOPTER: Helicopter,
  IFR: CloudFog,
  MULTI_CREW: Users,
  INSTRUCTOR: GraduationCap,
  SIMULATOR: Monitor,
};

const NEXT: Record<Pick, Pick> = { none: 'on', on: 'goal', goal: 'none' };

interface Props {
  picks: Picks;
  initial: Picks;
  logbook: ReadonlySet<Discipline>;
  onChange: (picks: Picks) => void;
  error?: string;
}

/** Toolkit tiles; each tap cycles I fly this → training for this → not selected. */
export function DisciplinesStep({ picks, initial, logbook, onChange, error }: Props) {
  const { t } = useTranslation(['onboarding', 'relevance']);

  return (
    <div className="mt-3" data-testid="onboarding-disciplines">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">{t('onboarding:tour.disciplines.legend')}</p>
      <ul className="grid grid-cols-2 gap-2">
        {DISCIPLINES.map((d) => {
          const Icon = ICONS[d];
          const pick = picks[d];
          const name = toolkitName(t, d);
          const state =
            pick === 'none'
              ? logbook.has(d)
                ? t('onboarding:tour.disciplines.auto')
                : t('onboarding:tour.disciplines.none')
              : t(`onboarding:tour.disciplines.${pick}`);
          const note = pick !== 'none' && logbook.has(d) && pick === initial[d] ? t('onboarding:tour.disciplines.fromLogbook') : null;
          return (
            <li key={d}>
              <button
                type="button"
                data-testid={`onboarding-discipline-${d}`}
                data-pick={pick}
                aria-label={t('onboarding:tour.disciplines.tileLabel', { name, state: note ? `${state}, ${note}` : state })}
                onClick={() => onChange({ ...picks, [d]: NEXT[pick] })}
                className={cn(
                  'w-full h-full min-h-[56px] flex items-center gap-2.5 rounded-lg border px-2.5 py-2 text-left transition-colors',
                  pick === 'on' &&
                    'border-blue-500 bg-blue-50 text-blue-900 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-100',
                  pick === 'goal' &&
                    'border-amber-500 bg-amber-50 text-amber-900 dark:border-amber-400 dark:bg-amber-900/30 dark:text-amber-100',
                  pick === 'none' &&
                    'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60',
                )}
              >
                <span className="relative shrink-0">
                  <Icon className="w-5 h-5" aria-hidden="true" />
                  {pick === 'on' && (
                    <Check className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 rounded-full bg-blue-600 text-white dark:bg-blue-400 dark:text-slate-900" aria-hidden="true" />
                  )}
                  {pick === 'goal' && (
                    <GraduationCap className="absolute -right-1.5 -bottom-1.5 w-3.5 h-3.5 rounded-full bg-amber-500 text-white dark:bg-amber-400 dark:text-slate-900" aria-hidden="true" />
                  )}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium leading-tight truncate">{name}</span>
                  <span
                    className={cn(
                      'block text-xs leading-tight mt-0.5',
                      pick === 'none' ? 'text-slate-500 dark:text-slate-400' : 'opacity-80',
                    )}
                  >
                    {state}
                  </span>
                  {note && <span className="block text-[11px] leading-tight mt-0.5 opacity-70">{note}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && (
        <p role="alert" className="mt-2 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
