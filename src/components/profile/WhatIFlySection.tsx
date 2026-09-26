import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  usePilotProfile,
  useUpdatePilotProfile,
  type DisciplineIntent,
  type DisciplineState,
  type PilotProfileUpdate,
} from '../../hooks/usePilotProfile';
import { toolkitLabel, toolkitName } from '../../lib/relevance';
import { cn } from '../../lib/cn';
import { FoldDrawer, Folded } from '../relevance/FoldDrawer';

const INTENTS: readonly DisciplineIntent[] = ['auto', 'on', 'off', 'goal'];

const STATUS_BADGE: Record<string, string> = {
  active: 'badge-current',
  training: 'badge-info',
  dormant: 'badge-expiring',
  off: 'badge-neutral',
};

/** Profile section listing every toolkit with its status, evidence and intent, plus the everything switch. */
export function WhatIFlySection() {
  const { t } = useTranslation('relevance');
  const { data: profile, isLoading, isError } = usePilotProfile();
  const update = useUpdatePilotProfile();
  const [error, setError] = useState('');

  const save = async (body: PilotProfileUpdate) => {
    setError('');
    try {
      await update.mutateAsync(body);
    } catch {
      setError(t('whatIFly.saveFailed'));
    }
  };

  const states = profile?.disciplines ?? [];
  const shown = states.filter((s) => s.status !== 'off' || s.intent !== 'auto');
  const others = states.filter((s) => s.status === 'off' && s.intent === 'auto');

  const row = (s: DisciplineState) => (
    <DisciplineRow
      key={s.discipline}
      state={s}
      disabled={update.isPending}
      onIntent={(intent) => void save({ intents: { [s.discipline]: intent } })}
    />
  );

  return (
    <div className="card" id="what-i-fly" data-testid="what-i-fly">
      <h2 className="section-title mb-4">{t('whatIFly.title')}</h2>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-3">{t('whatIFly.description')}</p>

      {isLoading && <div className="h-24 rounded-md bg-slate-100 dark:bg-slate-700/50 animate-pulse" aria-hidden="true" />}
      {isError && <p className="text-sm text-amber-700 dark:text-amber-400">{t('whatIFly.loadError')}</p>}

      {profile && (
        <>
          {shown.length === 0 && (
            <p className="text-sm text-slate-600 dark:text-slate-300">{t('whatIFly.noneActive')}</p>
          )}
          {shown.length > 0 && (
            <ul className="divide-y divide-slate-200 dark:divide-slate-700">{shown.map(row)}</ul>
          )}
          <FoldDrawer explain={false} className="mt-1" label={(count) => t('whatIFly.others', { count })}>
            {others.length > 0 && (
              <Folded count={others.length}>
                <ul className="divide-y divide-slate-200 dark:divide-slate-700">{others.map(row)}</ul>
              </Folded>
            )}
          </FoldDrawer>

          <label className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex items-start gap-3 min-h-[44px] cursor-pointer">
            <input
              type="checkbox"
              role="switch"
              checked={profile.mode === 'everything'}
              onChange={(e) => void save({ mode: e.target.checked ? 'everything' : 'adaptive' })}
              disabled={update.isPending}
              className="checkbox mt-0.5"
              data-testid="show-everything-toggle"
            />
            <span className="text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">{t('whatIFly.showEverything')}</span>
              <span className="block text-slate-500 dark:text-slate-400">{t('whatIFly.showEverythingHelp')}</span>
            </span>
          </label>
        </>
      )}

      {error && <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>}
    </div>
  );
}

interface DisciplineRowProps {
  state: DisciplineState;
  disabled: boolean;
  onIntent: (intent: DisciplineIntent) => void;
}

function DisciplineRow({ state, disabled, onIntent }: DisciplineRowProps) {
  const { t } = useTranslation('relevance');
  const [open, setOpen] = useState(false);
  const d = state.discipline;
  const selectId = `intent-${d}`;
  const evidence = state.evidence;

  return (
    <li className="py-3" data-testid={`discipline-${d}`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <label htmlFor={selectId} className="font-medium text-slate-800 dark:text-slate-100">
            {toolkitName(t, d)}
          </label>
          <span className={STATUS_BADGE[state.status] ?? 'badge-current'}>
            {t(`status.${state.status}`, { defaultValue: state.status })}
          </span>
        </div>
        <select
          id={selectId}
          value={state.intent}
          onChange={(e) => onIntent(e.target.value as DisciplineIntent)}
          disabled={disabled}
          aria-label={t('whatIFly.intentLabel', { toolkit: toolkitLabel(t, d) })}
          className="input w-full sm:w-44"
        >
          {INTENTS.map((i) => (
            <option key={i} value={i}>{t(`intent.${i}`)}</option>
          ))}
        </select>
      </div>

      {evidence.length > 0 && (
        <div className="mt-1">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
            className="inline-flex items-center gap-1 min-h-[44px] text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
          >
            <ChevronDown className={cn('w-4 h-4 transition-transform', open && 'rotate-180')} aria-hidden="true" />
            {t('whatIFly.why', { count: evidence.length })}
          </button>
          {open && (
            <ul className="mt-1 space-y-1 pl-5 text-sm">
              {evidence.map((ev, i) => (
                <li key={`${ev.source}-${ev.refId ?? i}`} className="text-slate-700 dark:text-slate-300">
                  {ev.ref}
                  <span className="text-slate-500 dark:text-slate-400"> · {t(`strength.${ev.strength}`, { defaultValue: ev.strength })}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  );
}
