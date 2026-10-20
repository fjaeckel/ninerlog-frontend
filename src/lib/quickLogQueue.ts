import type { components } from '../api/schema';
import type { LaunchMethod } from './launchMethod';

type FlightSessionEvent = components['schemas']['FlightSessionEvent'];

/** A queued tap, with the launch method to set on the flight it completes. */
export type QueuedQuickLogEvent = FlightSessionEvent & { launchMethod?: LaunchMethod };

// Offline queue for quick-log taps, stored with their true occurredAt and
// replayed when the connection returns.
const STORAGE_KEY = 'ninerlog.quicklog.queue';

export function loadQuickLogQueue(): QueuedQuickLogEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuickLogQueue(queue: QueuedQuickLogEvent[]): void {
  try {
    if (queue.length === 0) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    }
  } catch {
    // Storage full/unavailable; drop.
  }
}

export function enqueueQuickLogEvent(event: QueuedQuickLogEvent): void {
  saveQuickLogQueue([...loadQuickLogQueue(), event]);
}
