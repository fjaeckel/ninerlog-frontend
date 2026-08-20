import { useAuthStore } from '../stores/authStore';

/**
 * User preferences for the informational 90-day recency indicators.
 * Per-model defaults on; per-registration defaults off.
 */
export function useRecencyPrefs() {
  const user = useAuthStore((s) => s.user);
  return {
    perModel: user?.recencyPerModel ?? true,
    perRegistration: user?.recencyPerRegistration ?? false,
  };
}
