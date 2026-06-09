import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  /**
   * IDs of users who have already completed or skipped the welcome tour on this
   * device. Persisted so the tour only auto-starts once — on a user's first
   * login — and never nags them again afterwards.
   */
  completedUserIds: string[];
  /** Whether the guided tour overlay is currently visible. Not persisted. */
  isOpen: boolean;
  /** Open the tour (used for first-login auto-start and manual replays). */
  open: () => void;
  /** Close the tour without marking it complete (e.g. on logout). */
  close: () => void;
  /** Mark the tour complete/skipped for a user and close the overlay. */
  complete: (userId: string) => void;
  /** Whether a given user has already finished or skipped the tour. */
  hasCompleted: (userId: string) => boolean;
  /** Clear the completion flag for a user so the tour can be replayed. */
  reset: (userId: string) => void;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completedUserIds: [],
      isOpen: false,
      open: () => set({ isOpen: true }),
      close: () => set({ isOpen: false }),
      complete: (userId) =>
        set((state) => ({
          isOpen: false,
          completedUserIds: state.completedUserIds.includes(userId)
            ? state.completedUserIds
            : [...state.completedUserIds, userId],
        })),
      hasCompleted: (userId) => get().completedUserIds.includes(userId),
      reset: (userId) =>
        set((state) => ({
          completedUserIds: state.completedUserIds.filter((id) => id !== userId),
        })),
    }),
    {
      name: 'ninerlog-onboarding',
      // Only the completion flags need to survive reloads; isOpen is transient.
      partialize: (state) => ({ completedUserIds: state.completedUserIds }),
    }
  )
);
