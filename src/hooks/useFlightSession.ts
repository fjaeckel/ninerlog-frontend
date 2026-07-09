import { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '../api/client';
import type { components } from '../api/schema';
import {
  loadQuickLogQueue,
  saveQuickLogQueue,
  enqueueQuickLogEvent,
} from '../lib/quickLogQueue';

type FlightSession = components['schemas']['FlightSession'];
type FlightSessionEvent = components['schemas']['FlightSessionEvent'];
type FlightSessionEventType = FlightSessionEvent['type'];

export type { FlightSession, FlightSessionEvent, FlightSessionEventType };

export interface RecordEventResult {
  session: FlightSession | null;
  /** True when the tap couldn't reach the API and was queued for later sync */
  queued: boolean;
}

/** Error carrying the API's message for a rejected (4xx) event */
export class FlightSessionEventError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FlightSessionEventError';
  }
}

export const useCurrentFlightSession = () => {
  return useQuery({
    queryKey: ['flightSession'],
    queryFn: async (): Promise<FlightSession | null> => {
      const { data, error, response } = await apiClient.GET('/flight-sessions/current');
      if (response?.status === 404) return null; // no open session
      if (error) throw error;
      return data ?? null;
    },
    // Keep the elapsed-time view honest when the page stays open in the cockpit
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
  });
};

export const useRecordFlightSessionEvent = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (event: FlightSessionEvent): Promise<RecordEventResult> => {
      // Stamp the tap instant client-side so a queued/slow request still
      // records the true time, not the time the request finally lands.
      const stamped: FlightSessionEvent = {
        occurredAt: new Date().toISOString(),
        ...event,
      };

      let result: { data?: FlightSession; error?: unknown };
      try {
        result = await apiClient.POST('/flight-sessions/current/events', {
          body: stamped,
        });
      } catch {
        // Network failure (offline at the ramp) — queue for later replay.
        enqueueQuickLogEvent(stamped);
        return { session: null, queued: true };
      }
      if (result.error) {
        const message =
          (result.error as { error?: string })?.error ?? 'Failed to record event';
        throw new FlightSessionEventError(message);
      }
      return { session: result.data ?? null, queued: false };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['flightSession'] });
      // Completion creates a flight — refresh the logbook views.
      if (data.session?.status === 'completed') {
        queryClient.invalidateQueries({ queryKey: ['flights'] });
      }
    },
  });
};

export const useDiscardFlightSession = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (): Promise<void> => {
      const { error, response } = await apiClient.DELETE('/flight-sessions/current');
      if (error && response?.status !== 404) throw error;
    },
    onSuccess: () => {
      // Drop any queued taps too — they belong to the discarded session.
      saveQuickLogQueue([]);
      queryClient.invalidateQueries({ queryKey: ['flightSession'] });
    },
  });
};

/**
 * Replays offline-queued taps in order. Events the server rejects (4xx) are
 * dropped — the session view afterwards shows the pilot what actually stuck,
 * and re-tapping is always safe. Stops at the first network failure and
 * keeps the remainder queued.
 */
export async function flushQuickLogQueue(): Promise<number> {
  const queue = loadQuickLogQueue();
  if (queue.length === 0) return 0;

  let sent = 0;
  for (const event of queue) {
    try {
      await apiClient.POST('/flight-sessions/current/events', { body: event });
      sent++;
    } catch {
      break; // still offline — retry the rest on the next flush
    }
  }
  saveQuickLogQueue(queue.slice(sent));
  return sent;
}

/**
 * Flushes the offline queue on mount, whenever the connection returns, and
 * whenever the app comes back to the foreground. The 'online' event never
 * fires on iOS Safari/PWA when the tab was suspended rather than actually
 * offline, so the visibility listener is what catches "pilot reopens the
 * app back in coverage" on iPhone — there's no Background Sync API there
 * to do it for us while the app is closed.
 */
export function useQuickLogQueueSync() {
  const queryClient = useQueryClient();

  useEffect(() => {
    let cancelled = false;
    const flush = async () => {
      const sent = await flushQuickLogQueue();
      if (sent > 0 && !cancelled) {
        queryClient.invalidateQueries({ queryKey: ['flightSession'] });
        queryClient.invalidateQueries({ queryKey: ['flights'] });
      }
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible') void flush();
    };
    void flush();
    window.addEventListener('online', flush);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      cancelled = true;
      window.removeEventListener('online', flush);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [queryClient]);
}
