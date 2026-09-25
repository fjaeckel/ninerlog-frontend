import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertCircle, Check, Loader2, Lock, Undo2 } from 'lucide-react';
import { useUpdateFlight } from '../../hooks/useFlights';
import { extractApiError } from '../../lib/errors';
import type { components } from '../../api/schema';
import type { FlightCrewMemberInput } from '../../types/api';
import { CrewEditor } from './CrewEditor';
import { crewDerivedNames, toCrewInputs } from './crewRoles';

type Flight = components['schemas']['Flight'];
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface Draft {
  crew: FlightCrewMemberInput[];
  base: Flight['crewMembers'];
}

/** Crew card of the flight detail page; edits save immediately while the flight is unsigned. */
export function FlightCrewCard({ flight }: { flight: Flight }) {
  const { t } = useTranslation('flights');
  const updateFlight = useUpdateFlight();
  const locked = !!flight.signatureId;
  const [draft, setDraft] = useState<Draft | null>(null);
  const [status, setStatus] = useState<SaveStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [previous, setPrevious] = useState<FlightCrewMemberInput[] | null>(null);
  const seq = useRef(0);

  const serverCrew = toCrewInputs(flight.crewMembers);
  const showDraft = draft && (status === 'saving' || draft.base === flight.crewMembers);
  const crew = showDraft ? draft.crew : serverCrew;

  useEffect(() => {
    if (status !== 'saved') return;
    const id = setTimeout(() => { setStatus('idle'); setPrevious(null); }, 6000);
    return () => clearTimeout(id);
  }, [status]);

  const save = async (next: FlightCrewMemberInput[], undoTo: FlightCrewMemberInput[] | null) => {
    const mine = ++seq.current;
    setDraft({ crew: next, base: flight.crewMembers });
    setStatus('saving');
    setError(null);
    try {
      await updateFlight.mutateAsync({
        id: flight.id,
        data: { crewMembers: next, ...crewDerivedNames(next) },
      });
      if (mine !== seq.current) return;
      setPrevious(undoTo);
      setStatus('saved');
    } catch (err) {
      if (mine !== seq.current) return;
      setDraft(null);
      setPrevious(null);
      setStatus('error');
      setError(extractApiError(err, t('crewEditor.saveFailed')));
    }
  };

  if (locked && serverCrew.length === 0) return null;

  return (
    <div className="card mb-4 break-inside-avoid">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
        <h2 className="section-title flex items-center gap-2">
          {t('sections.crew')}
          {crew.length > 0 && <span className="badge-info text-xs">{crew.length}</span>}
        </h2>
        <SaveIndicator
          status={status}
          onUndo={previous ? () => save(previous, null) : undefined}
        />
      </div>

      {locked ? (
        <p className="mb-3 flex items-start gap-2 text-xs text-slate-500 dark:text-slate-400">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {t('crewEditor.lockedHint')}
        </p>
      ) : (
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          {crew.length > 0 ? t('crewEditor.hint') : t('crewEditor.empty')}
        </p>
      )}

      {status === 'error' && error && (
        <p role="alert" className="mb-3 flex items-start gap-2 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-900/20 dark:text-red-400">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <CrewEditor
        crew={crew}
        disabled={locked}
        onChange={(next) => save(next, crew)}
      />
    </div>
  );
}

function SaveIndicator({ status, onUndo }: { status: SaveStatus; onUndo?: () => void }) {
  const { t } = useTranslation('flights');
  return (
    <span aria-live="polite" className="flex min-h-[24px] items-center gap-2 text-xs">
      {status === 'saving' && (
        <span className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
          {t('crewEditor.saving')}
        </span>
      )}
      {status === 'saved' && (
        <>
          <span className="flex items-center gap-1.5 text-green-700 dark:text-green-400">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {t('crewEditor.saved')}
          </span>
          {onUndo && (
            <button type="button" onClick={onUndo} className="link inline-flex items-center gap-1 text-xs">
              <Undo2 className="h-3.5 w-3.5" aria-hidden="true" />
              {t('crewEditor.undo')}
            </button>
          )}
        </>
      )}
    </span>
  );
}
