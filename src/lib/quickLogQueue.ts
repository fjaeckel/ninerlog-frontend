import type { components } from '../api/schema';

type FlightSessionEvent = components['schemas']['FlightSessionEvent'];

// Offline queue for quick-log taps, stored with their true occurredAt and
// replayed when the connection returns.
const STORAGE_KEY = 'ninerlog.quicklog.queue';

export function loadQuickLogQueue(): FlightSessionEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuickLogQueue(queue: FlightSessionEvent[]): void {
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

export function enqueueQuickLogEvent(event: FlightSessionEvent): void {
  saveQuickLogQueue([...loadQuickLogQueue(), event]);
}
