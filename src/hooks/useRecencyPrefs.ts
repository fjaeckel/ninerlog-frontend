import { useAuthStore } from '../stores/authStore';

/**
 * User preferences for the informational 90-day recency indicators.
 * Per-model is on by default; per-registration is off by default (FCL.060(b)
 * recency is defined per type/class, so per-registration is a familiarity aid).
 */
export function useRecencyPrefs() {
  const user = useAuthStore((s) => s.user);
  return {
    perModel: user?.recencyPerModel ?? true,
    perRegistration: user?.recencyPerRegistration ?? false,
  };
}
