import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useUpdateFlight } from '../../hooks/useFlights';
import { extractApiCode } from '../../lib/errors';
import { isReasonTooLong, logbookErrorMessage } from '../../lib/logbookErrors';
import { CorrectionReasonDialog } from './CorrectionReasonDialog';
import type { components } from '../../api/schema';

type Flight = components['schemas']['Flight'];
type FlightUpdate = components['schemas']['FlightUpdate'];

/** Result of a correctable update: saved, or the reason prompt was cancelled. */
export type CorrectableUpdateOutcome = { status: 'saved'; flight: Flight } | { status: 'cancelled' };

interface Pending {
  id: string;
  data: FlightUpdate;
  settle: (outcome: CorrectableUpdateOutcome) => void;
  fail: (err: unknown) => void;
}

/**
 * Flight update that handles `correction_reason_required`: asks for a reason
 * in a dialog and resubmits with `correctionReason`.
 *
 * `save` resolves once the flight is saved or the prompt is cancelled, and
 * rejects with any other API error (also one raised by the resubmit, except
 * errors about the reason itself, which are shown in the dialog). Render
 * `dialog` once.
 */
export function useCorrectableFlightUpdate(): {
  save: (id: string, data: FlightUpdate) => Promise<CorrectableUpdateOutcome>;
  dialog: ReactNode;
  isPending: boolean;
} {
  const { t } = useTranslation(['logbook', 'common']);
  const updateFlight = useUpdateFlight();
  const [pending, setPending] = useState<Pending | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const mountedRef = useRef(true);
  const submittingRef = useRef(false);

  const setPrompt = (next: Pending | null) => {
    pendingRef.current = next;
    if (mountedRef.current) setPending(next);
  };

  // Unmount: settle an open prompt as cancelled and drop it.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const current = pendingRef.current;
      pendingRef.current = null;
      if (current && !submittingRef.current) current.settle({ status: 'cancelled' });
    };
  }, []);

  const save = async (id: string, data: FlightUpdate): Promise<CorrectableUpdateOutcome> => {
    try {
      const flight = await updateFlight.mutateAsync({ id, data });
      return { status: 'saved', flight };
    } catch (err) {
      if (extractApiCode(err) !== 'correction_reason_required') throw err;
      if (!mountedRef.current) return { status: 'cancelled' };
      return new Promise<CorrectableUpdateOutcome>((settle, fail) => {
        setError(null);
        setPrompt({ id, data, settle, fail });
      });
    }
  };

  const submitReason = async (reason: string) => {
    const current = pendingRef.current;
    if (!current) return;
    setError(null);
    submittingRef.current = true;
    try {
      const flight = await updateFlight.mutateAsync({
        id: current.id,
        data: { ...current.data, correctionReason: reason },
      });
      setPrompt(null);
      current.settle({ status: 'saved', flight });
    } catch (err) {
      if (extractApiCode(err) === 'correction_reason_required' || isReasonTooLong(err)) {
        if (mountedRef.current) {
          setError(logbookErrorMessage(err, t) ?? t('logbook:errors.saveFailed'));
        } else {
          setPrompt(null);
          current.settle({ status: 'cancelled' });
        }
        return;
      }
      setPrompt(null);
      current.fail(err);
    } finally {
      submittingRef.current = false;
    }
  };

  const cancel = () => {
    const current = pendingRef.current;
    setPrompt(null);
    current?.settle({ status: 'cancelled' });
  };

  const dialog = (
    <CorrectionReasonDialog
      open={pending !== null}
      onCancel={cancel}
      onSubmit={submitReason}
      isSubmitting={updateFlight.isPending}
      error={error}
    />
  );

  return { save, dialog, isPending: updateFlight.isPending };
}
