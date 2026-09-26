import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WhatIFlySection } from '../../components/profile/WhatIFlySection';
import type { PilotProfile } from '../../hooks/usePilotProfile';
import type { TrainingProgramme } from '../../hooks/useTrainingProgress';
import { PERSONA_PROFILES, profileWith } from '../../test/pilotProfile';
import { annaSpl, jonasSpl } from './fixtures';

const GET = vi.fn();
vi.mock('../../api/client', () => ({ apiClient: { GET: (...args: unknown[]) => GET(...args), PATCH: vi.fn() } }));

function serve(profile: PilotProfile, programmes: TrainingProgramme[]) {
  GET.mockImplementation(async (path: string) => ({
    data: path === '/training/progress' ? { programmes } : profile,
    error: undefined,
  }));
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WhatIFlySection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const goal = (p: PilotProfile, d: string): PilotProfile => ({
  ...p,
  disciplines: p.disciplines.map((s) => (s.discipline === d ? { ...s, intent: 'goal' } : s)),
});

describe('What I fly: tracked training programme', () => {
  beforeEach(() => vi.clearAllMocks());

  it('J1: Jonas, sailplanes set to "Training toward", sees the SPL programme tracked', async () => {
    serve(goal(profileWith({ SAILPLANE: 'training' }), 'SAILPLANE'), [jonasSpl()]);
    expect(await screen.findByTestId('tracked-programme-SAILPLANE')).toHaveTextContent('Training progress tracked: SPL — SFCL.130');
  });

  it('N1: Anna in derived training sees it on sailplanes only, not on aeroplanes', async () => {
    serve(profileWith({ AEROPLANE: 'active', SAILPLANE: 'training' }), [annaSpl()]);
    expect(await screen.findByTestId('tracked-programme-SAILPLANE')).toHaveTextContent('SPL — SFCL.130');
    expect(screen.queryByTestId('tracked-programme-AEROPLANE')).not.toBeInTheDocument();
  });

  it('says so when a toolkit set to "Training toward" has no programme', async () => {
    serve(goal(profileWith({ ULTRALIGHT: 'active' }), 'ULTRALIGHT'), []);
    expect(await screen.findByTestId('tracked-programme-ULTRALIGHT')).toHaveTextContent('No training programme is tracked');
  });

  it('A1: Mark sees no tracked programme', async () => {
    serve(PERSONA_PROFILES.mark(), []);
    await screen.findByTestId('discipline-AEROPLANE');
    expect(screen.queryByText(/Training progress tracked/)).not.toBeInTheDocument();
    expect(screen.queryByTestId(/^tracked-programme-/)).not.toBeInTheDocument();
  });
});
