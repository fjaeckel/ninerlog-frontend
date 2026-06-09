import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingTour } from '../../components/onboarding/OnboardingTour';
import { tourSteps } from '../../components/onboarding/tourSteps';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useAuthStore } from '../../stores/authStore';

beforeAll(() => {
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = ((query: string) => ({
      matches: false, // force the mobile bottom-sheet layout in tests
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  }
});

function seedUser() {
  useAuthStore.setState({
    user: {
      id: 'user-1',
      name: 'Amelia Earhart',
      email: 'amelia@example.com',
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    },
    isAuthenticated: true,
  });
}

function renderTour() {
  return render(
    <>
      <div data-tour="dashboard">dashboard anchor</div>
      <div data-tour="flights">flights anchor</div>
      <button data-tour="more">more anchor</button>
      <OnboardingTour />
    </>
  );
}

describe('OnboardingTour', () => {
  beforeEach(() => {
    seedUser();
    useOnboardingStore.setState({ completedUserIds: [], isOpen: true });
  });

  it('renders nothing when the tour is closed', () => {
    useOnboardingStore.setState({ isOpen: false });
    renderTour();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the personalised welcome step', () => {
    renderTour();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Welcome to NinerLog, Amelia/)).toBeInTheDocument();
    expect(screen.getByText('Step 1 of ' + tourSteps.length)).toBeInTheDocument();
  });

  it('advances to the next step', async () => {
    const user = userEvent.setup();
    renderTour();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Your dashboard')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of ' + tourSteps.length)).toBeInTheDocument();
  });

  it('can navigate back to a previous step', async () => {
    const user = userEvent.setup();
    renderTour();
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText(/Welcome to NinerLog, Amelia/)).toBeInTheDocument();
  });

  it('skips the tour and marks it complete for the user', async () => {
    const user = userEvent.setup();
    renderTour();
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(useOnboardingStore.getState().hasCompleted('user-1')).toBe(true);
  });

  it('closes via the X button without finishing the steps', async () => {
    const user = userEvent.setup();
    renderTour();
    await user.click(screen.getByRole('button', { name: 'Close tour' }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(useOnboardingStore.getState().hasCompleted('user-1')).toBe(true);
  });

  it('completes the tour from the final step', async () => {
    const user = userEvent.setup();
    renderTour();
    for (let i = 0; i < tourSteps.length - 1; i++) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    const finish = screen.getByRole('button', { name: 'Get started' });
    expect(finish).toBeInTheDocument();
    await user.click(finish);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(useOnboardingStore.getState().hasCompleted('user-1')).toBe(true);
  });
});
