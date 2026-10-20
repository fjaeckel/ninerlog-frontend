import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { OnboardingTour } from '../../components/onboarding/OnboardingTour';
import { tourVariant } from '../../components/onboarding/tourSteps';
import { resolveDisciplines, type PilotProfile } from '../../hooks/usePilotProfile';
import { useOnboardingStore } from '../../stores/onboardingStore';
import { useAuthStore } from '../../stores/authStore';
import { PERSONA_PROFILES, profileWith } from '../../test/pilotProfile';

const GET = vi.fn();
vi.mock('../../api/client', () => ({
  apiClient: { GET: (...args: unknown[]) => GET(...args), PATCH: vi.fn() },
}));

beforeAll(() => {
  if (typeof window.matchMedia !== 'function') {
    window.matchMedia = ((query: string) => ({
      matches: false,
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

const acknowledged = (p: PilotProfile): PilotProfile => ({
  ...p,
  disciplines: p.disciplines.map((s) => ({ ...s, acknowledgedAt: s.status === 'off' ? null : '2025-04-05T18:00:00Z' })),
});

const variantOf = (p: PilotProfile | null, loading = false) => tourVariant(resolveDisciplines(p, loading));

describe('tourVariant', () => {
  it.each([
    ['lena', 'glider'],
    ['karl', 'powered'],
    ['mehmet', 'ultralight'],
    ['sabine', 'ultralight'],
    ['mark', 'airline'],
    ['petra', 'neutral'],
  ] as const)('%s reads the %s copy', (persona, variant) => {
    expect(variantOf(PERSONA_PROFILES[persona]())).toBe(variant);
  });

  it('J1: a glider student reads the glider copy', () => {
    expect(variantOf(profileWith({ SAILPLANE: 'training' }))).toBe('glider');
  });

  it('R2: no toolkit, a loading or failed profile, or everything mode read the neutral copy', () => {
    expect(variantOf(profileWith({}))).toBe('neutral');
    expect(variantOf(null, true)).toBe('neutral');
    expect(variantOf(null)).toBe('neutral');
    expect(variantOf(PERSONA_PROFILES.lena())).toBe('glider');
    expect(variantOf({ ...PERSONA_PROFILES.lena(), mode: 'everything' })).toBe('neutral');
  });
});

describe('OnboardingTour adaptive copy', () => {
  beforeEach(() => {
    useAuthStore.setState({
      user: { id: 'u1', name: 'Lena Hoffmann', email: 'l@example.com', createdAt: '2026-01-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      isAuthenticated: true,
    });
    useOnboardingStore.setState({ completedUserIds: [], isOpen: true });
  });

  const openAt = async (profile: PilotProfile, title: string) => {
    GET.mockResolvedValue({ data: profile, error: undefined });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={qc}>
        <OnboardingTour />
      </QueryClientProvider>,
    );
    await screen.findByText(/Welcome to NinerLog, Lena/);
    const user = userEvent.setup();
    while (!screen.queryByText(title)) await user.click(screen.getByRole('button', { name: 'Next' }));
  };

  it('L3: Lena is told about take-off and landing times and launch methods, not block times', async () => {
    await openAt(acknowledged(PERSONA_PROFILES.lena()), 'Log a flight');
    expect(screen.getByText(/take-off and landing times, launch method/)).toBeInTheDocument();
    expect(screen.queryByText(/off-block/)).not.toBeInTheDocument();
  });

  it('L4: Lena is told about launches and training flights, not 3 takeoffs in 90 days', async () => {
    await openAt(acknowledged(PERSONA_PROFILES.lena()), 'Stay current');
    expect(screen.getByText(/launches, hours and training flights/)).toBeInTheDocument();
    expect(screen.queryByText(/90 days/)).not.toBeInTheDocument();
  });

  it('Mehmet is told about § 45 LuftPersV', async () => {
    await openAt(acknowledged(PERSONA_PROFILES.mehmet()), 'Stay current');
    expect(screen.getByText(/§ 45 LuftPersV/)).toBeInTheDocument();
  });

  it('A2: Mark keeps block times', async () => {
    await openAt(acknowledged(PERSONA_PROFILES.mark()), 'Log a flight');
    expect(screen.getByText(/off-block and on-block times/)).toBeInTheDocument();
  });

  it('Petra, flying gliders and aeroplanes, reads the neutral copy', async () => {
    await openAt(acknowledged(PERSONA_PROFILES.petra()), 'Log a flight');
    expect(screen.getByText(/enter your times, airports and landings/)).toBeInTheDocument();
  });
});
