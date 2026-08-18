import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface OnboardingState {
  /**
   * IDs of users who have completed or skipped the welcome tour on this
   * device. Persisted.
   */
  completedUserIds: string[];
  /** Whether the guided tour overlay is currently visible. Not persisted. */
  isOpen: boolean;
  /** Open the tour. */
  open: () => void;
  /** Close the tour without marking it complete (e.g. on logout). */
  close: () => void;
  /** Mark the tour complete/skipped for a user and close the overlay. */
  complete: (userId: string) => void;
  /** Whether a given user has already finished or skipped the tour. */
  hasCompleted: (userId: string) => boolean;
  /** Clear the completion flag for a user. */
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
      // Persist only the completion flags; isOpen is transient.
      partialize: (state) => ({ completedUserIds: state.completedUserIds }),
    }
  )
);
