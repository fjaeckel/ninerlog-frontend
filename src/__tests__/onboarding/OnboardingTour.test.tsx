import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import { OnboardingTour } from '../../components/onboarding/OnboardingTour';
import { tourSteps } from '../../components/onboarding/tourSteps';
import type { PilotProfile } from '../../hooks/usePilotProfile';
import { PERSONA_PROFILES, profileWith } from '../../test/pilotProfile';

const GET = vi.fn();
const PATCH = vi.fn();
vi.mock('../../api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => GET(...args),
    PATCH: (...args: unknown[]) => PATCH(...args),
  },
}));

/** A profile the pilot has already answered: the disciplines step is left out. */
const answered = (): PilotProfile => {
  const p = profileWith({});
  p.disciplines[0] = { ...p.disciplines[0], intent: 'off' };
  return p;
};
const withoutDisciplines = tourSteps.length - 1;
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
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <div data-tour="dashboard">dashboard anchor</div>
      <div data-tour="flights">flights anchor</div>
      <button data-tour="more">more anchor</button>
      <OnboardingTour />
    </QueryClientProvider>
  );
}

describe('OnboardingTour', () => {
  beforeEach(() => {
    seedUser();
    useOnboardingStore.setState({ completedUserIds: [], isOpen: true });
    vi.clearAllMocks();
    GET.mockResolvedValue({ data: answered(), error: undefined });
  });

  it('renders nothing when the tour is closed', () => {
    useOnboardingStore.setState({ isOpen: false });
    renderTour();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens on the personalised welcome step once toolkits are chosen', async () => {
    renderTour();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByText(/Welcome to NinerLog, Amelia/)).toBeInTheDocument();
    expect(screen.getByText('Step 1 of ' + withoutDisciplines)).toBeInTheDocument();
  });

  it('advances to the next step', async () => {
    const user = userEvent.setup();
    renderTour();
    await screen.findByText(/Welcome to NinerLog, Amelia/);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByText('Your dashboard')).toBeInTheDocument();
    expect(screen.getByText('Step 2 of ' + withoutDisciplines)).toBeInTheDocument();
  });

  it('can navigate back to a previous step', async () => {
    const user = userEvent.setup();
    renderTour();
    await screen.findByText(/Welcome to NinerLog, Amelia/);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    await user.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText(/Welcome to NinerLog, Amelia/)).toBeInTheDocument();
  });

  it('skips the tour and marks it complete for the user', async () => {
    const user = userEvent.setup();
    renderTour();
    await screen.findByText(/Welcome to NinerLog, Amelia/);
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
    await screen.findByText(/Welcome to NinerLog, Amelia/);
    for (let i = 0; i < withoutDisciplines - 1; i++) {
      await user.click(screen.getByRole('button', { name: 'Next' }));
    }
    const finish = screen.getByRole('button', { name: 'Get started' });
    expect(finish).toBeInTheDocument();
    await user.click(finish);
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(useOnboardingStore.getState().hasCompleted('user-1')).toBe(true);
  });
});

const ruth = (): PilotProfile => profileWith({});
const tile = (d: string) => screen.getByTestId(`onboarding-discipline-${d}`);

describe('OnboardingTour disciplines step', () => {
  beforeEach(() => {
    seedUser();
    useOnboardingStore.setState({ completedUserIds: [], isOpen: true });
    vi.clearAllMocks();
    PATCH.mockImplementation(async (_path: string, { body }: { body: unknown }) => ({ data: { ...ruth(), echo: body }, error: undefined }));
  });

  it('R1: opens with the question and writes on and goal intents', async () => {
    GET.mockResolvedValue({ data: ruth(), error: undefined });
    const user = userEvent.setup();
    renderTour();
    expect(await screen.findByText('What do you fly, and what are you training for?')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of ' + tourSteps.length)).toBeInTheDocument();

    await user.click(tile('SAILPLANE'));
    await user.click(tile('AEROPLANE'));
    await user.click(tile('AEROPLANE'));
    expect(tile('SAILPLANE')).toHaveAttribute('data-pick', 'on');
    expect(tile('AEROPLANE')).toHaveAttribute('data-pick', 'goal');
    expect(within(tile('AEROPLANE')).getByText("I'm training for this")).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(PATCH).toHaveBeenCalledWith('/users/me/pilot-profile', {
      body: { intents: { AEROPLANE: 'goal', SAILPLANE: 'on' } },
    });
    expect(await screen.findByText(/Welcome to NinerLog, Amelia/)).toBeInTheDocument();
  });

  it('a third tap clears the tile and writes nothing', async () => {
    GET.mockResolvedValue({ data: ruth(), error: undefined });
    const user = userEvent.setup();
    renderTour();
    await screen.findByText('What do you fly, and what are you training for?');
    for (let i = 0; i < 3; i++) await user.click(tile('IFR'));
    expect(tile('IFR')).toHaveAttribute('data-pick', 'none');
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(PATCH).not.toHaveBeenCalled();
    expect(await screen.findByText(/Welcome to NinerLog, Amelia/)).toBeInTheDocument();
  });

  it('R2: Skip leaves every toolkit automatic and moves on', async () => {
    GET.mockResolvedValue({ data: ruth(), error: undefined });
    const user = userEvent.setup();
    renderTour();
    await screen.findByText('What do you fly, and what are you training for?');
    await user.click(tile('SAILPLANE'));
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(PATCH).not.toHaveBeenCalled();
    expect(await screen.findByText(/Welcome to NinerLog, Amelia/)).toBeInTheDocument();
    expect(useOnboardingStore.getState().isOpen).toBe(true);
  });

  it('R2: a failed profile load still offers the step, unticked, and Skip still works', async () => {
    GET.mockResolvedValue({ data: undefined, error: { error: 'boom' } });
    const user = userEvent.setup();
    renderTour();
    expect(await screen.findByText('What do you fly, and what are you training for?')).toBeInTheDocument();
    expect(tile('SAILPLANE')).toHaveAttribute('data-pick', 'none');
    await user.click(screen.getByRole('button', { name: 'Skip' }));
    expect(await screen.findByText(/Welcome to NinerLog, Amelia/)).toBeInTheDocument();
    expect(PATCH).not.toHaveBeenCalled();
  });

  it('keeps the step open with a message when saving fails', async () => {
    GET.mockResolvedValue({ data: ruth(), error: undefined });
    PATCH.mockResolvedValue({ data: undefined, error: { error: 'boom' } });
    const user = userEvent.setup();
    renderTour();
    await screen.findByText('What do you fly, and what are you training for?');
    await user.click(tile('ULTRALIGHT'));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Could not save your toolkits');
    expect(screen.getByText('What do you fly, and what are you training for?')).toBeInTheDocument();
  });

  it('J1: pre-selects toolkits from logbook evidence and acknowledges them on Next', async () => {
    const jonas = profileWith({ SAILPLANE: 'training' }, { pendingAcknowledgement: ['SAILPLANE'] });
    GET.mockResolvedValue({ data: jonas, error: undefined });
    const user = userEvent.setup();
    renderTour();
    await screen.findByText('What do you fly, and what are you training for?');
    await waitFor(() => expect(tile('SAILPLANE')).toHaveAttribute('data-pick', 'goal'));
    expect(within(tile('SAILPLANE')).getByText('From your logbook')).toBeInTheDocument();
    expect(tile('AEROPLANE')).toHaveAttribute('data-pick', 'none');

    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(PATCH).toHaveBeenCalledWith('/users/me/pilot-profile', { body: { acknowledge: ['SAILPLANE'] } });
  });

  it('writes only changed tiles when evidence pre-selected others', async () => {
    GET.mockResolvedValue({ data: PERSONA_PROFILES.lena(), error: undefined });
    const user = userEvent.setup();
    renderTour();
    await screen.findByText('What do you fly, and what are you training for?');
    await waitFor(() => expect(tile('SAILPLANE')).toHaveAttribute('data-pick', 'on'));
    await user.click(tile('TMG'));
    await user.click(tile('TMG'));
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(PATCH).toHaveBeenCalledWith('/users/me/pilot-profile', { body: { intents: { TMG: 'goal' } } });
  });

  it.each([
    ['an explicit intent', profileWith({ SAILPLANE: 'training' }, {})],
    ['an acknowledgement', PERSONA_PROFILES.lena()],
  ])('is not shown when the profile holds %s', async (_label, profile) => {
    if (_label === 'an explicit intent') profile.disciplines[2] = { ...profile.disciplines[2], intent: 'goal' };
    else profile.disciplines[2] = { ...profile.disciplines[2], acknowledgedAt: '2025-04-05T18:00:00Z' };
    GET.mockResolvedValue({ data: profile, error: undefined });
    renderTour();
    expect(await screen.findByText(/Welcome to NinerLog, Amelia/)).toBeInTheDocument();
    expect(screen.queryByTestId('onboarding-disciplines')).not.toBeInTheDocument();
    expect(screen.getByText('Step 1 of ' + withoutDisciplines)).toBeInTheDocument();
  });
});
