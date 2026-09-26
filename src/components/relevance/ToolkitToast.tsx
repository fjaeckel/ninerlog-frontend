import { useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  isKnownDiscipline,
  usePilotProfile,
  useUpdatePilotProfile,
  type Discipline,
  type DisciplineState,
} from '../../hooks/usePilotProfile';
import { toolkitLabel } from '../../lib/relevance';

function activationReason(t: TFunction, state: DisciplineState | undefined): string {
  const evidence = state?.evidence ?? [];
  const ev =
    (state?.status === 'training' && evidence.find((e) => e.source === 'FLIGHTS_DUAL')) ||
    evidence.find((e) => e.strength === 'strong') ||
    evidence[0];
  if (!ev) return t('relevance:toast.fallbackReason');
  const ref = ev.ref.replace(/-/g, '\u2011');
  return t(`relevance:toast.source.${ev.source}`, { ref, defaultValue: ref });
}

/** Non-blocking notices for toolkits that turned on by evidence and await acknowledgement. */
export function ToolkitToast() {
  const { t } = useTranslation('relevance');
  const { data: profile } = usePilotProfile();
  const update = useUpdatePilotProfile();
  const [dismissed, setDismissed] = useState<ReadonlySet<string>>(new Set());
  const [failed, setFailed] = useState<string | null>(null);

  const pending = (profile?.pendingAcknowledgement ?? []).filter(
    (d): d is Discipline => isKnownDiscipline(d) && !dismissed.has(d),
  );
  if (pending.length === 0) return null;

  const act = async (d: Discipline, turnOff: boolean) => {
    setFailed(null);
    try {
      await update.mutateAsync(turnOff ? { intents: { [d]: 'off' }, acknowledge: [d] } : { acknowledge: [d] });
    } catch {
      setFailed(d);
    }
  };

  return (
    <section
      aria-label={t('toast.region')}
      className="fixed inset-x-4 z-[1000] space-y-2 bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom)+2rem)] lg:bottom-4 sm:left-auto sm:right-4 sm:w-96"
    >
      {pending.map((d) => {
        const state = profile?.disciplines.find((s) => s.discipline === d);
        return (
          <div
            key={d}
            role="status"
            data-testid={`toolkit-toast-${d}`}
            className="rounded-lg border border-blue-200 bg-white p-3 shadow-lg dark:border-blue-800 dark:bg-slate-800 animate-fade-in"
          >
            <div className="flex items-start gap-2.5">
              <Sparkles className="mt-0.5 w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <p className="min-w-0 flex-1 pt-0.5 text-sm text-slate-700 dark:text-slate-200">
                {t('toast.turnedOn', { toolkit: toolkitLabel(t, d), reason: activationReason(t, state) })}
              </p>
              <button
                type="button"
                onClick={() => setDismissed((prev) => new Set(prev).add(d))}
                aria-label={t('toast.dismiss')}
                className="-mt-2 -mr-2 inline-flex items-center justify-center w-11 h-11 shrink-0 rounded-md text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
            {failed === d && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{t('toast.failed')}</p>
            )}
            <div className="mt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => void act(d, true)}
                disabled={update.isPending}
                className="btn-ghost btn-sm"
              >
                {t('toast.turnOff')}
              </button>
              <button
                type="button"
                onClick={() => void act(d, false)}
                disabled={update.isPending}
                className="btn-primary btn-sm"
              >
                {t('toast.keep')}
              </button>
            </div>
          </div>
        );
      })}
    </section>
  );
}
