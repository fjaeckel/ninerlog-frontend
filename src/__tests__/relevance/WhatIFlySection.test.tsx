import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WhatIFlySection } from '../../components/profile/WhatIFlySection';
import { DISCIPLINES, type PilotProfile } from '../../hooks/usePilotProfile';
import { gliderProfile } from '../../test/pilotProfile';

const GET = vi.fn();
const PATCH = vi.fn();
vi.mock('../../api/client', () => ({
  apiClient: {
    GET: (...args: unknown[]) => GET(...args),
    PATCH: (...args: unknown[]) => PATCH(...args),
  },
}));

const renderSection = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <WhatIFlySection />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

const emptyProfile = (): PilotProfile => ({
  mode: 'adaptive',
  pendingAcknowledgement: [],
  disciplines: DISCIPLINES.map((d) => ({ discipline: d, status: 'off', intent: 'auto', evidence: [], ulKinds: [] })),
});

describe('WhatIFlySection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    PATCH.mockImplementation(async (_path: string, { body }: { body: Partial<PilotProfile> }) => ({
      data: { ...gliderProfile(), ...(body.mode ? { mode: body.mode } : {}) },
      error: undefined,
    }));
  });

  it('lists the active toolkit with status and evidence, others folded', async () => {
    GET.mockResolvedValue({ data: gliderProfile(), error: undefined });
    renderSection();

    const row = await screen.findByTestId('discipline-SAILPLANE');
    expect(within(row).getByText('Glider')).toBeInTheDocument();
    expect(within(row).getByText('Active')).toBeInTheDocument();
    expect(screen.queryByTestId('discipline-IFR')).not.toBeInTheDocument();

    await userEvent.click(within(row).getByRole('button', { name: 'Why? (1)' }));
    expect(within(row).getByText('SPL 12345')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Other toolkits (9)' }));
    expect(screen.getByTestId('discipline-IFR')).toBeInTheDocument();
  });

  it('PATCHes the chosen intent', async () => {
    GET.mockResolvedValue({ data: gliderProfile(), error: undefined });
    renderSection();

    await userEvent.selectOptions(await screen.findByLabelText('Setting for the Glider toolkit'), 'Off');
    expect(PATCH).toHaveBeenCalledWith('/users/me/pilot-profile', { body: { intents: { SAILPLANE: 'off' } } });

    await userEvent.click(screen.getByRole('button', { name: 'Other toolkits (9)' }));
    await userEvent.selectOptions(screen.getByLabelText('Setting for the IFR toolkit'), 'Training toward');
    expect(PATCH).toHaveBeenCalledWith('/users/me/pilot-profile', { body: { intents: { IFR: 'goal' } } });
  });

  it('switches between adaptive and everything mode', async () => {
    GET.mockResolvedValue({ data: gliderProfile(), error: undefined });
    renderSection();

    const toggle = await screen.findByRole('switch', { name: /Show everything/ });
    expect(toggle).not.toBeChecked();
    await userEvent.click(toggle);
    expect(PATCH).toHaveBeenCalledWith('/users/me/pilot-profile', { body: { mode: 'everything' } });
    expect(await screen.findByRole('switch', { name: /Show everything/ })).toBeChecked();
    expect(screen.getByText(/Nothing is ever deleted or hidden for good/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('switch', { name: /Show everything/ }));
    expect(PATCH).toHaveBeenLastCalledWith('/users/me/pilot-profile', { body: { mode: 'adaptive' } });
  });

  it('R2: an empty account is told everything is shown', async () => {
    GET.mockResolvedValue({ data: emptyProfile(), error: undefined });
    renderSection();
    expect(await screen.findByText(/No toolkit is on yet, so NinerLog shows everything/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Other toolkits (10)' })).toBeInTheDocument();
  });

  it('keeps an explicitly switched-off toolkit in view', async () => {
    const p = gliderProfile();
    p.disciplines[6] = { ...p.disciplines[6], intent: 'off' };
    GET.mockResolvedValue({ data: p, error: undefined });
    renderSection();
    const row = await screen.findByTestId('discipline-IFR');
    expect(within(row).getByText('Off', { selector: 'span' })).toBeInTheDocument();
  });

  it('says so when the profile cannot load', async () => {
    GET.mockResolvedValue({ data: undefined, error: { error: 'boom' } });
    renderSection();
    expect(await screen.findByText(/could not be loaded, so NinerLog shows everything/)).toBeInTheDocument();
  });
});
