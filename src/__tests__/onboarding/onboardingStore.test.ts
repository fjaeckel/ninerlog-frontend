import { describe, it, expect, beforeEach } from 'vitest';
import { useOnboardingStore } from '../../stores/onboardingStore';

describe('onboardingStore', () => {
  beforeEach(() => {
    useOnboardingStore.setState({ completedUserIds: [], isOpen: false });
  });

  it('opens and closes the tour', () => {
    useOnboardingStore.getState().open();
    expect(useOnboardingStore.getState().isOpen).toBe(true);
    useOnboardingStore.getState().close();
    expect(useOnboardingStore.getState().isOpen).toBe(false);
  });

  it('marks a user complete and closes the tour', () => {
    useOnboardingStore.getState().open();
    useOnboardingStore.getState().complete('user-1');
    const state = useOnboardingStore.getState();
    expect(state.isOpen).toBe(false);
    expect(state.hasCompleted('user-1')).toBe(true);
  });

  it('tracks completion per user', () => {
    useOnboardingStore.getState().complete('user-1');
    const state = useOnboardingStore.getState();
    expect(state.hasCompleted('user-1')).toBe(true);
    expect(state.hasCompleted('user-2')).toBe(false);
  });

  it('does not record duplicate completion entries', () => {
    const { complete } = useOnboardingStore.getState();
    complete('user-1');
    complete('user-1');
    expect(useOnboardingStore.getState().completedUserIds).toEqual(['user-1']);
  });

  it('reset clears completion so the tour can replay', () => {
    useOnboardingStore.getState().complete('user-1');
    useOnboardingStore.getState().reset('user-1');
    expect(useOnboardingStore.getState().hasCompleted('user-1')).toBe(false);
  });
});
